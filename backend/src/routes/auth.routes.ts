import { Router } from "express";
import {
  confirmAccountDeletion,
  requestAccountDeletion,
} from "../controllers/accountDeletion.controller.js";
import {
  deleteAddress,
  listAddresses,
  saveAddress,
  updateAddress,
} from "../controllers/address.controller.js";
import {
  changePassword,
  completeProfile,
  getMe,
  logoutAllDevices,
  requestOtp,
  staffLogin,
  uploadAvatar,
  verifyOtp,
} from "../controllers/auth.controller.js";
import {
  requestContactChange,
  verifyContactChange,
} from "../controllers/customerContact.controller.js";
import {
  removePushToken,
  savePushToken,
} from "../controllers/pushToken.controller.js";
import { authorize, protect } from "../middleware/auth.middleware.js";
import { avatarUpload } from "../middleware/upload.middleware.js";
const router = Router();

router.post("/otp/request", requestOtp);
router.post("/otp/verify", verifyOtp);
router.patch(
  "/complete-profile",
  protect,
  authorize("customer"),
  completeProfile,
);
router.patch(
  "/avatar",
  protect,
  authorize("customer"),
  avatarUpload,
  uploadAvatar,
);
router.post(
  "/contact/request",
  protect,
  authorize("customer"),
  requestContactChange,
);
router.post(
  "/contact/verify",
  protect,
  authorize("customer"),
  verifyContactChange,
);
router.get("/addresses", protect, authorize("customer"), listAddresses);
router.post("/addresses", protect, authorize("customer"), saveAddress);
router.patch(
  "/addresses/:addressId",
  protect,
  authorize("customer"),
  updateAddress,
);
router.delete(
  "/addresses/:addressId",
  protect,
  authorize("customer"),
  deleteAddress,
);
// Delete my account (customers)
router.post(
  "/delete-account/request",
  protect,
  authorize("customer"),
  requestAccountDeletion,
);
router.post(
  "/delete-account/confirm",
  protect,
  authorize("customer"),
  confirmAccountDeletion,
);
router.post("/login", staffLogin);
router.patch(
  "/change-password",
  protect,
  authorize("superadmin", "manager"),
  changePassword,
);
router.get("/me", protect, getMe);
router.post("/logout-all", protect, logoutAllDevices);

router.post("/push-token", protect, savePushToken);
router.post("/push-token/remove", protect, removePushToken);

export default router;
