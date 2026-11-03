import type { Channel } from "./otp.js";
import { sendEmail } from "./mailer.js";
import { sendSms } from "./sms.js";

const OTP_EXPIRES_MINUTES = Number(process.env.OTP_EXPIRES_MINUTES) || 5;

const otpEmailHtml = (code: string) => `
  <div style="font-family:Arial,sans-serif;max-width:420px;margin:auto;padding:24px;border:1px solid #eee;border-radius:12px">
    <h2 style="color:#ea580c;margin:0 0 12px">Your verification code</h2>
    <p style="color:#333">Use this code to sign in to Food App:</p>
    <p style="font-size:32px;font-weight:bold;letter-spacing:8px;color:#111;margin:16px 0">${code}</p>
    <p style="color:#666;font-size:13px">This code expires in ${OTP_EXPIRES_MINUTES} minutes. If you didn't request it, ignore this email.</p>
  </div>
`;

export const sendOtp = async (identifier: string, channel: Channel, code: string) => {
  if (channel === "email") {
    await sendEmail(
      identifier,
      `${code} is your Food App code`,
      otpEmailHtml(code),
      `Your Food App code is ${code}. It expires in ${OTP_EXPIRES_MINUTES} minutes.`
    );
    return;
  }

  // Phone → Twilio SMS (identifier is already 03XXXXXXXXX)
  await sendSms(
    identifier,
    `Your Food App code is ${code}. It expires in ${OTP_EXPIRES_MINUTES} minutes. Don't share it with anyone.`
  );
};