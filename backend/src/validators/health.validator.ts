import { z } from "zod";

export const logHealthSchema = z.object({
  body: z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    sleepHours: z.number().min(0).max(24).optional(),
    steps: z.number().int().min(0).max(100_000).optional(),
    waterGlasses: z.number().int().min(0).max(30).optional(),
    workoutDone: z.boolean().optional(),
    notes: z.string().max(500).optional(),
  }),
});