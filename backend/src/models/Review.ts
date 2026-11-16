import { Schema, model, type Types } from "mongoose";

/** Quick tags the customer can tap */
export const REVIEW_TAGS = ["Tasty food", "Fast service", "Good value", "Friendly staff", "Well packed", "Clean place"] as const;

export interface IReview {
  orderId: Types.ObjectId; // one review per order
  restaurantId: Types.ObjectId;
  customerId: Types.ObjectId;
  customerName: string; // shown as "Ali K."
  orderType: string;
  rating: number; // 1–5
  comment?: string;
  tags: string[];
  reply?: { text: string; at: Date }; // the restaurant's answer
  createdAt: Date;
  updatedAt: Date;
}

const reviewSchema = new Schema<IReview>(
  {
    orderId: { type: Schema.Types.ObjectId, ref: "Order", required: true, unique: true },
    restaurantId: { type: Schema.Types.ObjectId, ref: "Restaurant", required: true },
    customerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    customerName: { type: String, required: true },
    orderType: { type: String, required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, trim: true, maxlength: 500 },
    tags: { type: [{ type: String, enum: REVIEW_TAGS }], default: [] },
    reply: {
      text: { type: String, trim: true, maxlength: 500 },
      at: { type: Date },
    },
  },
  { timestamps: true },
);

// A restaurant's reviews, newest first
reviewSchema.index({ restaurantId: 1, createdAt: -1 });

export const Review = model<IReview>("Review", reviewSchema);