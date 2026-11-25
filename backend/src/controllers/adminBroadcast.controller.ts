import * as Sentry from "@sentry/node";
import type { Request, Response } from "express";
import type { Types } from "mongoose";
import { Broadcast } from "../models/Broadcast.js";
import { Notification } from "../models/Notification.js";
import { Restaurant } from "../models/Restaurant.js";
import { resolveRecipients } from "../utils/broadcastAudience.js";
import { sendPushToUsers } from "../utils/push.js";
import { broadcastAudienceSchema, sendBroadcastSchema } from "../validators/broadcast.validators.js";

const DAILY_LIMIT = Number(process.env.BROADCAST_DAILY_LIMIT) || 3;
const firstIssue = (error: { issues: { message: string }[] }) => error.issues[0]?.message ?? "Invalid input";


const startOfTodayPk = () => {
  const day = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Karachi" }); // "2026-11-25"
  return new Date(`${day}T00:00:00+05:00`);
};

const sentToday = () => Broadcast.countDocuments({ createdAt: { $gte: startOfTodayPk() } });


export const previewBroadcast = async (req: Request, res: Response) => {
  const parsed = broadcastAudienceSchema.safeParse(req.body ?? {});
  if (!parsed.success) return res.status(400).json({ message: firstIssue(parsed.error) });

  const { customerIds, managerIds, optedOut } = await resolveRecipients(parsed.data);
  const used = await sentToday();
  res.json({
    customers: customerIds.length,
    managers: managerIds.length,
    total: customerIds.length + managerIds.length,
    optedOut,
    remainingToday: Math.max(0, DAILY_LIMIT - used),
  });
};


export const sendBroadcast = async (req: Request, res: Response) => {
  const parsed = sendBroadcastSchema.safeParse(req.body ?? {});
  if (!parsed.success) return res.status(400).json({ message: firstIssue(parsed.error) });
  const input = parsed.data;

  if ((await sentToday()) >= DAILY_LIMIT) {
    return res.status(429).json({
      message: `You've sent today's ${DAILY_LIMIT} broadcasts. You can send more tomorrow.`,
    });
  }

  const linked = input.linkRestaurantId
    ? await Restaurant.findOne({ _id: input.linkRestaurantId, isActive: true }).select("name logo")
    : null;
  if (input.linkRestaurantId && !linked) {
    return res.status(400).json({ message: "The linked restaurant wasn't found or is inactive" });
  }

  const { customerIds, managerIds } = await resolveRecipients(input);
  if (customerIds.length + managerIds.length === 0) {
    return res.status(400).json({ message: "Nobody matches this audience" });
  }

  const broadcast = await Broadcast.create({
    title: input.title,
    body: input.body,
    audience: input.audience,
    restaurantIds: input.audience === "restaurants" ? (input.restaurantIds ?? []) : [],
    ...(input.audience === "restaurants" && input.restaurantTarget && { restaurantTarget: input.restaurantTarget }),
    ...(linked && { linkRestaurantId: linked._id }),
    sentBy: req.user!._id,
    recipients: { customers: customerIds.length, managers: managerIds.length },
  });

  res.status(202).json({
    message: `Sending to ${customerIds.length + managerIds.length} people…`,
    broadcast,
  });

  void deliver(broadcast._id, [...customerIds, ...managerIds], {
    title: input.title,
    body: input.body,
    linked: linked ? { _id: linked._id, name: linked.name, logo: linked.logo } : null,
  });
};


const deliver = async (
  broadcastId: Types.ObjectId,
  userIds: Types.ObjectId[],
  msg: { title: string; body: string; linked: { _id: Types.ObjectId; name: string; logo?: string | undefined } | null },
) => {
  const BATCH = 500;
  try {
    for (let i = 0; i < userIds.length; i += BATCH) {
      const batch = userIds.slice(i, i + BATCH);

      await Notification.insertMany(
        batch.map((userId) => ({
          userId,
          type: "broadcast",
          title: msg.title,
          body: msg.body,
          broadcastId,
          ...(msg.linked && {
            restaurantId: msg.linked._id,
            restaurantName: msg.linked.name,
            ...(msg.linked.logo && { restaurantImage: msg.linked.logo }),
          }),
        })),
        { ordered: false },
      );

      await sendPushToUsers(batch, {
        title: msg.title,
        body: msg.body,
        quiet: true,
        data: {
          type: "broadcast",
          broadcastId: String(broadcastId),
          ...(msg.linked && { restaurantId: String(msg.linked._id) }),
        },
      });
    }
    await Broadcast.updateOne({ _id: broadcastId }, { status: "sent" });
  } catch (error) {
    console.error("❌ Broadcast failed:", (error as Error).message);
    Sentry.captureException(error, { tags: { feature: "broadcast" } });
    await Broadcast.updateOne({ _id: broadcastId }, { status: "failed" }).catch(() => {});
  }
};

export const listBroadcasts = async (_req: Request, res: Response) => {
  const broadcasts = await Broadcast.find()
    .sort({ createdAt: -1 })
    .limit(50)
    .populate("restaurantIds", "name")
    .populate("linkRestaurantId", "name")
    .populate("sentBy", "firstName lastName email");
  const used = await sentToday();
  res.json({ broadcasts, remainingToday: Math.max(0, DAILY_LIMIT - used), dailyLimit: DAILY_LIMIT });
};