import { Router } from "express";
import {
  createCategory,
  createItem,
  deleteCategory,
  deleteItem,
  getItem,
  getMenu,
  reorderCategories,
  reorderItems,
  setItemAvailability,
  updateCategory,
  updateItem,
} from "../controllers/menu.controller.js";


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

export default router;