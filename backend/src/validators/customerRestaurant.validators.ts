import { z } from "zod";

export const customerListQuerySchema = z.object({
  search: z.string().trim().optional(),
  city: z.string().trim().optional(),
  service: z.enum(["dineIn", "takeaway", "delivery"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});