import type { NextFunction, Request, Response } from "express";
import mongoose from "mongoose";
import { Restaurant } from "../models/Restaurant.js";




export const managerMenuAccess = (req: Request, res: Response, next: NextFunction) => {
  const restaurantId = req.user?.restaurantId;
  if (!restaurantId) {
    return res.status(403).json({ message: "You're not assigned to a restaurant" });
  }
  res.locals.restaurantId = String(restaurantId);
  next();
};


export const adminMenuAccess = async (req: Request, res: Response, next: NextFunction) => {
  const restaurantId = String(req.params.restaurantId);
  if (!mongoose.isValidObjectId(restaurantId)) {
    return res.status(400).json({ message: "Invalid restaurant id" });
  }
  if (!(await Restaurant.exists({ _id: restaurantId }))) {
    return res.status(404).json({ message: "Restaurant not found" });
  }
  res.locals.restaurantId = restaurantId;
  next();
};