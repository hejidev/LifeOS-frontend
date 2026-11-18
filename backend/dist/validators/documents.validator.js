"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.documentsDashboardQuerySchema = exports.updateDocumentSchema = exports.createDocumentSchema = exports.updateFolderSchema = exports.createFolderSchema = void 0;
const zod_1 = require("zod");
const safe_url_1 = require("../lib/safe-url");
const category = zod_1.z.enum(["IDENTITY", "LEGAL", "EDUCATION", "FINANCE", "HEALTH", "WORK", "PERSONAL", "OTHER"]);
const tags = zod_1.z.array(zod_1.z.string().trim().min(1).max(40)).max(20);
exports.createFolderSchema = zod_1.z.object({
    body: zod_1.z.object({ name: zod_1.z.string().trim().min(1).max(100), description: zod_1.z.string().trim().max(500).optional() }),
});
exports.updateFolderSchema = zod_1.z.object({
    body: zod_1.z.object({ name: zod_1.z.string().trim().min(1).max(100).optional(), description: zod_1.z.string().trim().max(500).optional() }),
});
const fileFields = {
    fileUrl: safe_url_1.webUrl.optional(),
    fileName: zod_1.z.string().trim().max(255).optional(),
    fileType: zod_1.z.string().trim().max(100).optional(),
    fileSize: zod_1.z.number().int().positive().max(30 * 1024 * 1024).optional(),
};
exports.createDocumentSchema = zod_1.z.object({
    body: zod_1.z.object({
        folderId: zod_1.z.string().uuid().optional(),
        title: zod_1.z.string().trim().min(1).max(255),
        category,
        tags: tags.default([]),
        summary: zod_1.z.string().trim().max(2000).optional(),
        expiresAt: zod_1.z.string().datetime().optional(),
        linkedNoteId: zod_1.z.string().uuid().optional(),
        linkedTaskId: zod_1.z.string().uuid().optional(),
        ...fileFields,
    }),
});
exports.updateDocumentSchema = zod_1.z.object({
    body: zod_1.z.object({
        folderId: zod_1.z.string().uuid().nullable().optional(),
        title: zod_1.z.string().trim().min(1).max(255).optional(),
        category: category.optional(),
        tags: tags.optional(),
        summary: zod_1.z.string().trim().max(2000).nullable().optional(),
        expiresAt: zod_1.z.string().datetime().nullable().optional(),
        status: zod_1.z.enum(["ACTIVE", "ARCHIVED", "EXPIRED"]).optional(),
        ...fileFields,
    }),
});
exports.documentsDashboardQuerySchema = zod_1.z.object({
    query: zod_1.z.object({ q: zod_1.z.string().trim().max(100).optional(), category: category.optional() }),
});
