import { z } from "zod";

export const temporaryCloseSchema = z.object({
  isTemporarilyClosed: z.boolean({ error: "isTemporarilyClosed must be true or false" }),
});