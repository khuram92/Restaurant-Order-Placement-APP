import mongoose from "mongoose";
import { z } from "zod";

const name = (label: string) =>
  z
    .string({ error: `${label} is required` })
    .trim()
    .min(2, `${label} must be at least 2 characters`)
    .max(40, `${label} is too long`)
    .regex(/^[\p{L}\s'.-]+$/u, `${label} can only contain letters`);

const email = z
  .string({ error: "Email is required" })
  .trim()
  .toLowerCase()
  .regex(/^\S+@\S+\.\S+$/, "Enter a valid email");

// Pakistani mobile; "" = no phone (lets Edit remove it)
const phone = z
  .string()
  .trim()
  .refine((v) => v === "" || /^03\d{9}$/.test(v), "Phone must be 03XXXXXXXXX");

const restaurantId = z
  .string({ error: "Choose a restaurant" })
  .refine((v) => mongoose.isValidObjectId(v), "Choose a valid restaurant");

export const createManagerSchema = z.object({
  firstName: name("First name"),
  lastName: name("Last name"),
  email,
  phone: phone.optional(),
  restaurantId,
});

export const updateManagerSchema = z
  .object({
    firstName: name("First name"),
    lastName: name("Last name"),
    email,
    phone,
    restaurantId,
  })
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: "Nothing to update",
  });

export const managerStatusSchema = z.object({
  isActive: z.boolean({ error: "isActive must be true or false" }),
});

export const managerListQuerySchema = z.object({
  search: z.string().trim().optional(),
  status: z.enum(["active", "inactive", "all"]).default("all"),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});
