import { z } from "zod";
import { ORDER_STATUSES } from "../models/Order.js";

export const listRestaurantOrdersSchema = z.object({
  tab: z.enum(["new", "active", "past"]).default("new"),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export const updateOrderStatusSchema = z
  .object({
    status: z.enum(ORDER_STATUSES, { message: "Choose a valid status" }),
    reason: z.string().trim().max(200, "Reason is too long").optional(),
  })
  .refine((d) => d.status !== "rejected" || (d.reason?.length ?? 0) >= 3, {
    message: "Tell the customer why you're rejecting the order",
    path: ["reason"],
  });