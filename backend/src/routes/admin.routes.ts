import { Router } from "express";
import { protect, authorize } from "../middleware/auth.middleware.js";
import {
  createRestaurant,
  getRestaurant,
  listRestaurants,
  setRestaurantStatus,
  updateRestaurant,
  uploadRestaurantImages,
} from "../controllers/adminRestaurant.controller.js";
import { restaurantImagesUpload } from "../middleware/upload.middleware.js";
const router = Router();

// Every route below: logged in + Super Admin only
router.use(protect, authorize("superadmin"));

// Restaurants
router.post("/restaurants", createRestaurant);
router.get("/restaurants", listRestaurants);
router.get("/restaurants/:id", getRestaurant);
router.patch("/restaurants/:id", updateRestaurant);
router.patch("/restaurants/:id/status", setRestaurantStatus);
router.patch("/restaurants/:id/images", restaurantImagesUpload, uploadRestaurantImages);
export default router;