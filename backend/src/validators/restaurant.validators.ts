import { z } from "zod";
import { DAYS } from "../models/Restaurant.js";

const time = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Time must be HH:mm (e.g. 09:30)");

const openingHour = z.object({
  day: z.enum(DAYS),
  open: time,
  close: time,
  closed: z.boolean().default(false),
});

const openingHours = z
  .array(openingHour)
  .length(7, "Opening hours must include all 7 days")
  .refine((hours) => DAYS.every((d) => hours.some((h) => h.day === d)), {
    message: "Each day (mon–sun) must appear once",
  });

// The app sends { lat, lng }; we convert to GeoJSON [lng, lat] in the controller
const location = z.object({
  lat: z
    .number()
    .min(-90, "Latitude must be between -90 and 90")
    .max(90, "Latitude must be between -90 and 90"),
  lng: z
    .number()
    .min(-180, "Longitude must be between -180 and 180")
    .max(180, "Longitude must be between -180 and 180"),
});

const money = (label: string) =>
  z
    .number({ error: `${label} must be a number` })
    .min(0, `${label} can't be negative`);

const base = {
  name: z
    .string({ error: "Restaurant name is required" })
    .trim()
    .min(2, "Name is too short")
    .max(80),
  description: z.string().trim().max(500).optional(),
  cuisines: z
    .array(z.string().trim().min(1).max(30))
    .max(10, "At most 10 cuisines")
    .optional(),
  phone: z
    .string()
    .trim()
    .regex(/^\+?\d{10,13}$/, "Enter a valid phone number")
    .optional(),
  email: z
    .email({ error: "Enter a valid email" })
    .trim()
    .toLowerCase()
    .optional(),
  address: z.object({
    street: z
      .string({ error: "Street address is required" })
      .trim()
      .min(3, "Street address is too short"),
    area: z.string().trim().optional(),
    city: z
      .string({ error: "City is required" })
      .trim()
      .min(2, "City is required"),
  }),
  location: location.optional(),
  openingHours: openingHours.optional(),
  services: z
    .object({
      dineIn: z.boolean(),
      takeaway: z.boolean(),
      delivery: z.boolean(),
    })
    .optional(),
  deliveryFee: money("Delivery fee").optional(),
  minOrder: money("Minimum order").optional(),
  deliveryRadiusKm: z.number().min(0).max(50, "Radius is too large").optional(),
  taxRate: z.number().min(0).max(100, "Tax can't be over 100%").optional(),
  tableHoldMinutes: z
    .number()
    .int()
    .min(5, "At least 5 minutes")
    .max(240, "At most 240 minutes")
    .optional(),
  seatingCapacity: z
    .number()
    .int("Seats must be a whole number")
    .min(0)
    .max(2000, "At most 2000 seats")
    .optional(),
};

export const createRestaurantSchema = z.object(base);

// Edit: every field optional; address/services can be partly updated; location can be cleared with null
export const updateRestaurantSchema = z
  .object({
    ...base,
    name: base.name.optional(),
    address: z
      .object({
        street: z.string().trim().min(3, "Street address is too short"),
        area: z.string().trim(),
        city: z.string().trim().min(2, "City is required"),
      })
      .partial()
      .optional(),
    services: z
      .object({
        dineIn: z.boolean(),
        takeaway: z.boolean(),
        delivery: z.boolean(),
      })
      .partial()
      .optional(),
    location: location.nullable().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "Nothing to update",
  });

export const statusSchema = z.object({
  isActive: z.boolean({ error: "isActive must be true or false" }),
});

export const listQuerySchema = z.object({
  search: z.string().trim().optional(),
  city: z.string().trim().optional(),
  status: z.enum(["active", "inactive", "all"]).default("all"),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export type CreateRestaurantInput = z.infer<typeof createRestaurantSchema>;
export type UpdateRestaurantInput = z.infer<typeof updateRestaurantSchema>;
