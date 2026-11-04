import { Router } from "express";
import { protect, authorize } from "../middleware/auth.middleware.js";
import {
  createRestaurant,
  getRestaurant,
  listRestaurants,
  setRestaurantStatus,
  updateRestaurant,
} from "../controllers/adminRestaurant.controller.js";

const router = Router();

// Every route below: logged in + Super Admin only
router.use(protect, authorize("superadmin"));

// Restaurants
router.post("/restaurants", createRestaurant);
router.get("/restaurants", listRestaurants);
router.get("/restaurants/:id", getRestaurant);
router.patch("/restaurants/:id", updateRestaurant);
router.patch("/restaurants/:id/status", setRestaurantStatus);

export default router;