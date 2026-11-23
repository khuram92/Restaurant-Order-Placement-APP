import { Router } from "express";
import { chat } from "../controllers/assistant.controller.js";
import { authorize, protect } from "../middleware/auth.middleware.js";

const router = Router();

router.use(protect, authorize("customer"));
router.post("/chat", chat);

export default router;
