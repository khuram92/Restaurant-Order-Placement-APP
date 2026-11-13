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
import { requestContactChange, verifyContactChange } from "../controllers/customerContact.controller.js";
import { removePushToken, savePushToken } from "../controllers/pushToken.controller.js";

const router = Router();
// Customers (OTP)
router.post("/otp/request", requestOtp);
router.post("/otp/verify", verifyOtp);
router.patch("/complete-profile", protect, authorize("customer"), completeProfile);
router.patch("/avatar", protect, authorize("customer"), avatarUpload, uploadAvatar);
router.post("/contact/request", protect, authorize("customer"), requestContactChange);
router.post("/contact/verify", protect, authorize("customer"), verifyContactChange);
router.post("/login", staffLogin);
router.patch("/change-password", protect, authorize("superadmin", "manager"), changePassword);
router.get("/me", protect, getMe);
// Push notifications (every role)
router.post("/push-token", protect, savePushToken);
router.post("/push-token/remove", protect, removePushToken);

export default router;