import { z } from "zod";

export const createHabitSchema = z.object({
  body: z.object({
    title: z.string().trim().min(1).max(160),
    description: z.string().max(500).optional(),
    frequency: z.enum(["daily", "weekly"]).default("daily"),
    category: z.enum(["health", "focus", "learning", "finance", "other"]).default("other"),
    colorHex: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  }),
});

export const updateHabitSchema = z.object({
  body: z.object({
    title: z.string().trim().min(1).max(160).optional(),
    description: z.string().max(500).optional(),
    frequency: z.enum(["daily", "weekly"]).optional(),
    category: z.enum(["health", "focus", "learning", "finance", "other"]).optional(),
    colorHex: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
    archived: z.boolean().optional(),
  }),
});