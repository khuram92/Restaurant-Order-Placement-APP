import { Router } from "express";
import {
  addFavorite,
  getRestaurant,
  getRestaurantMenu,
  getSeatAvailability,
  listFavorites,
  listRestaurants,
  removeFavorite,
} from "../controllers/customerRestaurant.controller.js";
import { authorize, protect } from "../middleware/auth.middleware.js";
import { listRestaurantReviews } from "../controllers/review.controller.js";

const router = Router();

// Any logged-in user can browse (customers mainly)
router.use(protect);

router.get("/", listRestaurants);
router.get("/favorites", authorize("customer"), listFavorites);
router.post("/:id/favorite", authorize("customer"), addFavorite);
router.delete("/:id/favorite", authorize("customer"), removeFavorite);
router.get("/:id", getRestaurant);
router.get("/:id/menu", getRestaurantMenu);
router.get("/:id/seats", getSeatAvailability);
router.get("/:id/reviews", listRestaurantReviews);
export default router;