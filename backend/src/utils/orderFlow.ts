import type { OrderStatus, OrderType } from "../models/Order.js";

/** The normal path of an order, per type (same steps the customer's tracker shows) */
export const ORDER_FLOW: Record<OrderType, OrderStatus[]> = {
  dineIn: ["pending", "accepted", "preparing", "served", "completed"],
  takeaway: ["pending", "accepted", "preparing", "ready", "completed"],
  delivery: ["pending", "accepted", "preparing", "outForDelivery", "completed"],
};

/** The one step forward from the current status, or null at the end / when stopped */
export const nextStatus = (type: OrderType, status: OrderStatus): OrderStatus | null => {
  const flow = ORDER_FLOW[type];
  const i = flow.indexOf(status);
  return i === -1 || i === flow.length - 1 ? null : (flow[i + 1] ?? null);
};

/** Can the manager move an order from `from` to `to`? */
export const canMoveTo = (type: OrderType, from: OrderStatus, to: OrderStatus) =>
  (from === "pending" && to === "rejected") || nextStatus(type, from) === to;