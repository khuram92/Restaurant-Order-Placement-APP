import { Router } from "express";
import { getRestaurant, getRestaurantMenu, listRestaurants } from "../controllers/customerRestaurant.controller.js";
import { protect } from "../middleware/auth.middleware.js";

const router = Router();

// Any logged-in user can browse (customers mainly)
router.use(protect);

router.get("/", listRestaurants);
router.get("/:id", getRestaurant);
router.get("/:id/menu", getRestaurantMenu);

export default router;