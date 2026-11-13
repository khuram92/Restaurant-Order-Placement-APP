import { Router } from "express";
import {
  getMyRestaurant,
  setTemporarilyClosed,
  updateMyRestaurant,
  uploadMyRestaurantImages,
} from "../controllers/managerRestaurant.controller.js";
import { authorize, protect } from "../middleware/auth.middleware.js";
import { managerMenuAccess } from "../middleware/menuAccess.middleware.js";
import { restaurantImagesUpload } from "../middleware/upload.middleware.js";
import menuRoutes from "./menu.routes.js";
import managerOrderRoutes from "./managerOrder.routes.js";

const router = Router();


router.use(protect, authorize("manager"));

// Own restaurant
router.get("/restaurant", getMyRestaurant);
router.patch("/restaurant", updateMyRestaurant);
router.patch("/restaurant/images", restaurantImagesUpload, uploadMyRestaurantImages);
router.patch("/restaurant/temporary-close", setTemporarilyClosed);


router.use("/menu", managerMenuAccess, menuRoutes);
router.use("/orders", managerOrderRoutes);
export default router;