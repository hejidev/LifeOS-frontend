import { z } from "zod";
import { webUrl } from "../lib/safe-url";

const area = z.enum(["SKILLS", "ROLE", "PROJECT", "CERTIFICATION"]);
const level = z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED", "EXPERT"]);
const notes = z.string().trim().max(2000);

export const createGoalSchema = z.object({
  body: z.object({ title: z.string().trim().min(1).max(200), area, targetDate: z.string().datetime().optional(), notes: notes.optional() }),
});

export const updateGoalSchema = z.object({
  body: z.object({
    title: z.string().trim().min(1).max(200).optional(),
    area: area.optional(),
    status: z.enum(["NOT_STARTED", "IN_PROGRESS", "COMPLETED", "ON_HOLD"]).optional(),
    progress: z.number().int().min(0).max(100).optional(),
    targetDate: z.string().datetime().nullable().optional(),
    notes: notes.nullable().optional(),
  }),
});

export const createSkillSchema = z.object({
  body: z.object({
    name: z.string().trim().min(1).max(100),
    level: level.optional(),
    progress: z.number().int().min(0).max(100).optional(),
    category: z.string().trim().max(60).optional(),
    relatedGoalId: z.string().uuid().optional(),
  }),
});

export const updateSkillSchema = z.object({
  body: z.object({
    name: z.string().trim().min(1).max(100).optional(),
    level: level.optional(),
    progress: z.number().int().min(0).max(100).optional(),
    category: z.string().trim().max(60).optional(),
    relatedGoalId: z.string().uuid().nullable().optional(),
    lastPracticedAt: z.string().datetime().optional(),
  }),
});

export const createAchievementSchema = z.object({
  body: z.object({
    title: z.string().trim().min(1).max(200),
    type: z.enum(["CERTIFICATION", "AWARD", "PROMOTION", "PUBLICATION", "OTHER"]).optional(),
    issuer: z.string().trim().max(120).optional(),
    date: z.string().datetime().optional(),
    description: notes.optional(),
    credentialUrl: webUrl.optional(),
  }),
});