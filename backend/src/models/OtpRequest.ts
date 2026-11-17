import { Schema, model } from "mongoose";

/**
 * One row per "send me a code" request (login or contact change).
 * Only used to count requests for rate limits — removed automatically after 24 h.
 */
export interface IOtpRequest {
  identifier: string; // normalized email or phone
  ip: string;
  purpose: "login" | "contact";
  createdAt: Date;
}

const otpRequestSchema = new Schema<IOtpRequest>(
  {
    identifier: { type: String, required: true },
    ip: { type: String, required: true },
    purpose: { type: String, enum: ["login", "contact"], required: true },
    // TTL: MongoDB deletes the row 24 h after it was created
    createdAt: { type: Date, default: Date.now, expires: 60 * 60 * 24 },
  },
  { versionKey: false },
);

otpRequestSchema.index({ identifier: 1, createdAt: -1 });
otpRequestSchema.index({ ip: 1, createdAt: -1 });

export const OtpRequest = model<IOtpRequest>("OtpRequest", otpRequestSchema);