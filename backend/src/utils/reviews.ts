import { Types } from "mongoose";
import { Restaurant } from "../models/Restaurant.js";
import { Review, type IReview } from "../models/Review.js";

/** Recalculate a restaurant's average + count (call after a review is added/removed) */
export const refreshRestaurantRating = async (restaurantId: Types.ObjectId | string) => {
  const id = new Types.ObjectId(String(restaurantId));
  const [result] = await Review.aggregate<{ avg: number; count: number }>([
    { $match: { restaurantId: id } },
    { $group: { _id: null, avg: { $avg: "$rating" }, count: { $sum: 1 } } },
  ]);
  await Restaurant.updateOne(
    { _id: id },
    {
      $set: {
        ratingAvg: result ? Math.round(result.avg * 10) / 10 : 0, // 4.36 → 4.4
        ratingCount: result?.count ?? 0,
      },
    },
  );
};

/** Average, count and how many 5★ / 4★ / … */
export const ratingSummary = async (restaurantId: Types.ObjectId | string) => {
  const id = new Types.ObjectId(String(restaurantId));
  const rows = await Review.aggregate<{ _id: number; count: number }>([
    { $match: { restaurantId: id } },
    { $group: { _id: "$rating", count: { $sum: 1 } } },
  ]);
  const breakdown: Record<1 | 2 | 3 | 4 | 5, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let count = 0;
  let total = 0;
  rows.forEach((r) => {
    breakdown[r._id as 1 | 2 | 3 | 4 | 5] = r.count;
    count += r.count;
    total += r._id * r.count;
  });
  return { avg: count ? Math.round((total / count) * 10) / 10 : 0, count, breakdown };
};

/** "Ali Khan" → "Ali K." (customers see each other's reviews) */
export const shortName = (name: string) => {
  const [first, ...rest] = name.trim().split(/\s+/);
  const last = rest.pop();
  return last ? `${first} ${last[0]?.toUpperCase()}.` : (first ?? "Customer");
};

/** What other customers see (no customer id) */
export const toPublicReview = (r: IReview & { _id: unknown }) => ({
  _id: String(r._id),
  customerName: shortName(r.customerName),
  orderType: r.orderType,
  rating: r.rating,
  comment: r.comment,
  tags: r.tags,
  reply: r.reply?.text ? r.reply : undefined,
  createdAt: r.createdAt,
});