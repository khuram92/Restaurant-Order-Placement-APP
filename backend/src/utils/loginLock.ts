import { LoginLock } from "../models/LoginLock.js";

const MAX_FAILS = Number(process.env.LOGIN_MAX_FAILS) || 5; // wrong passwords before locking
const LOCK_MINUTES = Number(process.env.LOGIN_LOCK_MINUTES) || 15; // how long the lock lasts
const WINDOW_MINUTES = LOCK_MINUTES; // wrong passwords older than this are forgotten

const MIN = 60 * 1000;

const minutesLeft = (until: Date) =>
  Math.max(1, Math.ceil((until.getTime() - Date.now()) / MIN));

/** null = may try; otherwise the message to show (423 Locked) */
export const lockMessage = async (key: string) => {
  const lock = await LoginLock.findOne({ key }).lean();
  if (lock?.lockedUntil && lock.lockedUntil > new Date()) {
    const m = minutesLeft(lock.lockedUntil);
    return {
      message: `Too many wrong passwords. Try again in ${m} min.`,
      retryAfterSeconds: Math.ceil(
        (lock.lockedUntil.getTime() - Date.now()) / 1000,
      ),
    };
  }
  return null;
};

export const recordFailure = async (key: string) => {
  const now = new Date();
  const windowStart = new Date(now.getTime() - WINDOW_MINUTES * MIN);

  const doc = await LoginLock.findOneAndUpdate(
    { key },
    [
      {
        $set: {
          key,

          fails: {
            $cond: [
              { $lt: [{ $ifNull: ["$lastFailAt", windowStart] }, windowStart] },
              1,
              { $add: [{ $ifNull: ["$fails", 0] }, 1] },
            ],
          },

          lockedUntil: {
            $cond: [{ $gt: ["$lockedUntil", now] }, "$lockedUntil", "$$REMOVE"],
          },
          lastFailAt: now,
          expiresAt: new Date(now.getTime() + WINDOW_MINUTES * MIN),
        },
      },
    ],
    { upsert: true, new: true, updatePipeline: true },
  );

  if (doc.fails >= MAX_FAILS) {
    const lockedUntil = new Date(now.getTime() + LOCK_MINUTES * MIN);
    await LoginLock.updateOne(
      { key },
      { $set: { lockedUntil, fails: 0, expiresAt: lockedUntil } },
    );
    return 0;
  }
  return MAX_FAILS - doc.fails;
};

/** Correct password → forget the wrong ones */
export const clearFailures = (key: string) => LoginLock.deleteOne({ key });
