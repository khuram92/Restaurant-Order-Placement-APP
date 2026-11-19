import { z } from "zod";
import { ORDER_STATUSES } from "../models/Order.js";

export const listRestaurantOrdersSchema = z.object({
  tab: z.enum(["new", "active", "past"]).default("new"),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  q: z.string().trim().max(50, "Search is too long").optional(),
});

export const updateOrderStatusSchema = z
  .object({
    status: z.enum(ORDER_STATUSES, { message: "Choose a valid status" }),
    reason: z.string().trim().max(200, "Reason is too long").optional(),
    prepMinutes: z.number().int().min(5, "At least 5 minutes").max(120, "At most 2 hours").optional(),
  })
  .refine((d) => d.status !== "rejected" || (d.reason?.length ?? 0) >= 3, {
    message: "Tell the customer why you're rejecting the order",
    path: ["reason"],
  });

export const delayOrderSchema = z.object({
  addMinutes: z.number().int().min(5, "At least 5 minutes").max(60, "At most 60 minutes"),
});