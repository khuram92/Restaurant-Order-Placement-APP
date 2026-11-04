import type { Request, Response } from "express";
import { z } from "zod";
import { Otp } from "../models/Otp.js";
import { User } from "../models/User.js";
import { signToken } from "../utils/jwt.js";
import {
    generateOtp,
    hashOtp,
    otpMatches,
    parseIdentifier,
} from "../utils/otp.js";
import { sendOtp } from "../utils/sendOtp.js";

const OTP_EXPIRES_MINUTES = Number(process.env.OTP_EXPIRES_MINUTES) || 5;
const OTP_RESEND_SECONDS = Number(process.env.OTP_RESEND_SECONDS) || 60;
const OTP_MAX_ATTEMPTS = Number(process.env.OTP_MAX_ATTEMPTS) || 5;
const isDev = process.env.NODE_ENV !== "production";

// ---------- Schemas ----------
const loginSchema = z.object({
  email: z.email({ error: "Enter a valid email" }).trim().toLowerCase(),
  password: z
    .string({ error: "Password is required" })
    .min(1, "Password is required"),
});

const requestOtpSchema = z.object({
  identifier: z
    .string({ error: "Email or phone is required" })
    .trim()
    .min(1, "Email or phone is required"),
});

const verifyOtpSchema = z.object({
  identifier: z
    .string({ error: "Email or phone is required" })
    .trim()
    .min(1, "Email or phone is required"),
  code: z
    .string({ error: "OTP is required" })
    .regex(/^\d{6}$/, "OTP must be 6 digits"),
});

// ---------- Staff ----------

/** POST /api/auth/login: Super Admin & Managers */
export const staffLogin = async (req: Request, res: Response) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: parsed.error.issues[0]?.message });
  }

  const { email, password } = parsed.data;
  const user = await User.findOne({ email }).select("+password");

  if (
    !user ||
    user.role === "customer" ||
    !(await user.comparePassword(password))
  ) {
    return res.status(401).json({ message: "Invalid email or password" });
  }
  if (!user.isActive) {
    return res.status(403).json({ message: "Account is deactivated" });
  }

  const token = signToken({ id: user.id, role: user.role });
  res.json({ token, user });
};

// ---------- Customers (OTP) ----------

/** POST /api/auth/otp/request   { identifier } */
export const requestOtp = async (req: Request, res: Response) => {
  const parsed = requestOtpSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: parsed.error.issues[0]?.message });
  }

  const result = parseIdentifier(parsed.data.identifier);
  if (!result) {
    return res
      .status(400)
      .json({ message: "Enter a valid email or phone (03XXXXXXXXX)" });
  }
  const { identifier, channel } = result;

  const existing = await User.findOne({ [channel]: identifier });
  if (existing && existing.role !== "customer") {
    return res
      .status(403)
      .json({ message: "Staff must log in with email and password" });
  }
  if (existing && !existing.isActive) {
    return res.status(403).json({ message: "Account is deactivated" });
  }

  // Resend cooldown
  const last = await Otp.findOne({ identifier }).sort({ createdAt: -1 });
  if (last) {
    const secondsSince = (Date.now() - last.createdAt.getTime()) / 1000;
    if (secondsSince < OTP_RESEND_SECONDS) {
      const wait = Math.ceil(OTP_RESEND_SECONDS - secondsSince);
      return res
        .status(429)
        .json({ message: `Please wait ${wait}s before requesting a new code` });
    }
  }

  const code = generateOtp();
  await Otp.deleteMany({ identifier }); // only one active code at a time
  await Otp.create({
    identifier,
    channel,
    codeHash: hashOtp(code),
    expiresAt: new Date(Date.now() + OTP_EXPIRES_MINUTES * 60 * 1000),
  });
  try {
    await sendOtp(identifier, channel, code);
  } catch (error) {
    await Otp.deleteMany({ identifier }); // so the user can retry right away
    console.error("❌ OTP send failed:", (error as Error).message);
    return res
      .status(502)
      .json({
        message: `Couldn't send the code to your ${channel}. Please try again.`,
      });
  }

  res.json({
    message: `OTP sent to your ${channel}`,
    channel,
    isNewUser: !existing, // app shows the "Name" field if true
    expiresInMinutes: OTP_EXPIRES_MINUTES,
    ...(isDev && { devOtp: code }), // only in development
  });
};

/** POST /api/auth/otp/verify   { identifier, code } */
export const verifyOtp = async (req: Request, res: Response) => {
  const parsed = verifyOtpSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: parsed.error.issues[0]?.message });
  }

  const result = parseIdentifier(parsed.data.identifier);
  if (!result) {
    return res.status(400).json({ message: "Enter a valid email or phone (03XXXXXXXXX)" });
  }
  const { identifier, channel } = result;
  const { code } = parsed.data;

  const otp = await Otp.findOne({ identifier });
  if (!otp || otp.expiresAt < new Date()) {
    return res.status(400).json({ message: "Code expired, please request a new one" });
  }
  if (otp.attempts >= OTP_MAX_ATTEMPTS) {
    await otp.deleteOne();
    return res.status(429).json({ message: "Too many wrong attempts, request a new code" });
  }
  if (!otpMatches(code, otp.codeHash)) {
    otp.attempts += 1;
    await otp.save();
    const left = OTP_MAX_ATTEMPTS - otp.attempts;
    return res.status(400).json({ message: `Incorrect code. ${left} attempt(s) left` });
  }

  let user = await User.findOne({ [channel]: identifier });
  let isNewUser = false;

  if (!user) {
    // New customer: create with only the verified email/phone.
    // Name, DOB etc. are filled on the "Complete profile" screen.
    user = await User.create({ [channel]: identifier, role: "customer", profileCompleted: false });
    isNewUser = true;
  } else if (user.role !== "customer") {
    return res.status(403).json({ message: "Staff must log in with email and password" });
  } else if (!user.isActive) {
    return res.status(403).json({ message: "Account is deactivated" });
  }

  await otp.deleteOne(); // one-time use

  const token = signToken({ id: user.id, role: user.role });
  res.status(isNewUser ? 201 : 200).json({ token, user, isNewUser });
};

// ---------- Everyone ----------

/** GET /api/auth/me */
export const getMe = async (req: Request, res: Response) => {
  res.json({ user: req.user });
};
