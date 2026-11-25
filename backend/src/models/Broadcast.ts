import { Schema, model, type Types } from "mongoose";

export const BROADCAST_AUDIENCES = ["everyone", "customers", "managers", "restaurants"] as const;
export const RESTAURANT_TARGETS = ["customers", "managers", "both"] as const;

export type BroadcastAudience = (typeof BROADCAST_AUDIENCES)[number];
export type RestaurantTarget = (typeof RESTAURANT_TARGETS)[number];


export interface IBroadcast {
  title: string;
  body: string;
  audience: BroadcastAudience;
  restaurantIds: Types.ObjectId[]; 
  restaurantTarget?: RestaurantTarget; 
  linkRestaurantId?: Types.ObjectId; 
  sentBy: Types.ObjectId;
  recipients: { customers: number; managers: number };
  status: "sending" | "sent" | "failed";
  createdAt: Date;
  updatedAt: Date;
}

const broadcastSchema = new Schema<IBroadcast>(
  {
    title: { type: String, required: true, trim: true, maxlength: 60 },
    body: { type: String, required: true, trim: true, maxlength: 200 },
    audience: { type: String, enum: BROADCAST_AUDIENCES, required: true },
    restaurantIds: { type: [{ type: Schema.Types.ObjectId, ref: "Restaurant" }], default: [] },
    restaurantTarget: { type: String, enum: RESTAURANT_TARGETS },
    linkRestaurantId: { type: Schema.Types.ObjectId, ref: "Restaurant" },
    sentBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    recipients: {
      customers: { type: Number, default: 0 },
      managers: { type: Number, default: 0 },
    },
    status: { type: String, enum: ["sending", "sent", "failed"], default: "sending" },
  },
  { timestamps: true, versionKey: false },
);

broadcastSchema.index({ createdAt: -1 });

export const Broadcast = model<IBroadcast>("Broadcast", broadcastSchema);