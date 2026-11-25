import { Schema, model, type Types } from "mongoose";

export const NOTIFICATION_TYPES = ["order", "review", "broadcast"] as const;
export interface INotification {
  userId: Types.ObjectId;
  type: (typeof NOTIFICATION_TYPES)[number];
  title: string;
  body: string;
  orderId?: Types.ObjectId;
  restaurantId?: Types.ObjectId;
  broadcastId?: Types.ObjectId;
  orderStatus?: string; // status the order moved to (for the icon in the app)
  readAt?: Date;
  restaurantName?: string;
  restaurantImage?: string;
  createdAt: Date;
  updatedAt: Date;
}

const notificationSchema = new Schema<INotification>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    type: { type: String, enum: NOTIFICATION_TYPES, default: "order" },
    title: { type: String, required: true, maxlength: 120 },
    body: { type: String, required: true, maxlength: 400 },
    orderId: { type: Schema.Types.ObjectId, ref: "Order" },
    orderStatus: { type: String },
    restaurantName: { type: String },
    restaurantImage: { type: String },
    restaurantId: { type: Schema.Types.ObjectId, ref: "Restaurant" },
    broadcastId: { type: Schema.Types.ObjectId, ref: "Broadcast" },
    readAt: { type: Date },
  },
  { timestamps: true },
);

// My notifications, newest first
notificationSchema.index({ userId: 1, createdAt: -1 });
// Unread count
notificationSchema.index({ userId: 1, readAt: 1 });
// Auto-delete after 90 days
notificationSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 90 * 24 * 60 * 60 },
);

export const Notification = model<INotification>(
  "Notification",
  notificationSchema,
);
