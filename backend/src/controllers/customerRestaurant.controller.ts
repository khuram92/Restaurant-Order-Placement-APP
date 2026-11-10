import type { Request, Response } from "express";
import { Restaurant, type RestaurantDoc } from "../models/Restaurant.js";
import { User } from "../models/User.js";
import { isOpenNow } from "../utils/openingHours.js";
import { customerListQuerySchema } from "../validators/customerRestaurant.validators.js";
import mongoose from "mongoose";


const firstIssue = (error: { issues: { message: string }[] }) =>
  error.issues[0]?.message ?? "Invalid input";
const escapeRegex = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Fields customers never need */
const HIDDEN_FIELDS = "-createdBy -email -isActive";

/** Restaurant JSON + isOpenNow */
const toCustomerJSON = (restaurant: RestaurantDoc) => ({
  ...restaurant.toJSON(),
  isOpenNow: isOpenNow(restaurant.openingHours),
});


export const listRestaurants = async (req: Request, res: Response) => {
  const parsed = customerListQuerySchema.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ message: firstIssue(parsed.error) });
  const { search, city, service, page, limit } = parsed.data;

  const managed = await User.distinct("restaurantId", { role: "manager", isActive: true });

  const filter: Record<string, unknown> = { isActive: true, _id: { $in: managed } };
  if (city) filter["address.city"] = new RegExp(`^${escapeRegex(city)}$`, "i");
  if (service) filter[`services.${service}`] = true;
  if (search) {
    const term = new RegExp(escapeRegex(search), "i");
    filter.$or = [{ name: term }, { cuisines: term }, { "address.area": term }, { "address.city": term }];
  }

  const [restaurants, total] = await Promise.all([
    Restaurant.find(filter)
      .select(HIDDEN_FIELDS)
      .sort({ name: 1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Restaurant.countDocuments(filter),
  ]);

  res.json({
    restaurants: restaurants.map(toCustomerJSON),
    total,
    page,
    pages: Math.max(1, Math.ceil(total / limit)),
  });
};



export const getRestaurant = async (req: Request, res: Response) => {
  const id = String(req.params.id);
  if (!mongoose.isValidObjectId(id)) {
    return res.status(400).json({ message: "Invalid restaurant id" });
  }

  const [restaurant, hasManager] = await Promise.all([
    Restaurant.findOne({ _id: id, isActive: true }).select(HIDDEN_FIELDS),
    User.exists({ role: "manager", isActive: true, restaurantId: id }),
  ]);

  if (!restaurant || !hasManager) {
    return res.status(404).json({ message: "This restaurant isn't available right now" });
  }

  res.json({ restaurant: toCustomerJSON(restaurant) });
};