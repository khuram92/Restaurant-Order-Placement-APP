import type { Request, Response } from "express";
import { Order } from "../models/Order.js";
import { Restaurant } from "../models/Restaurant.js";
import { User } from "../models/User.js";
import { buildOrderStats, liveOrderCounts, rangeStart, statsQuerySchema } from "../utils/orderStats.js";

/** GET /api/admin/stats?range=today|7d|30d — the whole platform */
export const getAdminStats = async (req: Request, res: Response) => {
  const parsed = statsQuerySchema.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ message: parsed.error.issues[0]?.message });
  const { range } = parsed.data;
  const from = rangeStart(range);

  const [stats, live, restaurantsTotal, restaurantsActive, managersActive, customersTotal, newCustomers, topRestaurants] =
    await Promise.all([
      buildOrderStats({}, range),
      liveOrderCounts({}),
      Restaurant.countDocuments(),
      Restaurant.countDocuments({ isActive: true }),
      User.countDocuments({ role: "manager", isActive: true }),
      User.countDocuments({ role: "customer" }),
      User.countDocuments({ role: "customer", createdAt: { $gte: from } }),
      // Best restaurants in this range, by revenue (completed orders)
      Order.aggregate([
        { $match: { createdAt: { $gte: from }, status: { $nin: ["rejected", "cancelled"] } } },
        {
          $group: {
            _id: "$restaurantId",
            name: { $last: "$restaurantName" },
            orders: { $sum: 1 },
            revenue: { $sum: { $cond: [{ $eq: ["$status", "completed"] }, "$total", 0] } },
          },
        },
        { $sort: { revenue: -1, orders: -1 } },
        { $limit: 5 },
        { $lookup: { from: "restaurants", localField: "_id", foreignField: "_id", as: "restaurant" } },
        {
          $project: {
            _id: 0,
            restaurantId: "$_id",
            name: 1,
            orders: 1,
            revenue: 1,
            logo: { $first: "$restaurant.logo" },
          },
        },
      ]),
    ]);

  res.json({
    ...stats,
    live,
    platform: {
      restaurants: restaurantsTotal,
      activeRestaurants: restaurantsActive,
      activeManagers: managersActive,
      customers: customersTotal,
      newCustomers,
    },
    topRestaurants,
  });
};