import type { HydratedDocument } from "mongoose";
import type { IOrder, OrderStatus } from "../models/Order.js";
import { User } from "../models/User.js";
import { sendPushToUsers } from "./push.js";

type OrderDoc = HydratedDocument<IOrder>;

const money = (n: number) => `Rs ${Math.round(n).toLocaleString("en-PK")}`;

const TYPE_LABEL = { delivery: "Delivery", takeaway: "Takeaway", dineIn: "Dine-in" } as const;

/** The active manager(s) of the order's restaurant */
const managerIdsOf = async (order: OrderDoc) =>
  (await User.find({ role: "manager", isActive: true, restaurantId: order.restaurantId }).select("_id")).map((u) => u._id);

// ---------- Manager ----------

/** 🛎️ New order → the restaurant's manager */
export const notifyNewOrder = async (order: OrderDoc) => {
  const items = order.items.reduce((sum, i) => sum + i.quantity, 0);
  const type = order.dineIn ? `Dine-in · ${order.dineIn.partySize} people` : TYPE_LABEL[order.type];

  await sendPushToUsers(await managerIdsOf(order), {
    title: `🛎️ New order #${order.orderNumber}`,
    body: `${money(order.total)} · ${type} · ${items} item${items === 1 ? "" : "s"} · ${order.customerName}`,
    data: { type: "manager-order", orderId: String(order._id) },
  });
};

/** ❌ Customer cancelled → the restaurant's manager */
export const notifyOrderCancelled = async (order: OrderDoc) => {
  await sendPushToUsers(await managerIdsOf(order), {
    title: `❌ Order #${order.orderNumber} cancelled`,
    body: `${order.customerName} cancelled the order${order.cancelReason ? `: ${order.cancelReason}` : "."}`,
    data: { type: "manager-order", orderId: String(order._id) },
  });
};

// ---------- Customer ----------

const CUSTOMER_TEXT: Partial<Record<OrderStatus, (o: OrderDoc) => { title: string; body: string }>> = {
  accepted: (o) => ({
    title: "✅ Order confirmed",
    body:
      o.type === "dineIn"
        ? `${o.restaurantName} confirmed your order. Your table is held.`
        : `${o.restaurantName} confirmed your order #${o.orderNumber}.`,
  }),
  rejected: (o) => ({
    title: "Order not accepted",
    body: `${o.restaurantName} couldn't take your order${o.rejectReason ? `: ${o.rejectReason}` : "."}`,
  }),
  preparing: (o) => ({ title: "👨‍🍳 Being prepared", body: `${o.restaurantName} is cooking your food.` }),
  ready: (o) => ({ title: "🥡 Ready for pickup", body: `Your order #${o.orderNumber} is ready at ${o.restaurantName}.` }),
  outForDelivery: (o) => ({ title: "🛵 On the way", body: `Your rider is on the way. Keep ${money(o.total)} cash ready.` }),
  served: () => ({ title: "🍽️ Served", body: "Enjoy your meal!" }),
  completed: (o) => ({ title: "🎉 Order completed", body: `Thanks for ordering from ${o.restaurantName}!` }),
};

/** Status changed by the restaurant → the customer */
export const notifyCustomerOfStatus = async (order: OrderDoc) => {
  const text = CUSTOMER_TEXT[order.status]?.(order);
  if (!text) return;
  await sendPushToUsers([order.customerId], {
    ...text,
    data: { type: "customer-order", orderId: String(order._id) },
  });
};