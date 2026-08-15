import { z } from "zod";

const materialTypeEnum = z.enum([
  "BOOK", "ARTICLE", "VIDEO", "COURSE", "PODCAST", "PDF", "NOTE", "IMAGE", "DOCUMENT",
]);

export const createSubjectSchema = z.object({
  body: z.object({
    name: z.string().trim().min(1).max(100),
    color: z.string().optional(),
    description: z.string().optional(),
  }),
});

export const updateSubjectSchema = z.object({
  body: z.object({
    name: z.string().trim().min(1).max(100).optional(),
    color: z.string().optional(),
    description: z.string().optional(),
  }),
});

export const createStudyMaterialSchema = z.object({
  body: z.object({
    subjectId: z.string().uuid().optional(),
    title: z.string().trim().min(1).max(255),
    type: materialTypeEnum,
    url: z.string().url().optional(),
    fileName: z.string().optional(),
    fileType: z.string().optional(),
    fileSize: z.number().int().positive().optional(),
    notes: z.string().optional(),
    targetDate: z.string().datetime().optional(),
  }),
});

export const updateStudyMaterialSchema = z.object({
  body: z.object({
    subjectId: z.string().uuid().optional(),
    title: z.string().trim().min(1).max(255).optional(),
    type: materialTypeEnum.optional(),
    url: z.string().url().optional(),
    fileName: z.string().optional(),
    fileType: z.string().optional(),
    fileSize: z.number().int().positive().optional(),
    notes: z.string().optional(),
    status: z.enum(["PLANNED", "IN_PROGRESS", "COMPLETED", "ON_HOLD"]).optional(),
    progress: z.number().int().min(0).max(100).optional(),
    targetDate: z.string().datetime().optional(),
  }),
});

export const createStudySessionSchema = z.object({
  body: z.object({
    subjectId: z.string().uuid().optional(),
    materialId: z.string().uuid().optional(),
    title: z.string().trim().min(1).max(255),
    startedAt: z.string().datetime().optional(),
    notes: z.string().optional(),
  }),
});

export const endStudySessionSchema = z.object({
  body: z.object({
    endedAt: z.string().datetime().optional(),
    notes: z.string().optional(),
  }),
});

export const dashboardStudyQuerySchema = z.object({
  query: z.object({
    range: z.enum(["today", "week", "month"]).optional(),
  }),
});