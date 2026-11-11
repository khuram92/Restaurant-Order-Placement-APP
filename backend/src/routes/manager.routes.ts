import { Router } from "express";
import { authorize, protect } from "../middleware/auth.middleware.js";
import { managerMenuAccess } from "../middleware/menuAccess.middleware.js";
import { getMyRestaurant } from "../controllers/managerRestaurant.controller.js";
import menuRoutes from "./menu.routes.js";

const router = Router();

// Every route below: logged in + manager only
router.use(protect, authorize("manager"));

router.get("/restaurant", getMyRestaurant);
router.use("/menu", managerMenuAccess, menuRoutes);

export default router;