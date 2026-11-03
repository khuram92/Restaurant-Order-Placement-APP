import crypto from "node:crypto";

export type Channel = "email" | "phone";


export const parseIdentifier = (raw: string): { identifier: string; channel: Channel } | null => {
  const value = raw.trim();

  if (value.includes("@")) {
    const email = value.toLowerCase();
    return /^\S+@\S+\.\S+$/.test(email) ? { identifier: email, channel: "email" } : null;
  }

  let phone = value.replace(/[\s-]/g, "");
  if (phone.startsWith("+92")) phone = "0" + phone.slice(3);
  else if (phone.startsWith("92")) phone = "0" + phone.slice(2);

  return /^03\d{9}$/.test(phone) ? { identifier: phone, channel: "phone" } : null;
};

export const generateOtp = (): string => crypto.randomInt(100000, 1000000).toString();

export const hashOtp = (code: string): string =>
  crypto.createHash("sha256").update(code).digest("hex");

export const otpMatches = (code: string, hash: string): boolean => {
  const a = Buffer.from(hashOtp(code));
  const b = Buffer.from(hash);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
};