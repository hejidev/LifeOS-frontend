import { z } from "zod";
import { webUrl } from "../lib/safe-url";

const category = z.enum(["IDENTITY", "LEGAL", "EDUCATION", "FINANCE", "HEALTH", "WORK", "PERSONAL", "OTHER"]);
const tags = z.array(z.string().trim().min(1).max(40)).max(20);

export const createFolderSchema = z.object({
  body: z.object({ name: z.string().trim().min(1).max(100), description: z.string().trim().max(500).optional() }),
});

export const updateFolderSchema = z.object({
  body: z.object({ name: z.string().trim().min(1).max(100).optional(), description: z.string().trim().max(500).optional() }),
});

const fileFields = {
  fileUrl: webUrl.optional(),
  fileName: z.string().trim().max(255).optional(),
  fileType: z.string().trim().max(100).optional(),
  fileSize: z.number().int().positive().max(30 * 1024 * 1024).optional(),
};

export const createDocumentSchema = z.object({
  body: z.object({
    folderId: z.string().uuid().optional(),
    title: z.string().trim().min(1).max(255),
    category,
    tags: tags.default([]),
    summary: z.string().trim().max(2000).optional(),
    expiresAt: z.string().datetime().optional(),
    linkedNoteId: z.string().uuid().optional(),
    linkedTaskId: z.string().uuid().optional(),
    ...fileFields,
  }),
});

export const updateDocumentSchema = z.object({
  body: z.object({
    folderId: z.string().uuid().nullable().optional(),
    title: z.string().trim().min(1).max(255).optional(),
    category: category.optional(),
    tags: tags.optional(),
    summary: z.string().trim().max(2000).nullable().optional(),
    expiresAt: z.string().datetime().nullable().optional(),
    status: z.enum(["ACTIVE", "ARCHIVED", "EXPIRED"]).optional(),
    ...fileFields,
  }),
});

export const documentsDashboardQuerySchema = z.object({
  query: z.object({ q: z.string().trim().max(100).optional(), category: category.optional() }),
});