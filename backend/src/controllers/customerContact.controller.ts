import type { Request, Response } from "express";
import { z } from "zod";
import { Otp } from "../models/Otp.js";
import { User } from "../models/User.js";
import { generateOtp, hashOtp, otpMatches, parseIdentifier } from "../utils/otp.js";
import { sendOtp } from "../utils/sendOtp.js";

const OTP_EXPIRES_MINUTES = Number(process.env.OTP_EXPIRES_MINUTES) || 5;
const OTP_RESEND_SECONDS = Number(process.env.OTP_RESEND_SECONDS) || 60;
const OTP_MAX_ATTEMPTS = Number(process.env.OTP_MAX_ATTEMPTS) || 5;
const isDev = process.env.NODE_ENV !== "production";

const LABEL = { phone: "phone number", email: "email" } as const;

const requestSchema = z.object({
  identifier: z.string({ error: "Enter a phone number or email" }).trim().min(1, "Enter a phone number or email"),
});
const verifySchema = requestSchema.extend({
  code: z.string({ error: "Enter the code" }).regex(/^\d{6}$/, "The code must be 6 digits"),
});

/**
 * POST /api/auth/contact/request   { identifier }
 * Customer wants to add or change their phone/email → send a code to the NEW one.
 */
export const requestContactChange = async (req: Request, res: Response) => {
  const parsed = requestSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: parsed.error.issues[0]?.message });

  const result = parseIdentifier(parsed.data.identifier);
  if (!result) return res.status(400).json({ message: "Enter a valid email or phone (03XXXXXXXXX)" });
  const { identifier, channel } = result;
  const user = req.user!;

  if (user[channel] === identifier) {
    return res.status(400).json({ message: `This is already your ${LABEL[channel]}` });
  }
  if (await User.exists({ [channel]: identifier, _id: { $ne: user._id } })) {
    return res.status(409).json({ message: `This ${LABEL[channel]} is already used by another account` });
  }

  // Resend cooldown
  const last = await Otp.findOne({ identifier, purpose: "contact", userId: user._id }).sort({ createdAt: -1 });
  if (last) {
    const secondsSince = (Date.now() - last.createdAt.getTime()) / 1000;
    if (secondsSince < OTP_RESEND_SECONDS) {
      const wait = Math.ceil(OTP_RESEND_SECONDS - secondsSince);
      return res.status(429).json({ message: `Please wait ${wait}s before requesting a new code` });
    }
  }

  const code = generateOtp();
  await Otp.deleteMany({ purpose: "contact", userId: user._id }); // one change at a time
  await Otp.create({
    identifier,
    channel,
    purpose: "contact",
    userId: user._id,
    codeHash: hashOtp(code),
    expiresAt: new Date(Date.now() + OTP_EXPIRES_MINUTES * 60 * 1000),
  });

  try {
    await sendOtp(identifier, channel, code);
  } catch (error) {
    await Otp.deleteMany({ purpose: "contact", userId: user._id });
    console.error("❌ Contact OTP send failed:", (error as Error).message);
    return res.status(502).json({ message: `Couldn't send the code to that ${LABEL[channel]}. Please try again.` });
  }

  res.json({
    message: `Code sent to ${identifier}`,
    channel,
    identifier,
    expiresInMinutes: OTP_EXPIRES_MINUTES,
    ...(isDev && { devOtp: code }), // only in development
  });
};

/**
 * POST /api/auth/contact/verify   { identifier, code }
 * Right code → the new phone/email is saved on the account.
 */
export const verifyContactChange = async (req: Request, res: Response) => {
  const parsed = verifySchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: parsed.error.issues[0]?.message });

  const result = parseIdentifier(parsed.data.identifier);
  if (!result) return res.status(400).json({ message: "Enter a valid email or phone (03XXXXXXXXX)" });
  const { identifier, channel } = result;
  const user = req.user!;

  const otp = await Otp.findOne({ identifier, purpose: "contact", userId: user._id });
  if (!otp || otp.expiresAt < new Date()) {
    return res.status(400).json({ message: "Code expired, please request a new one" });
  }
  if (otp.attempts >= OTP_MAX_ATTEMPTS) {
    await otp.deleteOne();
    return res.status(429).json({ message: "Too many wrong attempts, request a new code" });
  }
  if (!otpMatches(parsed.data.code, otp.codeHash)) {
    otp.attempts += 1;
    await otp.save();
    return res.status(400).json({ message: `Incorrect code. ${OTP_MAX_ATTEMPTS - otp.attempts} attempt(s) left` });
  }

  // Someone may have taken it in the meantime
  if (await User.exists({ [channel]: identifier, _id: { $ne: user._id } })) {
    await otp.deleteOne();
    return res.status(409).json({ message: `This ${LABEL[channel]} is already used by another account` });
  }

  user.set(channel, identifier);
  try {
    await user.save();
  } catch (error) {
    if ((error as { code?: number }).code === 11000) {
      return res.status(409).json({ message: `This ${LABEL[channel]} is already used by another account` });
    }
    throw error;
  }
  await otp.deleteOne(); // one-time use

  res.json({ message: `Your ${LABEL[channel]} was updated`, user });
};