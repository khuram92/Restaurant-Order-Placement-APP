import { z } from "zod";

export const customerListQuerySchema = z
  .object({
    search: z.string().trim().optional(),
    city: z.string().trim().optional(),
    service: z.enum(["dineIn", "takeaway", "delivery"]).optional(),
    // Customer's position (optional) → distance + "delivers to you" on each card
    lat: z.coerce.number().min(-90).max(90).optional(),
    lng: z.coerce.number().min(-180).max(180).optional(),
    sort: z.enum(["name", "nearest"]).default("name"),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(20),
  })
  .refine((q) => (q.lat === undefined) === (q.lng === undefined), {
    message: "Send both lat and lng",
  })
  .refine((q) => q.sort !== "nearest" || q.lat !== undefined, {
    message: "Your location is needed to sort by nearest",
  });