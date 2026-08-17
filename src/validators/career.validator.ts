import { z } from "zod";

export const createGoalSchema = z.object({
  body: z.object({
    title: z.string().trim().min(1).max(200),
    area: z.enum(["SKILLS", "ROLE", "PROJECT", "CERTIFICATION"]),
    targetDate: z.string().datetime().optional(),
    notes: z.string().optional(),
  }),
});

export const updateGoalSchema = z.object({
  body: z.object({
    title: z.string().trim().min(1).max(200).optional(),
    area: z.enum(["SKILLS", "ROLE", "PROJECT", "CERTIFICATION"]).optional(),
    status: z.enum(["NOT_STARTED", "IN_PROGRESS", "COMPLETED", "ON_HOLD"]).optional(),
    progress: z.number().int().min(0).max(100).optional(),
    targetDate: z.string().datetime().optional(),
    notes: z.string().optional(),
  }),
});

export const createSkillSchema = z.object({
  body: z.object({
    name: z.string().trim().min(1).max(100),
    level: z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED", "EXPERT"]).optional(),
    progress: z.number().int().min(0).max(100).optional(),
    category: z.string().optional(),
    relatedGoalId: z.string().uuid().optional(),
  }),
});

export const updateSkillSchema = z.object({
  body: z.object({
    name: z.string().trim().min(1).max(100).optional(),
    level: z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED", "EXPERT"]).optional(),
    progress: z.number().int().min(0).max(100).optional(),
    category: z.string().optional(),
    relatedGoalId: z.string().uuid().optional(),
    lastPracticedAt: z.string().datetime().optional(),
  }),
});

export const createAchievementSchema = z.object({
  body: z.object({
    title: z.string().trim().min(1).max(200),
    type: z.enum(["CERTIFICATION", "AWARD", "PROMOTION", "PUBLICATION", "OTHER"]).optional(),
    issuer: z.string().optional(),
    date: z.string().datetime().optional(),
    description: z.string().optional(),
    credentialUrl: z.string().url().optional(),
  }),
});