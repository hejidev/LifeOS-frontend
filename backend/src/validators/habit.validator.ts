import { z } from "zod";

const category = z.enum(["health", "focus", "learning", "finance", "other"]);
const colorHex = z.string().regex(/^#[0-9a-fA-F]{6}$/);

export const createHabitSchema = z.object({
  body: z.object({
    title: z.string().trim().min(1).max(160),
    description: z.string().max(500).optional(),
    frequency: z.enum(["daily", "weekly"]).default("daily"),
    category: category.default("other"),
    colorHex: colorHex.optional(),
  }),
});

export const updateHabitSchema = z.object({
  body: z.object({
    title: z.string().trim().min(1).max(160).optional(),
    description: z.string().max(500).optional(),
    frequency: z.enum(["daily", "weekly"]).optional(),
    category: category.optional(),
    colorHex: colorHex.optional(),
    archived: z.boolean().optional(),
  }),
});

export const toggleHabitSchema = z.object({
  body: z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional() }).default({}),
});