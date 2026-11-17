import { Router } from "express";
import {
  cancelMyOrder,
  createOrder,
  getMyOrder,
  listMyOrders,
  reorderPreview,
} from "../controllers/customerOrder.controller.js";
import {
  createReview,
  getMyOrderReview,
  listMyReviews
} from "../controllers/review.controller.js";
import { authorize, protect } from "../middleware/auth.middleware.js";

const router = Router();

// Customers only
router.use(protect, authorize("customer"));

router.post("/", createOrder);
router.get("/", listMyOrders);
router.get("/reviews/mine", listMyReviews);
router.get("/:id", getMyOrder);
router.patch("/:id/cancel", cancelMyOrder);
router.get("/:id/reorder", reorderPreview);  
router.get("/:id/review", getMyOrderReview);
router.post("/:id/review", createReview); 

export default router;
