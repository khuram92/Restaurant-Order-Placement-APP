import type { HydratedDocument,Types } from "mongoose";
import { Notification } from "../models/Notification.js";
import type { IOrder, OrderStatus } from "../models/Order.js";
import { Restaurant } from "../models/Restaurant.js";
import { User } from "../models/User.js";
import { sendPushToUsers } from "./push.js";

type OrderDoc = HydratedDocument<IOrder>;

const money = (n: number) => `Rs ${Math.round(n).toLocaleString("en-PK")}`;
const clock = (d: Date) =>
  d.toLocaleTimeString("en-US", { timeZone: "Asia/Karachi", hour: "numeric", minute: "2-digit" });

const TYPE_LABEL = {
  delivery: "Delivery",
  takeaway: "Takeaway",
  dineIn: "Dine-in",
} as const;

/** The active manager(s) of the order's restaurant */
const managerIdsOf = async (order: OrderDoc) =>
  (
    await User.find({
      role: "manager",
      isActive: true,
      restaurantId: order.restaurantId,
    }).select("_id")
  ).map((u) => u._id);

/** Save an entry in these users' Notifications screen (never throws) */
const saveToInbox = async (
  userIds: unknown[],
  order: OrderDoc,
  text: { title: string; body: string },
  orderStatus: OrderStatus,
) => {
  try {
    if (userIds.length === 0) return;
    await Notification.insertMany(
      userIds.map((userId) => ({
        userId,
        type: "order",
        title: text.title,
        body: text.body,
        orderId: order._id,
        orderStatus,
        restaurantName: order.restaurantName,
      })),
    );
  } catch (error) {
    console.error("❌ Saving notification failed:", (error as Error).message);
  }
};

// ---------- Manager ----------


export const notifyNewOrder = async (order: OrderDoc) => {
  const items = order.items.reduce((sum, i) => sum + i.quantity, 0);
  const type = order.dineIn
    ? `Dine-in · ${order.dineIn.partySize} people`
    : TYPE_LABEL[order.type];

  const managerIds = await managerIdsOf(order);
  const text = {
    title: `🛎️ New order #${order.orderNumber}`,
    body: `${money(order.total)} · ${type} · ${items} item${items === 1 ? "" : "s"} · ${order.customerName}`,
  };

  await saveToInbox(managerIds, order, text, "pending");
  await sendPushToUsers(managerIds, {
    ...text,
    data: { type: "manager-order", orderId: String(order._id) },
  });
};


export const notifyOrderCancelled = async (order: OrderDoc) => {
  const managerIds = await managerIdsOf(order);
  const text = {
    title: `❌ Order #${order.orderNumber} cancelled`,
    body: `${order.customerName} cancelled the order${order.cancelReason ? `: ${order.cancelReason}` : "."}`,
  };

  await saveToInbox(managerIds, order, text, "cancelled");
  await sendPushToUsers(managerIds, {
    ...text,
    data: { type: "manager-order", orderId: String(order._id) },
  });
};

// ---------- Customer ----------

const CUSTOMER_TEXT: Partial<
  Record<OrderStatus, (o: OrderDoc) => { title: string; body: string }>
> = {
    accepted: (o) => ({
    title: "✅ Order confirmed",
    body:
      (o.type === "dineIn"
        ? `${o.restaurantName} confirmed your order. Your table is held.`
        : `${o.restaurantName} confirmed your order #${o.orderNumber}.`) +
      (o.readyBy ? ` Ready around ${clock(o.readyBy)}.` : ""),
  }),
  rejected: (o) => ({
    title: "Order not accepted",
    body: `${o.restaurantName} couldn't take your order${o.rejectReason ? `: ${o.rejectReason}` : "."}`,
  }),
  preparing: (o) => ({
    title: "👨‍🍳 Being prepared",
    body: `${o.restaurantName} is cooking your food.`,
  }),
  ready: (o) => ({
    title: "🥡 Ready for pickup",
    body: `Your order #${o.orderNumber} is ready at ${o.restaurantName}.`,
  }),
  outForDelivery: (o) => ({
    title: "🛵 On the way",
    body: `Your rider is on the way. Keep ${money(o.total)} cash ready.`,
  }),
  served: () => ({ title: "🍽️ Served", body: "Enjoy your meal!" }),
  completed: (o) => ({
    title: "🎉 Order completed",
    body: `Thanks for ordering from ${o.restaurantName}!`,
  }),
};

/** Status changed by the restaurant → the customer (saved in their inbox + push) */
export const notifyCustomerOfStatus = async (order: OrderDoc) => {
  const text = CUSTOMER_TEXT[order.status]?.(order);
  if (!text) return;

  // Inbox entry (the Notifications screen) — a failure here must not stop the push
  try {
    const restaurant = await Restaurant.findById(order.restaurantId).select(
      "logo",
    );
    const restaurantImage = restaurant?.logo;
    await Notification.create({
      userId: order.customerId,
      restaurantName: order.restaurantName,
      ...(restaurantImage && { restaurantImage }),

      type: "order",
      title: text.title,
      body: text.body,
      orderId: order._id,
      orderStatus: order.status,
    });
  } catch (error) {
    console.error("❌ Saving notification failed:", (error as Error).message);
  }

  await sendPushToUsers([order.customerId], {
    ...text,
    data: { type: "customer-order", orderId: String(order._id) },
  });
};

// ---------- Reviews ----------

/** 💬 The restaurant replied to a review → the customer */
export const notifyReviewReply = async (review: {
  customerId: Types.ObjectId;
  restaurantId: Types.ObjectId;
  orderId: Types.ObjectId;
  reply?: { text: string } | undefined;
}) => {
  try {
    const restaurant = await Restaurant.findById(review.restaurantId).select("name");
    const name = restaurant?.name ?? "The restaurant";
    const reply = review.reply?.text ?? "";
    const text = {
      title: `💬 ${name} replied to your review`,
      body: reply.length > 120 ? `${reply.slice(0, 117)}…` : reply,
    };

    await Notification.create({
      userId: review.customerId,
      type: "review",
      title: text.title,
      body: text.body,
      orderId: review.orderId,
      restaurantName: name,
    });
    await sendPushToUsers([review.customerId], {
      ...text,
      data: { type: "customer-order", orderId: String(review.orderId) },
    });
  } catch (error) {
    console.error("❌ Review reply notification failed:", (error as Error).message);
  }
};

/** Not accepted in time → tell the customer (inbox + push) and the manager */
export const notifyAutoCancelled = async (order: OrderDoc, minutes: number) => {
  const customerText = {
    title: "⌛ Order cancelled",
    body: `${order.restaurantName} didn't confirm order #${order.orderNumber} within ${minutes} minutes, so we cancelled it. You haven't been charged.`,
  };
  const managerText = {
    title: `⌛ Order #${order.orderNumber} auto-cancelled`,
    body: `It wasn't accepted within ${minutes} minutes. ${order.customerName} has been told.`,
  };

  try {
    const restaurant = await Restaurant.findById(order.restaurantId).select("logo");
    await Notification.create({
      userId: order.customerId,
      type: "order",
      ...customerText,
      orderId: order._id,
      orderStatus: "cancelled",
      restaurantName: order.restaurantName,
      ...(restaurant?.logo && { restaurantImage: restaurant.logo }),
    });
  } catch (error) {
    console.error("❌ Saving notification failed:", (error as Error).message);
  }
  await sendPushToUsers([order.customerId], {
    ...customerText,
    data: { type: "customer-order", orderId: String(order._id) },
  });

  const managerIds = await managerIdsOf(order);
  await saveToInbox(managerIds, order, managerText, "cancelled");
  await sendPushToUsers(managerIds, {
    ...managerText,
    data: { type: "manager-order", orderId: String(order._id) },
  });
};

export const notifyCustomerOfDelay = async (order: OrderDoc) => {
  if (!order.readyBy) return;
  const text = {
    title: "⏱️ Taking a little longer",
    body: `${order.restaurantName} needs a few more minutes. Order #${order.orderNumber} is now ready around ${clock(order.readyBy)}.`,
  };
  await saveToInbox([order.customerId], order, text, order.status);
  await sendPushToUsers([order.customerId], {
    ...text,
    data: { type: "customer-order", orderId: String(order._id) },
  });
};