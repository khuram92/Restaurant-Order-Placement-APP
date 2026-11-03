import { Router } from "express";
import { staffLogin, getMe } from "../controllers/auth.controller.js";
import { protect } from "../middleware/auth.middleware.js";

const router = Router();

router.post("/login", staffLogin);
router.get("/me", protect, getMe);

export default router;