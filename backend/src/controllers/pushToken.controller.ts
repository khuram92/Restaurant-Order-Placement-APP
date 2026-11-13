import type { Request, Response } from "express";
import { z } from "zod";
import { User } from "../models/User.js";
import { isExpoPushToken } from "../utils/push.js";

const MAX_TOKENS_PER_USER = 10; // phones/reinstalls per account

const tokenSchema = z.object({
  token: z.string({ error: "Push token is required" }).trim().refine(isExpoPushToken, "Invalid push token"),
});

/** POST /api/auth/push-token   { token } — after login / app start */
export const savePushToken = async (req: Request, res: Response) => {
  const parsed = tokenSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: parsed.error.issues[0]?.message });
  const { token } = parsed.data;
  const userId = req.user!._id;

  // A phone belongs to whoever logged in last on it (e.g. manager signs out, customer signs in)
  await User.updateMany({ _id: { $ne: userId }, pushTokens: token }, { $pull: { pushTokens: token } });

  // Add to this user (newest last, keep the last 10)
  await User.updateOne({ _id: userId }, { $pull: { pushTokens: token } });
  await User.updateOne({ _id: userId }, { $push: { pushTokens: { $each: [token], $slice: -MAX_TOKENS_PER_USER } } });

  res.json({ message: "Notifications on" });
};

/** POST /api/auth/push-token/remove   { token } — on sign out */
export const removePushToken = async (req: Request, res: Response) => {
  const parsed = tokenSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: parsed.error.issues[0]?.message });

  await User.updateOne({ _id: req.user!._id }, { $pull: { pushTokens: parsed.data.token } });
  res.json({ message: "Notifications off" });
};