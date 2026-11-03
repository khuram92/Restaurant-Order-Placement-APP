import type { Channel } from "./otp.js";

/**
 * TEMPORARY: prints the OTP in the server console.
 * Later: replace with Nodemailer (email) and an SMS gateway (phone).
 */
export const sendOtp = async (identifier: string, channel: Channel, code: string) => {
  const icon = channel === "email" ? "📧" : "📱";
  console.log(`${icon} [OTP] to ${identifier}: ${code}`);
};