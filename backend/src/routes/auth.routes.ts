import { Router } from "express";
import { staffLogin, getMe, requestOtp, verifyOtp } from "../controllers/auth.controller.js";
import { protect } from "../middleware/auth.middleware.js";

const router = Router();
// Customers (OTP)
router.post("/otp/request", requestOtp);
router.post("/otp/verify", verifyOtp);
router.post("/login", staffLogin);
router.get("/me", protect, getMe);

export default router;