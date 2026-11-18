import { z } from "zod";
import { webUrl } from "../lib/safe-url";

const materialType = z.enum(["BOOK", "ARTICLE", "VIDEO", "COURSE", "PODCAST", "PDF", "NOTE", "IMAGE", "DOCUMENT"]);
const text = (max: number) => z.string().trim().max(max);

export const createSubjectSchema = z.object({
  body: z.object({
    name: z.string().trim().min(1).max(100),
    color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
    description: text(500).optional(),
  }),
});

export const updateSubjectSchema = z.object({
  body: z.object({
    name: z.string().trim().min(1).max(100).optional(),
    color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
    description: text(500).optional(),
  }),
});

const materialFile = {
  fileName: text(255).optional(),
  fileType: text(100).optional(),
  fileSize: z.number().int().positive().max(30 * 1024 * 1024).optional(),
};

export const createStudyMaterialSchema = z.object({
  body: z.object({
    subjectId: z.string().uuid().optional(),
    title: z.string().trim().min(1).max(255),
    type: materialType,
    url: webUrl.optional(),
    notes: text(2000).optional(),
    targetDate: z.string().datetime().optional(),
    ...materialFile,
  }),
});

export const updateStudyMaterialSchema = z.object({
  body: z.object({
    subjectId: z.string().uuid().nullable().optional(),
    title: z.string().trim().min(1).max(255).optional(),
    type: materialType.optional(),
    url: webUrl.nullable().optional(),
    notes: text(2000).nullable().optional(),
    status: z.enum(["PLANNED", "IN_PROGRESS", "COMPLETED", "ON_HOLD"]).optional(),
    progress: z.number().int().min(0).max(100).optional(),
    targetDate: z.string().datetime().nullable().optional(),
    ...materialFile,
  }),
});

export const createStudySessionSchema = z.object({
  body: z.object({
    subjectId: z.string().uuid().optional(),
    materialId: z.string().uuid().optional(),
    title: z.string().trim().min(1).max(255),
    startedAt: z.string().datetime().optional(),
    notes: text(2000).optional(),
  }),
});

export const endStudySessionSchema = z.object({
  body: z.object({ endedAt: z.string().datetime().optional(), notes: text(2000).optional() }),
});

export const dashboardStudyQuerySchema = z.object({ query: z.object({ range: z.enum(["today", "week", "month"]).optional() }) });