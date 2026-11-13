import { Schema, model, type Types } from "mongoose";
export interface IOtp {
  identifier: string;            // normalized email or phone
  channel: "email" | "phone";
  purpose: "login" | "contact";
  userId?: Types.ObjectId; 
  codeHash: string;              // we never store the real code
  attempts: number;
  expiresAt: Date;
  createdAt: Date;
}

const otpSchema = new Schema<IOtp>(
  {
    identifier: { type: String, required: true, index: true },
    channel: { type: String, enum: ["email", "phone"], required: true },
        purpose: { type: String, enum: ["login", "contact"], default: "login" },
    userId: { type: Schema.Types.ObjectId, ref: "User" },
    codeHash: { type: String, required: true },
    attempts: { type: Number, default: 0 },
    // TTL index: MongoDB auto-deletes the document when expiresAt passes
    expiresAt: { type: Date, required: true, index: { expires: 0 } },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const Otp = model<IOtp>("Otp", otpSchema);