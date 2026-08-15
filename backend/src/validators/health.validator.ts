import { z } from "zod";

export const logHealthSchema = z.object({
  body: z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    sleepHours: z.number().min(0).max(24).optional(),
    steps: z.number().int().min(0).optional(),
    waterGlasses: z.number().int().min(0).optional(),
    workoutDone: z.boolean().optional(),
    notes: z.string().optional(),
  }),
});

export const createHabitSchema = z.object({
  body: z.object({
    title: z.string().trim().min(1).max(100),
    description: z.string().optional(),
    frequency: z.enum(["daily", "weekly"]).default("daily"),
    category: z.enum(["health", "focus", "learning", "finance"]).optional(),
  }),
});