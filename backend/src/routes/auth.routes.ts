import { Router } from "express";
import {
  staffLogin,
  getMe,
  requestOtp,
  verifyOtp,
  completeProfile,
  uploadAvatar,
  changePassword,
} from "../controllers/auth.controller.js";
import { authorize, protect } from "../middleware/auth.middleware.js";
import { avatarUpload } from "../middleware/upload.middleware.js";

const router = Router();
// Customers (OTP)
router.post("/otp/request", requestOtp);
router.post("/otp/verify", verifyOtp);
router.patch("/complete-profile", protect, authorize("customer"), completeProfile);
router.patch("/avatar", protect, authorize("customer"), avatarUpload, uploadAvatar);
router.post("/login", staffLogin);
router.patch("/change-password", protect, authorize("superadmin", "manager"), changePassword);
router.get("/me", protect, getMe);

export default router;