import type { Request, Response } from "express";
import mongoose from "mongoose";
import { z } from "zod";
import { Order } from "../models/Order.js";
import { REVIEW_TAGS, Review } from "../models/Review.js";
import {
  notifyNewReview,
  notifyReviewReply,
} from "../utils/orderNotifications.js";
import {
  ratingSummary,
  refreshRestaurantRating,
  toPublicReview,
} from "../utils/reviews.js";

const firstIssue = (error: { issues: { message: string }[] }) =>
  error.issues[0]?.message ?? "Invalid input";

const createReviewSchema = z.object({
  rating: z.coerce
    .number()
    .int()
    .min(1, "Pick 1 to 5 stars")
    .max(5, "Pick 1 to 5 stars"),
  comment: z
    .string()
    .trim()
    .max(500, "Keep it under 500 characters")
    .optional(),
  tags: z.array(z.enum(REVIEW_TAGS)).max(6).default([]),
});
const listSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  rating: z.coerce.number().int().min(1).max(5).optional(), // only 5★, only 1★…
  unanswered: z.enum(["true", "false"]).optional(), // manager: only reviews without a reply
});

const replySchema = z.object({
  text: z
    .string()
    .trim()
    .min(2, "Write a short reply")
    .max(500, "Keep it under 500 characters"),
});

/** POST /api/orders/:id/review   { rating, comment?, tags? } — once, after the order is completed */
export const createReview = async (req: Request, res: Response) => {
  const id = String(req.params.id);
  if (!mongoose.isValidObjectId(id))
    return res.status(400).json({ message: "Invalid order id" });

  const parsed = createReviewSchema.safeParse(req.body ?? {});
  if (!parsed.success)
    return res.status(400).json({ message: firstIssue(parsed.error) });

  const order = await Order.findOne({ _id: id, customerId: req.user!._id });
  if (!order) return res.status(404).json({ message: "Order not found" });
  if (order.status !== "completed") {
    return res
      .status(409)
      .json({ message: "You can rate an order once it's completed" });
  }
  if (await Review.exists({ orderId: order._id })) {
    return res.status(409).json({ message: "You've already rated this order" });
  }

  const { rating, comment, tags } = parsed.data;
  const review = await Review.create({
    orderId: order._id,
    restaurantId: order.restaurantId,
    customerId: req.user!._id,
    customerName: order.customerName,
    orderType: order.type,
    rating,
    ...(comment && { comment }),
    tags: [...new Set(tags)],
  });

  await refreshRestaurantRating(order.restaurantId);
  void notifyNewReview(review);
  res.status(201).json({ message: "Thanks for your review!", review });
};

/** GET /api/orders/:id/review — my review of this order (or null) */
export const getMyOrderReview = async (req: Request, res: Response) => {
  const id = String(req.params.id);
  if (!mongoose.isValidObjectId(id))
    return res.status(400).json({ message: "Invalid order id" });
  const review = await Review.findOne({
    orderId: id,
    customerId: req.user!._id,
  });
  res.json({ review });
};
/** GET /api/orders/reviews/mine?page= — every review I've written (newest first) */
export const listMyReviews = async (req: Request, res: Response) => {
  const parsed = listSchema.safeParse(req.query);
  if (!parsed.success)
    return res.status(400).json({ message: firstIssue(parsed.error) });
  const { page, limit } = parsed.data;
  const filter = { customerId: req.user!._id };

  const [reviews, total] = await Promise.all([
    Review.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate<{
        restaurantId: { _id: unknown; name: string; logo?: string } | null;
      }>("restaurantId", "name logo")
      .populate<{ orderId: { _id: unknown; orderNumber: string } | null }>(
        "orderId",
        "orderNumber",
      )
      .lean(),
    Review.countDocuments(filter),
  ]);

  res.json({
    reviews: reviews.map((r) => ({
      _id: String(r._id),
      rating: r.rating,
      comment: r.comment,
      tags: r.tags,
      reply: r.reply?.text ? r.reply : undefined,
      orderType: r.orderType,
      createdAt: r.createdAt,
      orderId: String(r.orderId?._id ?? ""),
      orderNumber: r.orderId?.orderNumber,
      restaurantId: String(r.restaurantId?._id ?? ""),
      restaurantName: r.restaurantId?.name ?? "Restaurant",
      restaurantLogo: r.restaurantId?.logo,
    })),
    total,
    page,
    pages: Math.max(1, Math.ceil(total / limit)),
  });
};
/** GET /api/restaurants/:id/reviews?page=&rating= — what customers see on the restaurant page */
export const listRestaurantReviews = async (req: Request, res: Response) => {
  const id = String(req.params.id);
  if (!mongoose.isValidObjectId(id))
    return res.status(400).json({ message: "Invalid restaurant id" });

  const parsed = listSchema.safeParse(req.query);
  if (!parsed.success)
    return res.status(400).json({ message: firstIssue(parsed.error) });
  const { page, limit, rating } = parsed.data;

  const filter = { restaurantId: id, ...(rating && { rating }) };
  const [reviews, total, summary] = await Promise.all([
    Review.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Review.countDocuments(filter),
    ratingSummary(id),
  ]);

  res.json({
    reviews: reviews.map(toPublicReview),
    total,
    page,
    pages: Math.max(1, Math.ceil(total / limit)),
    summary,
  });
};

/** GET /api/manager/reviews?page=&rating= — reviews of my restaurant (with order number) */
export const listMyRestaurantReviews = async (req: Request, res: Response) => {
  const restaurantId = req.user?.restaurantId;
  if (!restaurantId)
    return res
      .status(403)
      .json({ message: "You're not assigned to a restaurant" });

  const parsed = listSchema.safeParse(req.query);
  if (!parsed.success)
    return res.status(400).json({ message: firstIssue(parsed.error) });
  const { page, limit, rating, unanswered: onlyUnanswered } = parsed.data;

  const filter = {
    restaurantId,
    ...(rating && { rating }),
    ...(onlyUnanswered === "true" && { "reply.text": { $exists: false } }),
  };
  const [reviews, total, summary, unanswered] = await Promise.all([
    Review.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate<{ orderId: { _id: unknown; orderNumber: string } }>(
        "orderId",
        "orderNumber",
      )
      .lean(),
    Review.countDocuments(filter),
    ratingSummary(String(restaurantId)),
    Review.countDocuments({ restaurantId, "reply.text": { $exists: false } }),
  ]);

  res.json({
    reviews: reviews.map((r) => ({
      ...toPublicReview(r as never),
      customerName: r.customerName, // manager sees the full name
      orderId: String(r.orderId?._id ?? ""),
      orderNumber: r.orderId?.orderNumber,
    })),
    total,
    page,
    pages: Math.max(1, Math.ceil(total / limit)),
    summary,
    unanswered,
  });
};

/** PATCH /api/manager/reviews/:id/reply   { text } — answer (or edit the answer) */
export const replyToReview = async (req: Request, res: Response) => {
  const restaurantId = req.user?.restaurantId;
  if (!restaurantId)
    return res
      .status(403)
      .json({ message: "You're not assigned to a restaurant" });

  const id = String(req.params.id);
  if (!mongoose.isValidObjectId(id))
    return res.status(400).json({ message: "Invalid review id" });

  const parsed = replySchema.safeParse(req.body ?? {});
  if (!parsed.success)
    return res.status(400).json({ message: firstIssue(parsed.error) });

  const review = await Review.findOneAndUpdate(
    { _id: id, restaurantId },
    { $set: { reply: { text: parsed.data.text, at: new Date() } } },
    { new: true },
  );
  if (!review) return res.status(404).json({ message: "Review not found" });

  void notifyReviewReply(review);
  res.json({ message: "Reply posted", review });
};
