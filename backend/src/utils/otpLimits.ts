import type { Request } from "express";
import { OtpRequest } from "../models/OtpRequest.js";

// Limits (override in .env)
const PER_HOUR = Number(process.env.OTP_MAX_PER_HOUR) || 5; // codes per email/phone per hour
const PER_DAY = Number(process.env.OTP_MAX_PER_DAY) || 10; // codes per email/phone per 24 h
const PER_IP_HOUR = Number(process.env.OTP_MAX_PER_IP_HOUR) || 20; // codes per device/network per hour

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

/** Client IP (set app "trust proxy" when running behind a proxy/load balancer) */
export const clientIp = (req: Request) =>
  req.ip ?? req.socket.remoteAddress ?? "unknown";

/** "in 45 min" / "in 3 h" */
const waitText = (ms: number) => {
  const min = Math.max(1, Math.ceil(ms / 60000));
  return min < 60 ? `${min} min` : `${Math.ceil(min / 60)} h`;
};

type LimitResult =
  | { ok: true }
  | { ok: false; message: string; retryAfterSeconds: number };

/**
 * Checks the hourly / daily limits for this email-phone and this IP.
 * The 60-second resend cooldown is checked separately in the controllers.
 */
export const checkOtpLimits = async (
  identifier: string,
  ip: string,
): Promise<LimitResult> => {
  const now = Date.now();

  const rules = [
    {
      filter: { identifier },
      window: HOUR,
      max: PER_HOUR,
      who: "this number/email",
    },
    {
      filter: { identifier },
      window: DAY,
      max: PER_DAY,
      who: "this number/email",
    },
    { filter: { ip }, window: HOUR, max: PER_IP_HOUR, who: "this device" },
  ];

  for (const rule of rules) {
    const since = new Date(now - rule.window);
    const count = await OtpRequest.countDocuments({
      ...rule.filter,
      createdAt: { $gte: since },
    });
    if (count < rule.max) continue;

    // The window frees up when the oldest request inside it gets old enough
    const oldest = await OtpRequest.findOne({
      ...rule.filter,
      createdAt: { $gte: since },
    })
      .sort({ createdAt: 1 })
      .select("createdAt")
      .lean();
    const waitMs = oldest
      ? oldest.createdAt.getTime() + rule.window - now
      : rule.window;

    return {
      ok: false,
      message: `Too many codes requested for ${rule.who}. Try again in ${waitText(waitMs)}.`,
      retryAfterSeconds: Math.ceil(waitMs / 1000),
    };
  }
  return { ok: true };
};

/** Count this request (call right before sending the code) */
export const recordOtpRequest = (
  identifier: string,
  ip: string,
  purpose: "login" | "contact" | "delete",
) => OtpRequest.create({ identifier, ip, purpose });
