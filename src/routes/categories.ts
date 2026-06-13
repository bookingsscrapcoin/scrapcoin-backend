import { Router } from "express";
import { z } from "zod";
import { requireAdmin } from "../middleware/requireAdmin.js";
import {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} from "../db/store.js";

const categorySchema = z.object({
  id: z.string().trim().min(1).max(50),
  name: z.string().trim().min(1).max(100),
  unit: z.string().trim().default("kg"),
  price_per_unit: z.number().positive(),
});

const updateCategorySchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  unit: z.string().trim().optional(),
  price_per_unit: z.number().positive().optional(),
});

export const categoriesRouter = Router();

// GET /api/scrap-categories � public
categoriesRouter.get("/", async (_req, res) => {
  try {
    const categories = await getCategories();
    res.json(categories);
  } catch {
    res.status(500).json({ error: "Failed to fetch categories" });
  }
});

// POST /api/scrap-categories � admin only
categoriesRouter.post("/", requireAdmin, async (req, res) => {
  const parsed = categorySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: "Invalid category data",
      details: parsed.error.flatten(),
    });
  }
  try {
    const category = await createCategory(parsed.data);
    return res.status(201).json(category);
  } catch {
    return res.status(500).json({ error: "Failed to create category" });
  }
});

// PATCH /api/scrap-categories/:id � admin only
categoriesRouter.patch("/:id", requireAdmin, async (req, res) => {
  const parsed = updateCategorySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: "Invalid category data",
      details: parsed.error.flatten(),
    });
  }
  try {
    const category = await updateCategory(String(req.params.id), parsed.data);
    if (!category) return res.status(404).json({ error: "Category not found" });
    return res.json(category);
  } catch {
    return res.status(500).json({ error: "Failed to update category" });
  }
});

// DELETE /api/scrap-categories/:id � admin only
categoriesRouter.delete("/:id", requireAdmin, async (req, res) => {
  try {
    await deleteCategory(String(req.params.id));
    return res.json({ message: "Category deleted successfully" });
  } catch {
    return res.status(500).json({ error: "Failed to delete category" });
  }
});
