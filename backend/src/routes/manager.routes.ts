import { Router } from "express";
import { authorize, protect } from "../middleware/auth.middleware.js";
import { managerMenuAccess } from "../middleware/menuAccess.middleware.js";
import menuRoutes from "./menu.routes.js";

const router = Router();


router.use(protect, authorize("manager"));

router.use("/menu", managerMenuAccess, menuRoutes);

export default router;