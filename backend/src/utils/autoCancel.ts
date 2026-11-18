import { Order } from "../models/Order.js";
import { notifyAutoCancelled } from "./orderNotifications.js";
import { emitOrderEvent } from "./realtime.js";


export const AUTO_CANCEL_MINUTES =  20;
const CHECK_EVERY_MS = 60 * 1000; 


const cancelIgnoredOrders = async () => {
  const cutoff = new Date(Date.now() - AUTO_CANCEL_MINUTES * 60 * 1000);
  const stale = await Order.find({ status: "pending", createdAt: { $lt: cutoff } }).select("_id").limit(100);

  for (const { _id } of stale) {
    
    const order = await Order.findOneAndUpdate(
      { _id, status: "pending" },
      {
        $set: {
          status: "cancelled",
          cancelledBy: "system",
          cancelReason: `Not confirmed by the restaurant within ${AUTO_CANCEL_MINUTES} minutes`,
        },
        $push: { statusHistory: { status: "cancelled", at: new Date() } },
      },
      { new: true },
    );
    if (!order) continue;

    emitOrderEvent("order:updated", order);
    void notifyAutoCancelled(order, AUTO_CANCEL_MINUTES); 
    
  }
};


export const startAutoCancel = () => {
  const run = () =>
    cancelIgnoredOrders().catch((error) =>
      console.error("❌ Auto-cancel failed:", (error as Error).message),
    );
  void run(); // once at start-up (catches orders that expired while the server was off)
  setInterval(run, CHECK_EVERY_MS);
  console.log(`⌛ Auto-cancel on: pending orders expire after ${AUTO_CANCEL_MINUTES} min`);
};