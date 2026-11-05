import { Router } from "express";
import { protect, authorize } from "../middleware/auth.middleware.js";
import {
  createRestaurant,
  deleteRestaurant,
  getRestaurant,
  listRestaurants,
  setRestaurantStatus,
  updateRestaurant,
  uploadRestaurantImages,
} from "../controllers/adminRestaurant.controller.js";
import { restaurantImagesUpload } from "../middleware/upload.middleware.js";
import {
  createManager,
  deleteManager,
  getManager,
  listManagers,
  resetManagerPassword,
  restaurantOptions,
  setManagerStatus,
  updateManager,
} from "../controllers/adminManager.controller.js";
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
router.delete("/restaurants/:id", deleteRestaurant);
// Managers ("restaurant-options" must come before "/:id")
router.get("/managers/restaurant-options", restaurantOptions);
router.get("/managers", listManagers);
router.post("/managers", createManager);
router.get("/managers/:id", getManager);
router.patch("/managers/:id", updateManager);
router.patch("/managers/:id/status", setManagerStatus);
router.post("/managers/:id/reset-password", resetManagerPassword);
router.delete("/managers/:id", deleteManager);

export default router;