import mongoose from "mongoose";
import { z } from "zod";

const objectId = z
  .string()
  .refine((v) => mongoose.isValidObjectId(v), "Invalid id");
const price = z
  .number({ error: "Price must be a number" })
  .int("Price must be a whole number")
  .min(0, "Price can't be negative")
  .max(1_000_000, "Price is too high");
const serves = z
  .number({ error: "Serves must be a number" })
  .int("Serves must be a whole number")
  .min(1, "Serves must be at least 1 person")
  .max(50, "Serves can be at most 50 persons");

const categoryFields = {
  name: z
    .string({ error: "Enter a category name" })
    .trim()
    .min(1, "Enter a category name")
    .max(40, "Category name is too long"),
  description: z.string().trim().max(200, "Description is too long"),
  cuisine: z.string().trim().max(40, "Cuisine is too long"),
  isActive: z.boolean(),
};

export const createCategorySchema = z.object({
  name: categoryFields.name,
  description: categoryFields.description.optional(),
  cuisine: categoryFields.cuisine.optional(),

  isActive: categoryFields.isActive.optional(),
});

export const updateCategorySchema = z
  .object(categoryFields)
  .partial()
  .refine((d) => Object.keys(d).length > 0, "Nothing to update");

export const reorderSchema = z.object({
  ids: z
    .array(objectId, { error: "Send the ids in their new order" })
    .min(1, "Send the ids in their new order"),
});

const sizeSchema = z.object({
  _id: objectId.optional(),
  name: z
    .string()
    .trim()
    .min(1, "Enter a size name")
    .max(30, "Size name is too long"),
  price,
  serves: serves.optional(),
});

const addOnOptionSchema = z.object({
  _id: objectId.optional(),
  name: z
    .string()
    .trim()
    .min(1, "Enter an add-on name")
    .max(40, "Add-on name is too long"),
  price: price.default(0),
  isAvailable: z.boolean().default(true),
});

const addOnGroupSchema = z
  .object({
    _id: objectId.optional(),
    name: z
      .string()
      .trim()
      .min(1, "Enter an add-on group name")
      .max(40, "Group name is too long"),
    minSelect: z.number().int().min(0).default(0),
    maxSelect: z.number().int().min(1).default(1),
    options: z
      .array(addOnOptionSchema)
      .min(1, "Each add-on group needs at least one option")
      .max(20),
  })
  .refine((g) => g.minSelect <= g.maxSelect, {
    message: "Minimum can't be more than maximum",
  })
  .refine((g) => g.maxSelect <= g.options.length, {
    message: "Maximum can't be more than the number of options",
  });

const itemFields = {
  categoryId: z
    .string({ error: "Choose a category" })
    .refine((v) => mongoose.isValidObjectId(v), "Choose a category"),
  name: z
    .string({ error: "Enter an item name" })
    .trim()
    .min(1, "Enter an item name")
    .max(60, "Item name is too long"),
  description: z.string().trim().max(300, "Description is too long"), // "" removes it
  price: price.nullable(), // null removes it (when switching to sizes)
  serves: serves.nullable(),
  sizes: z.array(sizeSchema).max(6, "At most 6 sizes"),
  addOnGroups: z.array(addOnGroupSchema).max(10, "At most 10 add-on groups"),
  isBestseller: z.boolean(),
  isChefSpecial: z.boolean(),
  isNew: z.boolean(),
  isSpicy: z.boolean(),
  isAvailable: z.boolean(),
};

export const createItemSchema = z
  .object(itemFields)
  .partial()
  .extend({ categoryId: itemFields.categoryId, name: itemFields.name });

export const updateItemSchema = z
  .object(itemFields)
  .partial()
  .refine((d) => Object.keys(d).length > 0, "Nothing to update");

export const availabilitySchema = z.object({
  isAvailable: z.boolean({ error: "isAvailable must be true or false" }),
});
