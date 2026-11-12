import mongoose from "mongoose";
import { z } from "zod";

const objectId = (message: string) => z.string({ error: message }).refine((v) => mongoose.isValidObjectId(v), message);

const PK_PHONE = /^03\d{9}$/;

const orderLineSchema = z.object({
  itemId: objectId("Invalid item"),
  sizeId: objectId("Invalid size").optional(),
  addOnOptionIds: z.array(objectId("Invalid add-on")).max(50).default([]),
  quantity: z.number().int().min(1, "Quantity must be at least 1").max(20, "At most 20 of one item"),
  note: z.string().trim().max(150, "Item note is too long").optional(),
});

export const createOrderSchema = z
  .object({
    restaurantId: objectId("Invalid restaurant"),
    type: z.enum(["dineIn", "takeaway", "delivery"], { error: "Choose Dine-in, Takeaway or Delivery" }),
    items: z.array(orderLineSchema).min(1, "Your cart is empty").max(50, "Too many items in one order"),
    note: z.string().trim().max(300, "Note is too long").optional(),
    delivery: z
      .object({
        street: z.string().trim().min(3, "Enter the street / house address").max(150),
        area: z.string().trim().max(80).optional(),
        city: z.string().trim().min(2, "Enter the city").max(60),
        phone: z.string().trim().regex(PK_PHONE, "Enter a phone number like 03001234567"),
        instructions: z.string().trim().max(200).optional(),
      })
      .optional(),
    dineIn: z
      .object({
        partySize: z.number().int().min(1, "At least 1 person").max(20, "At most 20 people per order"),
      })
      .optional(),
  })
  .refine((d) => d.type !== "delivery" || !!d.delivery, { message: "Add a delivery address", path: ["delivery"] })
  .refine((d) => d.type !== "dineIn" || !!d.dineIn, { message: "Enter the number of people", path: ["dineIn"] });

export type CreateOrderInput = z.infer<typeof createOrderSchema>;

export const listMyOrdersSchema = z.object({
  status: z.enum(["active", "past", "all"]).default("all"),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export const cancelOrderSchema = z.object({
  reason: z.string().trim().max(200).optional(),
});