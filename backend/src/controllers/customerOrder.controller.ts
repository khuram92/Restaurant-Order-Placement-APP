import type { Request, Response } from "express";
import mongoose from "mongoose";
import { ACTIVE_STATUSES, Order, type IOrder } from "../models/Order.js";
import { Restaurant } from "../models/Restaurant.js";
import { User } from "../models/User.js";
import { isOpenNow } from "../utils/openingHours.js";
import { generateOrderNumber } from "../utils/orderNumber.js";
import { buildOrderItems, OrderError, seatsInUse } from "../utils/orderPricing.js";
import { cancelOrderSchema, createOrderSchema, listMyOrdersSchema } from "../validators/order.validators.js";

const firstIssue = (error: { issues: { message: string }[] }) => error.issues[0]?.message ?? "Invalid input";

const SERVICE_LABEL = { dineIn: "Dine-in", takeaway: "Takeaway", delivery: "Delivery" } as const;

/** Loads one of the customer's own orders, or sends 400/404 and returns null */
const findMyOrderOr404 = async (req: Request, res: Response) => {
  const id = String(req.params.id);
  if (!mongoose.isValidObjectId(id)) {
    res.status(400).json({ message: "Invalid order id" });
    return null;
  }
  const order = await Order.findOne({ _id: id, customerId: req.user!._id });
  if (!order) res.status(404).json({ message: "Order not found" });
  return order;
};

/** POST /api/orders — place an order (cash only) */
export const createOrder = async (req: Request, res: Response) => {
  const parsed = createOrderSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: firstIssue(parsed.error) });
  const input = parsed.data;
  const customer = req.user!;

  // ---------- Restaurant checks ----------
  const [restaurant, hasManager] = await Promise.all([
    Restaurant.findOne({ _id: input.restaurantId, isActive: true }),
    User.exists({ role: "manager", isActive: true, restaurantId: input.restaurantId }),
  ]);
  if (!restaurant || !hasManager) {
    return res.status(404).json({ message: "This restaurant isn't taking orders right now" });
  }
  if (restaurant.isTemporarilyClosed || !isOpenNow(restaurant.openingHours)) {
    return res.status(409).json({ message: `${restaurant.name} is closed right now` });
  }
  if (!restaurant.services[input.type]) {
    return res.status(409).json({ message: `${restaurant.name} doesn't offer ${SERVICE_LABEL[input.type]}` });
  }

  try {
    // ---------- Prices from the live menu ----------
    const { items, subtotal } = await buildOrderItems(restaurant.id, input.items);

    if (restaurant.minOrder > 0 && subtotal < restaurant.minOrder) {
      return res.status(409).json({ message: `Minimum order is Rs ${restaurant.minOrder}` });
    }

    // ---------- Dine-in: is there room right now? (seats are held when the manager accepts) ----------
    if (input.type === "dineIn" && input.dineIn) {
      const free = restaurant.seatingCapacity - (await seatsInUse(restaurant._id));
      if (input.dineIn.partySize > free) {
        return res.status(409).json({
          message: free > 0 ? `Only ${free} seat${free === 1 ? "" : "s"} free right now` : "No seats are free right now. Try Takeaway?",
        });
      }
    }

    const tax = Math.round((subtotal * restaurant.taxRate) / 100);
    const deliveryFee = input.type === "delivery" ? restaurant.deliveryFee : 0;

    const data: IOrder = {
      orderNumber: generateOrderNumber(),
      customerId: customer._id,
      restaurantId: restaurant._id,
      restaurantName: restaurant.name,
      type: input.type,
      items,
      subtotal,
      tax,
      taxRate: restaurant.taxRate,
      deliveryFee,
      total: subtotal + tax + deliveryFee,
      customerName: `${customer.firstName ?? ""} ${customer.lastName ?? ""}`.trim() || "Customer",
      paymentMethod: "cash",
      paymentStatus: "unpaid",
      status: "pending",
      statusHistory: [{ status: "pending", at: new Date(), by: customer._id }],
    };
    if (customer.phone) data.customerPhone = customer.phone;
    if (input.note) data.note = input.note;
    if (input.type === "delivery" && input.delivery) {
      const { area, instructions, ...rest } = input.delivery;
      data.delivery = { ...rest, ...(area && { area }), ...(instructions && { instructions }) };
    }
    if (input.type === "dineIn" && input.dineIn) {
      data.dineIn = { partySize: input.dineIn.partySize, seatsReserved: false };
    }

    // A clash on the 6-letter code is very unlikely; retry a few times just in case
    for (let attempt = 0; ; attempt++) {
      try {
        const order = await new Order(data).save();
        return res.status(201).json({ order });
      } catch (error) {
        const duplicate = (error as { code?: number }).code === 11000;
        if (!duplicate || attempt >= 4) throw error;
        data.orderNumber = generateOrderNumber();
      }
    }
  } catch (error) {
    if (error instanceof OrderError) return res.status(error.status).json({ message: error.message });
    throw error; // → error handler
  }
};

/** GET /api/orders?status=active|past|all&page= — the customer's orders, newest first */
export const listMyOrders = async (req: Request, res: Response) => {
  const parsed = listMyOrdersSchema.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ message: firstIssue(parsed.error) });
  const { status, page, limit } = parsed.data;

  const filter: Record<string, unknown> = { customerId: req.user!._id };
  if (status === "active") filter.status = { $in: ACTIVE_STATUSES };
  if (status === "past") filter.status = { $nin: ACTIVE_STATUSES };

  const [orders, total] = await Promise.all([
    Order.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
    Order.countDocuments(filter),
  ]);

  res.json({ orders, total, page, pages: Math.max(1, Math.ceil(total / limit)) });
};

/** GET /api/orders/:id */
export const getMyOrder = async (req: Request, res: Response) => {
  const order = await findMyOrderOr404(req, res);
  if (!order) return;
  res.json({ order });
};

// /** PATCH /api/orders/:id/cancel   { reason? } — only while the restaurant hasn't accepted it */
// export const cancelMyOrder = async (req: Request, res: Response) => {
//   const parsed = cancelOrderSchema.safeParse(req.body ?? {});
//   if (!parsed.success) return res.status(400).json({ message: firstIssue(parsed.error) });

//   const order = await findMyOrderOr404(req, res);
//   if (!order) return;

//   if (order.status !== "pending") {
//     return res.status(409).json({
//       message: "The restaurant has already accepted this order. Please call them to cancel.",
//     });
//   }

//   order.status = "cancelled";
//   if (parsed.data.reason) order.cancelReason = parsed.data.reason;
//   order.statusHistory.push({ status: "cancelled", at: new Date(), by: req.user!._id });
//   await order.save();

//   res.json({ message: "Order cancelled", order });
// };