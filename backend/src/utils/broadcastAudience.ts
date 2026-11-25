import { Types } from "mongoose";
import { Order } from "../models/Order.js";
import { User } from "../models/User.js";
import type { BroadcastAudienceInput } from "../validators/broadcast.validators.js";


export const resolveRecipients = async (input: BroadcastAudienceInput) => {
  const wantCustomers =
    input.audience === "everyone" ||
    input.audience === "customers" ||
    (input.audience === "restaurants" && input.restaurantTarget !== "managers");
  const wantManagers =
    input.audience === "everyone" ||
    input.audience === "managers" ||
    (input.audience === "restaurants" && input.restaurantTarget !== "customers");

  const restaurantIds = (input.restaurantIds ?? []).map((id) => new Types.ObjectId(id));
  const byRestaurant = input.audience === "restaurants";

  
  const managerIds = wantManagers
    ? (
        await User.find({
          role: "manager",
          isActive: true,
          ...(byRestaurant && { restaurantId: { $in: restaurantIds } }),
        }).select("_id")
      ).map((u) => u._id)
    : [];

  
  let customerIds: Types.ObjectId[] = [];
  let optedOut = 0;
  if (wantCustomers) {
    const orderedIds = byRestaurant
      ? await Order.distinct("customerId", { restaurantId: { $in: restaurantIds } })
      : [];
    const base = {
      role: "customer" as const,
      isActive: true,
      ...(byRestaurant && {
        $or: [{ _id: { $in: orderedIds } }, { favoriteRestaurants: { $in: restaurantIds } }],
      }),
    };

    customerIds = (
      await User.find({ ...base, allowPromotions: { $ne: false } }).select("_id")
    ).map((u) => u._id);
    optedOut = await User.countDocuments({ ...base, allowPromotions: false });
  }

  return { customerIds, managerIds, optedOut };
};