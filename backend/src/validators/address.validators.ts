import { z } from "zod";

const PK_PHONE = /^03\d{9}$/;

export const addressSchema = z
  .object({
    label: z.enum(["home", "work", "other"], { error: "Choose Home, Work or Other" }),
    name: z.string().trim().max(30, "Name is too long").optional(),
    street: z.string().trim().min(3, "Enter the street / house address").max(150),
    area: z.string().trim().max(80).optional(),
    city: z.string().trim().min(2, "Enter the city").max(60),
    phone: z.string().trim().regex(PK_PHONE, "Enter a phone number like 03001234567"),
    instructions: z.string().trim().max(200).optional(),
    location: z
      .object({
        lat: z.number().min(-90).max(90),
        lng: z.number().min(-180).max(180),
      })
      .optional(),
  })
  .refine((a) => a.label !== "other" || !!a.name, {
    message: "Give this address a name (e.g. Mom's place)",
    path: ["name"],
  });

export type AddressInput = z.infer<typeof addressSchema>;