import type { Request, Response } from "express";
import type { Types } from "mongoose";
import { z } from "zod";
import { Notification } from "../models/Notification.js";
import { ACTIVE_STATUSES, Order } from "../models/Order.js";
import { Otp } from "../models/Otp.js";
import { OtpRequest } from "../models/OtpRequest.js";
import { Review } from "../models/Review.js";
import { User } from "../models/User.js";
import { deleteAvatarImage } from "../utils/cloudinary.js";
import { generateOtp, hashOtp, otpMatches } from "../utils/otp.js";
import { checkOtpLimits, clientIp, recordOtpRequest } from "../utils/otpLimits.js";
import { sendOtp } from "../utils/sendOtp.js";

const OTP_EXPIRES_MINUTES = Number(process.env.OTP_EXPIRES_MINUTES) || 5;
const OTP_RESEND_SECONDS = Number(process.env.OTP_RESEND_SECONDS) || 60;
const OTP_MAX_ATTEMPTS = Number(process.env.OTP_MAX_ATTEMPTS) || 5;
const isDev = process.env.NODE_ENV !== "production";

const confirmSchema = z.object({
  code: z.string({ error: "Enter the code" }).regex(/^\d{6}$/, "The code has 6 digits"),
});


const mask = (v: string) =>
  v.includes("@")
    ? v.replace(/^(.{2}).*(@.*)$/, "$1•••$2")
    : `${v.slice(0, 4)}•••${v.slice(-4)}`;

const hasActiveOrder = (customerId: Types.ObjectId) =>
  Order.exists({ customerId, status: { $in: ACTIVE_STATUSES } });

/** POST /api/auth/delete-account/request — sends a code to the customer's phone (or email) */
export const requestAccountDeletion = async (req: Request, res: Response) => {
  const user = req.user!;
  
  const targets = [
    ...(user.phone ? [{ identifier: user.phone, channel: "phone" as const }] : []),
    ...(user.email ? [{ identifier: user.email, channel: "email" as const }] : []),
  ];
  const { identifier, channel } = targets[0]!;

  if (await hasActiveOrder(user._id)) {
    return res.status(409).json({
      message: "You have an order in progress. You can delete your account once it's finished.",
    });
  }

  // Resend cooldown
  const last = await Otp.findOne({ purpose: "delete", userId: user._id }).sort({ createdAt: -1 });
  if (last) {
    const secondsSince = (Date.now() - last.createdAt.getTime()) / 1000;
    if (secondsSince < OTP_RESEND_SECONDS) {
      const wait = Math.ceil(OTP_RESEND_SECONDS - secondsSince);
      return res.status(429).json({ message: `Please wait ${wait}s before requesting a new code` });
    }
  }


  const ip = clientIp(req);
  const limit = await checkOtpLimits(identifier, ip);
  if (!limit.ok) return res.status(429).json({ message: limit.message });
  await recordOtpRequest(identifier, ip, "delete");

  const code = generateOtp();
  await Otp.deleteMany({ purpose: "delete", userId: user._id });
  await Otp.create({
    identifier,
    channel,
    purpose: "delete",
    userId: user._id,
    codeHash: hashOtp(code),
    expiresAt: new Date(Date.now() + OTP_EXPIRES_MINUTES * 60 * 1000),
  });

    // Send to all of them; it's enough if at least one arrives
  const results = await Promise.allSettled(targets.map((t) => sendOtp(t.identifier, t.channel, code)));
  const sent = targets.filter((_, i) => results[i]!.status === "fulfilled");
  results.forEach((r, i) => {
    if (r.status === "rejected") {
      console.error(`❌ Delete-account OTP to ${targets[i]!.channel} failed:`, (r.reason as Error).message);
    }
  });

  if (sent.length === 0) {
    await Otp.deleteMany({ purpose: "delete", userId: user._id });
    return res.status(502).json({ message: "Couldn't send the code. Please try again." });
  }

  const sentTo = sent.map((t) => mask(t.identifier)).join(" and ");
  res.json({
    message: `Code sent to ${sentTo}`,
    channels: sent.map((t) => t.channel),
    sentTo,
    expiresInMinutes: OTP_EXPIRES_MINUTES,
    ...(isDev && { devOtp: code }),
  });
};

/**
 * POST /api/auth/delete-account/confirm { code }
 */
export const confirmAccountDeletion = async (req: Request, res: Response) => {
  const parsed = confirmSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: parsed.error.issues[0]?.message });
  const user = req.user!;

  const otp = await Otp.findOne({ purpose: "delete", userId: user._id });
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

  
  if (await hasActiveOrder(user._id)) {
    return res.status(409).json({
      message: "You have an order in progress. You can delete your account once it's finished.",
    });
  }

  const identifiers = [user.phone, user.email].filter((v): v is string => !!v);

  
  await Order.updateMany(
    { customerId: user._id },
    { $set: { customerName: "Deleted customer" }, $unset: { customerPhone: 1, note: 1 } },
  );
  await Order.updateMany(
    { customerId: user._id, delivery: { $exists: true } },
    {
      $set: { "delivery.street": "Removed", "delivery.phone": "Removed" },
      $unset: { "delivery.area": 1, "delivery.instructions": 1, "delivery.location": 1 },
    },
  );

  
  await Review.updateMany({ customerId: user._id }, { $set: { customerName: "Customer" } });

  
  await Promise.all([
    Notification.deleteMany({ userId: user._id }),
    Otp.deleteMany({ $or: [{ userId: user._id }, { identifier: { $in: identifiers } }] }),
    OtpRequest.deleteMany({ identifier: { $in: identifiers } }),
    deleteAvatarImage(String(user._id)).catch(() => {}), // no photo is fine
  ]);
  await User.deleteOne({ _id: user._id }); // also removes addresses, favourites, push tokens

  res.json({ message: "Your account has been deleted" });
};