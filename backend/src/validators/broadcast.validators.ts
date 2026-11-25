import { z } from "zod";
import {
  BROADCAST_AUDIENCES,
  RESTAURANT_TARGETS,
} from "../models/Broadcast.js";

const objectId = z.string().regex(/^[a-f\d]{24}$/i, "Invalid id");

export const broadcastAudienceSchema = z
  .object({
    audience: z.enum(BROADCAST_AUDIENCES, {
      error: "Choose who should receive it",
    }),
    restaurantIds: z
      .array(objectId)
      .max(50, "Pick at most 50 restaurants")
      .optional(),
    restaurantTarget: z.enum(RESTAURANT_TARGETS).optional(),
  })
  .superRefine((v, ctx) => {
    if (v.audience !== "restaurants") return;
    if (!v.restaurantIds?.length) {
      ctx.addIssue({
        code: "custom",
        path: ["restaurantIds"],
        message: "Pick at least one restaurant",
      });
    }
    if (!v.restaurantTarget) {
      ctx.addIssue({
        code: "custom",
        path: ["restaurantTarget"],
        message: "Choose customers, managers or both",
      });
    }
  });

export const sendBroadcastSchema = broadcastAudienceSchema.and(
  z.object({
    title: z
      .string()
      .trim()
      .min(3, "Title is too short")
      .max(60, "Title: max 60 characters"),
    body: z
      .string()
      .trim()
      .min(5, "Message is too short")
      .max(200, "Message: max 200 characters"),
    linkRestaurantId: objectId.optional(),
  }),
);

export type BroadcastAudienceInput = z.infer<typeof broadcastAudienceSchema>;

export const promotionsSchema = z.object({
  allowPromotions: z.boolean({
    error: "allowPromotions must be true or false",
  }),
});
