import { Schema, model } from "mongoose";

export interface IOtpRequest {
  identifier: string;
  ip: string;
  purpose: "login" | "contact" | "delete";
  createdAt: Date;
}

const otpRequestSchema = new Schema<IOtpRequest>(
  {
    identifier: { type: String, required: true },
    ip: { type: String, required: true },
    purpose: {
      type: String,
      enum: ["login", "contact", "delete"],
      required: true,
    },
    createdAt: { type: Date, default: Date.now, expires: 60 * 60 * 24 },
  },
  { versionKey: false },
);

otpRequestSchema.index({ identifier: 1, createdAt: -1 });
otpRequestSchema.index({ ip: 1, createdAt: -1 });

export const OtpRequest = model<IOtpRequest>("OtpRequest", otpRequestSchema);
