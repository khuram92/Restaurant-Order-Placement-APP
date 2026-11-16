import { Router } from "express";
import {
  clearMyNotifications,
  listMyNotifications,
  markAllRead,
  markRead,
  unreadCount,
} from "../controllers/notification.controller.js";
import { protect } from "../middleware/auth.middleware.js";

// Mounted at /api/notifications — every logged-in user sees only their own
const router = Router();
router.use(protect);

router.get("/", listMyNotifications);
router.get("/unread-count", unreadCount);
router.patch("/read-all", markAllRead); // before "/:id/read"
router.patch("/:id/read", markRead);
router.delete("/", clearMyNotifications);

export default router;