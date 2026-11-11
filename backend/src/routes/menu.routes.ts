import { Router } from "express";
import {
  createCategory,
  createItem,
  deleteCategory,
  deleteItem,
  getItem,
  getMenu,
  removeItemImage,
  reorderCategories,
  reorderItems,
  setItemAvailability,
  updateCategory,
  updateItem,
  uploadItemImage,
} from "../controllers/menu.controller.js";
import { menuItemImageUpload } from "../middleware/upload.middleware.js";


const router = Router({ mergeParams: true });

router.get("/", getMenu);


router.put("/categories/order", reorderCategories);
router.post("/categories", createCategory);
router.patch("/categories/:categoryId", updateCategory);
router.delete("/categories/:categoryId", deleteCategory);
router.put("/categories/:categoryId/items/order", reorderItems);


router.post("/items", createItem);
router.get("/items/:itemId", getItem);
router.patch("/items/:itemId", updateItem);
router.patch("/items/:itemId/availability", setItemAvailability);
router.delete("/items/:itemId", deleteItem);
router.patch("/items/:itemId/image", menuItemImageUpload, uploadItemImage);
router.delete("/items/:itemId/image", removeItemImage);

export default router;