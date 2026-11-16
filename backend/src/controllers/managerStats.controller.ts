import type { Request, Response } from "express";
import { Types } from "mongoose";
import { buildOrderStats, liveOrderCounts, statsQuerySchema } from "../utils/orderStats.js";

/** GET /api/manager/stats?range=today|7d|30d — numbers for the manager's own restaurant */
export const getManagerStats = async (req: Request, res: Response) => {
  const restaurantId = req.user?.restaurantId;
  if (!restaurantId) return res.status(403).json({ message: "You're not assigned to a restaurant" });

  const parsed = statsQuerySchema.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ message: parsed.error.issues[0]?.message });

  const match = { restaurantId: new Types.ObjectId(String(restaurantId)) };
  const [stats, live] = await Promise.all([buildOrderStats(match, parsed.data.range), liveOrderCounts(match)]);

  res.json({ ...stats, live });
};