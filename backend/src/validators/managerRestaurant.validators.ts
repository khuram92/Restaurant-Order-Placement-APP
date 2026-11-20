import { z } from "zod";

export const temporaryCloseSchema = z.object({
  isTemporarilyClosed: z.boolean({ error: "isTemporarilyClosed must be true or false" }),
  // Leave out = closed until the manager opens again
  reopenInMinutes: z
    .number({ error: "reopenInMinutes must be a number" })
    .int()
    .min(15, "Close for at least 15 minutes")
    .max(12 * 60, "Close for at most 12 hours")
    .optional(),
});