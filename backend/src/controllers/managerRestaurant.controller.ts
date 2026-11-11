import type { Request, Response } from "express";
import { Restaurant } from "../models/Restaurant.js";
import { isOpenNow } from "../utils/openingHours.js";

/** GET /api/manager/restaurant — the manager's own restaurant (+ isOpenNow) */
export const getMyRestaurant = async (req: Request, res: Response) => {
  const restaurant = await Restaurant.findById(req.user?.restaurantId).select("-createdBy");
  if (!restaurant) {
    return res.status(404).json({ message: "Your restaurant wasn't found. Contact the admin." });
  }

  res.json({
    restaurant: { ...restaurant.toJSON(), isOpenNow: isOpenNow(restaurant.openingHours) },
  });
};