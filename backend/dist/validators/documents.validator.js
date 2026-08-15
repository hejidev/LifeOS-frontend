"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.documentsDashboardQuerySchema = exports.updateDocumentSchema = exports.createDocumentSchema = exports.updateFolderSchema = exports.createFolderSchema = void 0;
const zod_1 = require("zod");
exports.createFolderSchema = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z.string().trim().min(1).max(100),
        description: zod_1.z.string().optional(),
    }),
});
exports.updateFolderSchema = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z.string().trim().min(1).max(100).optional(),
        description: zod_1.z.string().optional(),
    }),
});
exports.createDocumentSchema = zod_1.z.object({
    body: zod_1.z.object({
        folderId: zod_1.z.string().uuid().optional(),
        title: zod_1.z.string().trim().min(1).max(255),
        category: zod_1.z.enum([
            "IDENTITY",
            "LEGAL",
            "EDUCATION",
            "FINANCE",
            "HEALTH",
            "WORK",
            "PERSONAL",
            "OTHER",
        ]),
        fileUrl: zod_1.z.string().url().optional(),
        fileName: zod_1.z.string().optional(),
        fileType: zod_1.z.string().optional(),
        fileSize: zod_1.z.number().int().positive().optional(),
        tags: zod_1.z.array(zod_1.z.string()).default([]),
        summary: zod_1.z.string().optional(),
        expiresAt: zod_1.z.string().datetime().optional(),
        linkedNoteId: zod_1.z.string().uuid().optional(),
        linkedTaskId: zod_1.z.string().uuid().optional(),
    }),
});
exports.updateDocumentSchema = zod_1.z.object({
    body: zod_1.z.object({
        folderId: zod_1.z.string().uuid().optional(),
        title: zod_1.z.string().trim().min(1).max(255).optional(),
        category: zod_1.z
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
        fileUrl: zod_1.z.string().url().optional(),
        fileName: zod_1.z.string().optional(),
        fileType: zod_1.z.string().optional(),
        fileSize: zod_1.z.number().int().positive().optional(),
        tags: zod_1.z.array(zod_1.z.string()).optional(),
        summary: zod_1.z.string().optional(),
        expiresAt: zod_1.z.string().datetime().optional(),
        status: zod_1.z.enum(["ACTIVE", "ARCHIVED", "EXPIRED"]).optional(),
    }),
});
exports.documentsDashboardQuerySchema = zod_1.z.object({
    query: zod_1.z.object({
        q: zod_1.z.string().trim().optional(),
        category: zod_1.z
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
