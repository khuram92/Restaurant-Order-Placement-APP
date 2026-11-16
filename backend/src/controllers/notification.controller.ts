import type { Request, Response } from "express";
import mongoose from "mongoose";
import { z } from "zod";
import { Notification } from "../models/Notification.js";

const listSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

/** GET /api/notifications?page= — newest first, + unread count */
export const listMyNotifications = async (req: Request, res: Response) => {
  const parsed = listSchema.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ message: parsed.error.issues[0]?.message });
  const { page, limit } = parsed.data;
  const userId = req.user!._id;

  const [notifications, total, unread] = await Promise.all([
    Notification.find({ userId })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Notification.countDocuments({ userId }),
    Notification.countDocuments({ userId, readAt: { $exists: false } }),
  ]);

  res.json({ notifications, total, page, pages: Math.max(1, Math.ceil(total / limit)), unread });
};

/** GET /api/notifications/unread-count — for the bell badge */
export const unreadCount = async (req: Request, res: Response) => {
  const unread = await Notification.countDocuments({ userId: req.user!._id, readAt: { $exists: false } });
  res.json({ unread });
};

/** PATCH /api/notifications/:id/read */
export const markRead = async (req: Request, res: Response) => {
  const id = String(req.params.id);
  if (!mongoose.isValidObjectId(id)) return res.status(400).json({ message: "Invalid notification id" });

  const notification = await Notification.findOneAndUpdate(
    { _id: id, userId: req.user!._id },
    { $set: { readAt: new Date() } },
    { new: true },
  );
  if (!notification) return res.status(404).json({ message: "Notification not found" });
  res.json({ notification });
};

/** PATCH /api/notifications/read-all */
export const markAllRead = async (req: Request, res: Response) => {
  const result = await Notification.updateMany(
    { userId: req.user!._id, readAt: { $exists: false } },
    { $set: { readAt: new Date() } },
  );
  res.json({ message: "All caught up", updated: result.modifiedCount });
};

/** DELETE /api/notifications — clear all mine */
export const clearMyNotifications = async (req: Request, res: Response) => {
  const result = await Notification.deleteMany({ userId: req.user!._id });
  res.json({ message: "Notifications cleared", deleted: result.deletedCount });
};