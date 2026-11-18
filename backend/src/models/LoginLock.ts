import { Schema, model } from "mongoose";


export interface ILoginLock {
  key: string;
  fails: number; // wrong passwords in the current window
  lastFailAt: Date;
  lockedUntil?: Date;
  expiresAt: Date;
}

const loginLockSchema = new Schema<ILoginLock>(
  {
    key: { type: String, required: true, unique: true },
    fails: { type: Number, default: 0 },
    lastFailAt: { type: Date, default: Date.now },
    lockedUntil: { type: Date },
    expiresAt: { type: Date, required: true, index: { expires: 0 } },
  },
  { versionKey: false },
);

export const LoginLock = model<ILoginLock>("LoginLock", loginLockSchema);