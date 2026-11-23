import { Schema, model, type Types } from "mongoose";

export interface IAssistantUsage {
  userId: Types.ObjectId;
  day: string; // "2026-11-23"
  count: number;
  createdAt: Date;
}

const assistantUsageSchema = new Schema<IAssistantUsage>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    day: { type: String, required: true },
    count: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now, expires: 60 * 60 * 48 }, // auto-delete after 2 days
  },
  { versionKey: false },
);

assistantUsageSchema.index({ userId: 1, day: 1 }, { unique: true });

export const AssistantUsage = model<IAssistantUsage>("AssistantUsage", assistantUsageSchema);