// import type { Request, Response } from "express";
// import mongoose, { Types } from "mongoose";
// import { z } from "zod";
// import { ACTIVE_STATUSES, ORDER_TYPES, Order } from "../models/Order.js";
// import { Restaurant } from "../models/Restaurant.js";
// import { rangeStart } from "../utils/orderStats.js";

// const listSchema = z.object({
//   tab: z.enum(["all", "active", "past"]).default("all"),
//   restaurantId: z
//     .string()
//     .trim()
//     .refine((v) => mongoose.isValidObjectId(v), "Invalid restaurant")
//     .optional(),
//   type: z.enum(ORDER_TYPES).optional(),
//   range: z.enum(["today", "7d", "30d", "all"]).default("all"),
//   q: z.string().trim().max(50, "Search is too long").optional(),
//   page: z.coerce.number().int().min(1).default(1),
//   limit: z.coerce.number().int().min(1).max(50).default(20),
// });

// const escapeRegex = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// /**
//  * GET /api/admin/orders?tab=&restaurantId=&type=&range=&q=&page=
//  * All orders on the platform, newest first, + counts per tab for the same filters.
//  */
// export const listAllOrders = async (req: Request, res: Response) => {
//   const parsed = listSchema.safeParse(req.query);
//   if (!parsed.success) return res.status(400).json({ message: parsed.error.issues[0]?.message });
//   const { tab, restaurantId, type, range, q, page, limit } = parsed.data;

//   // Filters shared by the list and the tab counts
//   const base: Record<string, unknown> = {};
//   if (restaurantId) base.restaurantId = new Types.ObjectId(restaurantId);
//   if (type) base.type = type;
//   if (range !== "all") base.createdAt = { $gte: rangeStart(range) };

//   const search = q?.replace(/^#/, "").trim();
//   if (search) {
//     const pattern = new RegExp(escapeRegex(search), "i");
//     base.$or = [
//       { orderNumber: pattern },
//       { customerName: pattern },
//       { customerPhone: pattern },
//       { "delivery.phone": pattern },
//       { restaurantName: pattern },
//     ];
//   }

//   const activeFilter = { ...base, status: { $in: ACTIVE_STATUSES } };
//   const pastFilter = { ...base, status: { $nin: ACTIVE_STATUSES } };
//   const filter = tab === "active" ? activeFilter : tab === "past" ? pastFilter : base;

//   const [orders, total, all, active] = await Promise.all([
//     Order.find(filter)
//       .sort({ createdAt: -1 })
//       .skip((page - 1) * limit)
//       .limit(limit),
//     Order.countDocuments(filter),
//     Order.countDocuments(base),
//     Order.countDocuments(activeFilter),
//   ]);

//   res.json({
//     orders,
//     total,
//     page,
//     pages: Math.max(1, Math.ceil(total / limit)),
//     counts: { all, active, past: all - active },
//   });
// };

// /** GET /api/admin/orders/restaurants — names + logos for the "Restaurant" filter */
// export const orderFilterRestaurants = async (_req: Request, res: Response) => {
//   const restaurants = await Restaurant.find().select("name logo isActive").sort({ name: 1 }).lean();
//   res.json({ restaurants });
// };

// /** GET /api/admin/orders/:id — any order */
// export const getAnyOrder = async (req: Request, res: Response) => {
//   const id = String(req.params.id);
//   if (!mongoose.isValidObjectId(id)) return res.status(400).json({ message: "Invalid order id" });

//   const order = await Order.findById(id);
//   if (!order) return res.status(404).json({ message: "Order not found" });

//   const restaurant = await Restaurant.findById(order.restaurantId).select("name logo phone address").lean();
//   res.json({ order, restaurant });
// };