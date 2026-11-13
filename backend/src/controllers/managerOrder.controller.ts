import type { Request, Response } from "express";
import mongoose from "mongoose";
import { Order, type OrderStatus } from "../models/Order.js";
import { Restaurant } from "../models/Restaurant.js";
import { canMoveTo } from "../utils/orderFlow.js";
import { seatsInUse } from "../utils/orderPricing.js";
import { listRestaurantOrdersSchema, updateOrderStatusSchema } from "../validators/managerOrder.validators.js";

const firstIssue = (error: { issues: { message: string }[] }) => error.issues[0]?.message ?? "Invalid input";

/** Which statuses each tab shows */
const TAB_STATUSES: Record<"new" | "active" | "past", OrderStatus[]> = {
  new: ["pending"],
  active: ["accepted", "preparing", "ready", "outForDelivery", "served"],
  past: ["completed", "rejected", "cancelled"],
};

/** The manager's restaurant id, or sends 403 and returns null */
const myRestaurantId = (req: Request, res: Response) => {
  const restaurantId = req.user?.restaurantId;
  if (!restaurantId) {
    res.status(403).json({ message: "You're not assigned to a restaurant" });
    return null;
  }
  return String(restaurantId);
};

/** GET /api/manager/orders?tab=new|active|past&page= — orders + tab counts + seats */
export const listRestaurantOrders = async (req: Request, res: Response) => {
  const restaurantId = myRestaurantId(req, res);
  if (!restaurantId) return;

  const parsed = listRestaurantOrdersSchema.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ message: firstIssue(parsed.error) });
  const { tab, page, limit } = parsed.data;

  const filter = { restaurantId, status: { $in: TAB_STATUSES[tab] } };
  // New orders: oldest first (serve in order). Others: newest first.
  const sort = tab === "new" ? { createdAt: 1 as const } : { createdAt: -1 as const };

  const [orders, total, newCount, activeCount, restaurant, inUse] = await Promise.all([
    Order.find(filter).sort(sort).skip((page - 1) * limit).limit(limit),
    Order.countDocuments(filter),
    Order.countDocuments({ restaurantId, status: { $in: TAB_STATUSES.new } }),
    Order.countDocuments({ restaurantId, status: { $in: TAB_STATUSES.active } }),
    Restaurant.findById(restaurantId).select("seatingCapacity"),
    seatsInUse(restaurantId),
  ]);

  res.json({
    orders,
    total,
    page,
    pages: Math.max(1, Math.ceil(total / limit)),
    counts: { new: newCount, active: activeCount },
    seats: { capacity: restaurant?.seatingCapacity ?? 0, inUse },
  });
};

/** GET /api/manager/orders/:id */
export const getRestaurantOrder = async (req: Request, res: Response) => {
  const restaurantId = myRestaurantId(req, res);
  if (!restaurantId) return;

  const id = String(req.params.id);
  if (!mongoose.isValidObjectId(id)) return res.status(400).json({ message: "Invalid order id" });

  const order = await Order.findOne({ _id: id, restaurantId });
  if (!order) return res.status(404).json({ message: "Order not found" });
  res.json({ order });
};

// /** PATCH /api/manager/orders/:id/status   { status, reason? } — one step forward, or reject while pending */
// export const updateOrderStatus = async (req: Request, res: Response) => {
//   const restaurantId = myRestaurantId(req, res);
//   if (!restaurantId) return;

//   const id = String(req.params.id);
//   if (!mongoose.isValidObjectId(id)) return res.status(400).json({ message: "Invalid order id" });

//   const parsed = updateOrderStatusSchema.safeParse(req.body ?? {});
//   if (!parsed.success) return res.status(400).json({ message: firstIssue(parsed.error) });
//   const { status: to, reason } = parsed.data;

//   const order = await Order.findOne({ _id: id, restaurantId });
//   if (!order) return res.status(404).json({ message: "Order not found" });

//   const from = order.status;
//   if (!canMoveTo(order.type, from, to)) {
//     return res.status(409).json({ message: `Can't change this order from "${from}" to "${to}"` });
//   }

//   // ---------- What changes ----------
//   const set: Record<string, unknown> = { status: to };

//   if (to === "rejected" && reason) set.rejectReason = reason;
//   if (to === "completed") set.paymentStatus = "paid"; // cash collected

//   if (order.dineIn) {
//     if (to === "accepted") {
//       // Hold the seats — only if there's room
//       const restaurant = await Restaurant.findById(restaurantId).select("seatingCapacity");
//       const free = (restaurant?.seatingCapacity ?? 0) - (await seatsInUse(restaurantId));
//       if (order.dineIn.partySize > free) {
//         return res.status(409).json({
//           message: `Only ${Math.max(0, free)} seat${free === 1 ? "" : "s"} free right now. Free up a table or reject the order.`,
//         });
//       }
//       set["dineIn.seatsReserved"] = true;
//     }
//     if (to === "completed" || to === "rejected") set["dineIn.seatsReserved"] = false; // release
//   }

//   // Only update if nobody changed it meanwhile (e.g. the customer cancelled a second ago)
//   const updated = await Order.findOneAndUpdate(
//     { _id: order._id, status: from },
//     { $set: set, $push: { statusHistory: { status: to, at: new Date(), by: req.user!._id } } },
//     { new: true, runValidators: true },
//   );

//   if (!updated) {
//     return res.status(409).json({ message: "This order was just updated by someone else. Pull to refresh." });
//   }
//   res.json({ message: "Order updated", order: updated });
// };