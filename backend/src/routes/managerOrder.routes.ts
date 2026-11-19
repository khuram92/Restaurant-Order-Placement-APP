import { Router } from "express";
import {
  delayOrder,
  getRestaurantOrder,
  listRestaurantOrders,
  updateOrderStatus,
} from "../controllers/managerOrder.controller.js";

// Mounted at /api/manager/orders (protect + authorize("manager") already run in manager.routes)
const router = Router();

router.get("/", listRestaurantOrders);
router.get("/:id", getRestaurantOrder);
router.patch("/:id/status", updateOrderStatus);
router.patch("/:id/delay", delayOrder);

export default router;