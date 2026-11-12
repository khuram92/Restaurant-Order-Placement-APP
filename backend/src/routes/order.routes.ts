import { Router } from "express";
import { cancelMyOrder, createOrder, getMyOrder, listMyOrders } from "../controllers/customerOrder.controller.js";
import { authorize, protect } from "../middleware/auth.middleware.js";

const router = Router();

// Customers only
router.use(protect, authorize("customer"));

router.post("/", createOrder);
router.get("/", listMyOrders);
router.get("/:id", getMyOrder);
router.patch("/:id/cancel", cancelMyOrder);

export default router;