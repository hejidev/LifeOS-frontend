import { z } from "zod";

export const createFolderSchema = z.object({
  body: z.object({
    name: z.string().trim().min(1).max(100),
    description: z.string().optional(),
  }),
});

export const updateFolderSchema = z.object({
  body: z.object({
    name: z.string().trim().min(1).max(100).optional(),
    description: z.string().optional(),
  }),
});

export const createDocumentSchema = z.object({
  body: z.object({
    folderId: z.string().uuid().optional(),
    title: z.string().trim().min(1).max(255),
    category: z.enum([
      "IDENTITY",
      "LEGAL",
      "EDUCATION",
      "FINANCE",
      "HEALTH",
      "WORK",
      "PERSONAL",
      "OTHER",
    ]),
    fileUrl: z.string().url().optional(),
    fileName: z.string().optional(),
    fileType: z.string().optional(),
    fileSize: z.number().int().positive().optional(),
    tags: z.array(z.string()).default([]),
    summary: z.string().optional(),
    expiresAt: z.string().datetime().optional(),
    linkedNoteId: z.string().uuid().optional(),
    linkedTaskId: z.string().uuid().optional(),
  }),
});

export const updateDocumentSchema = z.object({
  body: z.object({
    folderId: z.string().uuid().optional(),
    title: z.string().trim().min(1).max(255).optional(),
    category: z
      .enum([
        "IDENTITY",
        "LEGAL",
        "EDUCATION",
        "FINANCE",
        "HEALTH",
        "WORK",
        "PERSONAL",
        "OTHER",
      ])
      .optional(),
    fileUrl: z.string().url().optional(),
    fileName: z.string().optional(),
    fileType: z.string().optional(),
    fileSize: z.number().int().positive().optional(),
    tags: z.array(z.string()).optional(),
    summary: z.string().optional(),
    expiresAt: z.string().datetime().optional(),
    status: z.enum(["ACTIVE", "ARCHIVED", "EXPIRED"]).optional(),
  }),
});

export const documentsDashboardQuerySchema = z.object({
  query: z.object({
    q: z.string().trim().optional(),
    category: z
      .enum([
        "IDENTITY",
        "LEGAL",
        "EDUCATION",
        "FINANCE",
        "HEALTH",
        "WORK",
        "PERSONAL",
        "OTHER",
      ])
      .optional(),
  }),
});