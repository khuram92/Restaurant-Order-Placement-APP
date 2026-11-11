import type { Request, Response } from "express";
import mongoose from "mongoose";
import { MenuCategory } from "../models/MenuCategory.js";
import { MenuItem } from "../models/MenuItem.js";
import {
  deleteMenuItemImage,
  uploadMenuItemImage,
} from "../utils/cloudinary.js";
import {
  availabilitySchema,
  createCategorySchema,
  createItemSchema,
  reorderSchema,
  updateCategorySchema,
  updateItemSchema,
} from "../validators/menu.validators.js";

const firstIssue = (error: { issues: { message: string }[] }) =>
  error.issues[0]?.message ?? "Invalid input";
const restaurantOf = (res: Response) => String(res.locals.restaurantId);
const CASE_INSENSITIVE = { locale: "en", strength: 2 };

const findCategoryOr404 = async (req: Request, res: Response) => {
  const id = String(req.params.categoryId);
  if (!mongoose.isValidObjectId(id)) {
    res.status(400).json({ message: "Invalid category id" });
    return null;
  }
  const category = await MenuCategory.findOne({
    _id: id,
    restaurantId: restaurantOf(res),
  });
  if (!category) res.status(404).json({ message: "Category not found" });
  return category;
};

const findItemOr404 = async (req: Request, res: Response) => {
  const id = String(req.params.itemId);
  if (!mongoose.isValidObjectId(id)) {
    res.status(400).json({ message: "Invalid item id" });
    return null;
  }
  const item = await MenuItem.findOne({
    _id: id,
    restaurantId: restaurantOf(res),
  });
  if (!item) res.status(404).json({ message: "Menu item not found" });
  return item;
};

const nameTaken = (restaurantId: string, name: string, exceptId?: string) =>
  MenuCategory.exists({
    restaurantId,
    name,
    ...(exceptId && { _id: { $ne: exceptId } }),
  }).collation(CASE_INSENSITIVE);

const nextSortOrder = async (
  model: "category" | "item",
  filter: Record<string, unknown>,
) => {
  const last =
    model === "category"
      ? await MenuCategory.findOne(filter)
          .sort({ sortOrder: -1 })
          .select("sortOrder")
      : await MenuItem.findOne(filter)
          .sort({ sortOrder: -1 })
          .select("sortOrder");
  return (last?.sortOrder ?? -1) + 1;
};

const applyFields = (
  doc: { set: (path: string, value: unknown) => unknown },
  fields: object,
) => {
  for (const [key, value] of Object.entries(fields)) {
    if (value === undefined) continue;
    doc.set(key, value === "" || value === null ? undefined : value);
  }
};

export const getMenu = async (_req: Request, res: Response) => {
  const restaurantId = restaurantOf(res);
  const [categories, items] = await Promise.all([
    MenuCategory.find({ restaurantId }).sort({ sortOrder: 1, createdAt: 1 }),
    MenuItem.find({ restaurantId }).sort({ sortOrder: 1, createdAt: 1 }),
  ]);

  res.json({
    categories: categories.map((c) => ({
      ...c.toJSON(),
      items: items.filter((i) => String(i.categoryId) === c.id),
    })),
  });
};

export const createCategory = async (req: Request, res: Response) => {
  const parsed = createCategorySchema.safeParse(req.body);
  if (!parsed.success)
    return res.status(400).json({ message: firstIssue(parsed.error) });
  const restaurantId = restaurantOf(res);

  if (await nameTaken(restaurantId, parsed.data.name)) {
    return res
      .status(409)
      .json({ message: "A category with this name already exists" });
  }

  const category = new MenuCategory({
    restaurantId,
    sortOrder: await nextSortOrder("category", { restaurantId }),
  });
  applyFields(category, parsed.data);
  await category.save();

  res.status(201).json({ category });
};

export const updateCategory = async (req: Request, res: Response) => {
  const parsed = updateCategorySchema.safeParse(req.body);
  if (!parsed.success)
    return res.status(400).json({ message: firstIssue(parsed.error) });

  const category = await findCategoryOr404(req, res);
  if (!category) return;

  if (
    parsed.data.name &&
    (await nameTaken(restaurantOf(res), parsed.data.name, category.id))
  ) {
    return res
      .status(409)
      .json({ message: "A category with this name already exists" });
  }

  applyFields(category, parsed.data);
  await category.save();
  res.json({ category });
};

export const deleteCategory = async (req: Request, res: Response) => {
  const category = await findCategoryOr404(req, res);
  if (!category) return;

  const itemCount = await MenuItem.countDocuments({ categoryId: category._id });
  if (itemCount > 0) {
    return res.status(409).json({
      message: `"${category.name}" has ${itemCount} item${itemCount === 1 ? "" : "s"}. Move or delete them first.`,
    });
  }

  await category.deleteOne();
  res.json({ message: `"${category.name}" was deleted` });
};

export const reorderCategories = async (req: Request, res: Response) => {
  const parsed = reorderSchema.safeParse(req.body);
  if (!parsed.success)
    return res.status(400).json({ message: firstIssue(parsed.error) });
  const restaurantId = restaurantOf(res);
  const { ids } = parsed.data;

  const total = await MenuCategory.countDocuments({ restaurantId });
  const matching = await MenuCategory.countDocuments({
    restaurantId,
    _id: { $in: ids },
  });
  if (
    new Set(ids).size !== ids.length ||
    matching !== ids.length ||
    ids.length !== total
  ) {
    return res
      .status(400)
      .json({ message: "Send every category of this menu exactly once" });
  }

  await MenuCategory.bulkWrite(
    ids.map((id, index) => ({
      updateOne: {
        filter: { _id: id, restaurantId },
        update: { $set: { sortOrder: index } },
      },
    })),
  );
  res.json({ message: "Order saved" });
};

export const getItem = async (req: Request, res: Response) => {
  const item = await findItemOr404(req, res);
  if (!item) return;
  res.json({ item });
};

export const createItem = async (req: Request, res: Response) => {
  const parsed = createItemSchema.safeParse(req.body);
  if (!parsed.success)
    return res.status(400).json({ message: firstIssue(parsed.error) });
  const restaurantId = restaurantOf(res);
  const { categoryId } = parsed.data;

  if (!(await MenuCategory.exists({ _id: categoryId, restaurantId }))) {
    return res.status(404).json({ message: "Category not found" });
  }

  const item = new MenuItem({
    restaurantId,
    sortOrder: await nextSortOrder("item", { restaurantId, categoryId }),
  });
  applyFields(item, parsed.data);
  await item.save(); // model checks price/sizes and add-on rules

  res.status(201).json({ item });
};

export const updateItem = async (req: Request, res: Response) => {
  const parsed = updateItemSchema.safeParse(req.body);
  if (!parsed.success)
    return res.status(400).json({ message: firstIssue(parsed.error) });

  const item = await findItemOr404(req, res);
  if (!item) return;
  const { categoryId } = parsed.data;

  if (categoryId && categoryId !== String(item.categoryId)) {
    const restaurantId = restaurantOf(res);
    if (!(await MenuCategory.exists({ _id: categoryId, restaurantId }))) {
      return res.status(404).json({ message: "Category not found" });
    }
    item.sortOrder = await nextSortOrder("item", { restaurantId, categoryId });
  }

  applyFields(item, parsed.data);
  await item.save();
  res.json({ item });
};

export const setItemAvailability = async (req: Request, res: Response) => {
  const parsed = availabilitySchema.safeParse(req.body);
  if (!parsed.success)
    return res.status(400).json({ message: firstIssue(parsed.error) });

  const item = await findItemOr404(req, res);
  if (!item) return;

  item.isAvailable = parsed.data.isAvailable;
  await item.save();
  res.json({ item });
};

export const deleteItem = async (req: Request, res: Response) => {
  const item = await findItemOr404(req, res);
  if (!item) return;

  const hadImage = !!item.image;
  await item.deleteOne();

  // A Cloudinary problem shouldn't undo the delete
  if (hadImage) {
    try {
      await deleteMenuItemImage(restaurantOf(res), item.id);
    } catch (error) {
      console.error(
        "⚠️ Couldn't delete menu item photo:",
        (error as Error).message,
      );
    }
  }

  res.json({ message: `"${item.name}" was deleted` });
};
export const uploadItemImage = async (req: Request, res: Response) => {
  if (!req.file) return res.status(400).json({ message: "Choose a photo" });

  const item = await findItemOr404(req, res);
  if (!item) return;

  try {
    const result = await uploadMenuItemImage(
      req.file.buffer,
      restaurantOf(res),
      item.id,
    );
    item.image = `${result.secure_url}?v=${result.version}`; // ?v= skips the phone's cached old photo
    await item.save();
    res.json({ item });
  } catch (error) {
    console.error(
      "❌ Menu item photo upload failed:",
      (error as Error).message,
    );
    res
      .status(502)
      .json({ message: "Couldn't upload the photo. Please try again." });
  }
};
export const removeItemImage = async (req: Request, res: Response) => {
  const item = await findItemOr404(req, res);
  if (!item) return;
  if (!item.image) return res.json({ item });

  try {
    await deleteMenuItemImage(restaurantOf(res), item.id);
  } catch (error) {
    console.error(
      "⚠️ Couldn't delete menu item photo:",
      (error as Error).message,
    );
  }

  item.set("image", undefined);
  await item.save();
  res.json({ item });
};
export const reorderItems = async (req: Request, res: Response) => {
  const parsed = reorderSchema.safeParse(req.body);
  if (!parsed.success)
    return res.status(400).json({ message: firstIssue(parsed.error) });

  const category = await findCategoryOr404(req, res);
  if (!category) return;
  const { ids } = parsed.data;

  const total = await MenuItem.countDocuments({ categoryId: category._id });
  const matching = await MenuItem.countDocuments({
    categoryId: category._id,
    _id: { $in: ids },
  });
  if (
    new Set(ids).size !== ids.length ||
    matching !== ids.length ||
    ids.length !== total
  ) {
    return res
      .status(400)
      .json({ message: "Send every item of this category exactly once" });
  }

  await MenuItem.bulkWrite(
    ids.map((id, index) => ({
      updateOne: {
        filter: { _id: id, categoryId: category._id },
        update: { $set: { sortOrder: index } },
      },
    })),
  );
  res.json({ message: "Order saved" });
};
