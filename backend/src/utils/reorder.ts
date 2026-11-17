import { MenuCategory } from "../models/MenuCategory.js";
import { MenuItem } from "../models/MenuItem.js";
import type { IOrderItem } from "../models/Order.js";

/** One cart line, in the same shape the app's cart uses */
export interface ReorderLine {
  itemId: string;
  name: string;
  image?: string;
  sizeId?: string;
  sizeName?: string;
  basePrice: number;
  addOns: { groupId: string; groupName: string; optionId: string; name: string; price: number }[];
  unitPrice: number;
  quantity: number;
  note?: string;
}

/**
 * Rebuilds an old order's lines from the LIVE menu.
 * Unlike checkout this is forgiving: lines that can't be made again are skipped
 * (with a reason), sold-out extras are dropped, and prices are today's prices.
 */
export const rebuildOrderLines = async (restaurantId: string, oldItems: IOrderItem[]) => {
  const [items, activeCategories] = await Promise.all([
    MenuItem.find({ _id: { $in: oldItems.map((i) => i.itemId) }, restaurantId }),
    MenuCategory.find({ restaurantId, isActive: true }).select("_id"),
  ]);
  const activeCategoryIds = new Set(activeCategories.map((c) => String(c._id)));

  const lines: ReorderLine[] = [];
  const skipped: { name: string; reason: string }[] = [];
  let priceChanged = false;

  for (const old of oldItems) {
    const item = items.find((i) => String(i._id) === String(old.itemId));
    if (!item || !activeCategoryIds.has(String(item.categoryId))) {
      skipped.push({ name: old.name, reason: "no longer on the menu" });
      continue;
    }
    if (!item.isAvailable) {
      skipped.push({ name: item.name, reason: "sold out" });
      continue;
    }

    // Size: must still exist
    let basePrice = item.price ?? 0;
    let size: { _id?: unknown; name: string; price: number } | undefined;
    if (item.sizes.length > 0) {
      size = item.sizes.find((s) => String(s._id) === String(old.sizeId));
      if (!size) {
        skipped.push({ name: item.name, reason: "sizes have changed" });
        continue;
      }
      basePrice = size.price;
    }

    // Add-ons: keep the ones still on offer, then check each group's rules
    const oldOptionIds = new Set(old.addOns.map((a) => String(a.optionId)));
    const addOns: ReorderLine["addOns"] = [];
    let groupsOk = true;
    for (const group of item.addOnGroups) {
      const picked = group.options.filter(
        (o) => oldOptionIds.has(String(o._id)) && o.isAvailable,
      );
      if (picked.length < group.minSelect || picked.length > group.maxSelect) {
        groupsOk = false;
        break;
      }
      for (const o of picked) {
        addOns.push({
          groupId: String(group._id),
          groupName: group.name,
          optionId: String(o._id),
          name: o.name,
          price: o.price,
        });
      }
    }
    if (!groupsOk) {
      skipped.push({ name: item.name, reason: "its choices have changed" });
      continue;
    }

    const unitPrice = basePrice + addOns.reduce((sum, a) => sum + a.price, 0);
    if (unitPrice !== old.unitPrice || addOns.length !== old.addOns.length) priceChanged = true;

    const line: ReorderLine = {
      itemId: String(item._id),
      name: item.name,
      basePrice,
      addOns,
      unitPrice,
      quantity: old.quantity,
    };
    if (item.image) line.image = item.image;
    if (size) {
      line.sizeId = String(size._id);
      line.sizeName = size.name;
    }
    if (old.note) line.note = old.note;
    lines.push(line);
  }

  return { lines, skipped, priceChanged };
};