import { Types } from "mongoose";
import { MenuCategory } from "../models/MenuCategory.js";
import { MenuItem } from "../models/MenuItem.js";
import { Order, type IOrderAddOn, type IOrderItem } from "../models/Order.js";
import type { CreateOrderInput } from "../validators/order.validators.js";

/** An error with an HTTP status, so the controller can answer with the right code */
export class OrderError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}

/**
 * Builds the order lines from the LIVE menu. The app only sends ids + quantities;
 * every name and price comes from the database, so totals can't be faked.
 */
export const buildOrderItems = async (restaurantId: string, lines: CreateOrderInput["items"]) => {
  const itemIds = [...new Set(lines.map((l) => l.itemId))];
  const items = await MenuItem.find({ _id: { $in: itemIds }, restaurantId });
  const activeCategoryIds = new Set(
    (await MenuCategory.find({ restaurantId, isActive: true }).select("_id")).map((c) => c.id as string),
  );

  const built: IOrderItem[] = [];

  for (const line of lines) {
    const item = items.find((i) => i.id === line.itemId);
    if (!item || !activeCategoryIds.has(String(item.categoryId))) {
      throw new OrderError("An item in your cart is no longer on the menu. Please update your cart.", 409);
    }
    if (!item.isAvailable) throw new OrderError(`"${item.name}" is sold out. Remove it from your cart.`, 409);

    // Size
    let basePrice: number;
    let size: { _id?: Types.ObjectId; name: string; price: number } | undefined;
    if (item.sizes.length > 0) {
      size = item.sizes.find((s) => String(s._id) === line.sizeId);
      if (!size) throw new OrderError(`Choose a size for "${item.name}"`, 409);
      basePrice = size.price;
    } else {
      basePrice = item.price ?? 0;
    }

    // Add-ons: every chosen option must exist, be in stock, and follow each group's min/max
    const chosen = new Set(line.addOnOptionIds);
    const addOns: IOrderAddOn[] = [];
    let matched = 0;
    for (const group of item.addOnGroups) {
      const picked = group.options.filter((o) => chosen.has(String(o._id)));
      matched += picked.length;
      if (picked.length < group.minSelect) {
        throw new OrderError(`"${item.name}": choose ${group.name}`, 409);
      }
      if (picked.length > group.maxSelect) {
        throw new OrderError(`"${item.name}": too many choices for ${group.name}`, 409);
      }
      for (const option of picked) {
        if (!option.isAvailable) throw new OrderError(`"${option.name}" is sold out. Please choose another.`, 409);
        addOns.push({
          groupId: group._id as Types.ObjectId,
          groupName: group.name,
          optionId: option._id as Types.ObjectId,
          name: option.name,
          price: option.price,
        });
      }
    }
    if (matched !== chosen.size) {
      throw new OrderError(`Some choices for "${item.name}" changed. Please add it to your cart again.`, 409);
    }

    const unitPrice = basePrice + addOns.reduce((sum, a) => sum + a.price, 0);
    const orderItem: IOrderItem = {
      itemId: item._id,
      name: item.name,
      basePrice,
      addOns,
      unitPrice,
      quantity: line.quantity,
      lineTotal: unitPrice * line.quantity,
    };
    if (item.image) orderItem.image = item.image;
    if (size?._id) {
      orderItem.sizeId = size._id;
      orderItem.sizeName = size.name;
    }
    if (line.note) orderItem.note = line.note;
    built.push(orderItem);
  }

  return { items: built, subtotal: built.reduce((sum, i) => sum + i.lineTotal, 0) };
};

/** Dine-in seats currently held by accepted (not yet finished) orders */
export const seatsInUse = async (restaurantId: string | Types.ObjectId) => {
  const [result] = await Order.aggregate<{ seats: number }>([
    { $match: { restaurantId: new Types.ObjectId(String(restaurantId)), "dineIn.seatsReserved": true } },
    { $group: { _id: null, seats: { $sum: "$dineIn.partySize" } } },
  ]);
  return result?.seats ?? 0;
};