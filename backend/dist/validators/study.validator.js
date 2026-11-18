"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dashboardStudyQuerySchema = exports.endStudySessionSchema = exports.createStudySessionSchema = exports.updateStudyMaterialSchema = exports.createStudyMaterialSchema = exports.updateSubjectSchema = exports.createSubjectSchema = void 0;
const zod_1 = require("zod");
const safe_url_1 = require("../lib/safe-url");
const materialType = zod_1.z.enum(["BOOK", "ARTICLE", "VIDEO", "COURSE", "PODCAST", "PDF", "NOTE", "IMAGE", "DOCUMENT"]);
const text = (max) => zod_1.z.string().trim().max(max);
exports.createSubjectSchema = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z.string().trim().min(1).max(100),
        color: zod_1.z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
        description: text(500).optional(),
    }),
});
exports.updateSubjectSchema = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z.string().trim().min(1).max(100).optional(),
        color: zod_1.z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
        description: text(500).optional(),
    }),
});
const materialFile = {
    fileName: text(255).optional(),
    fileType: text(100).optional(),
    fileSize: zod_1.z.number().int().positive().max(30 * 1024 * 1024).optional(),
};
exports.createStudyMaterialSchema = zod_1.z.object({
    body: zod_1.z.object({
        subjectId: zod_1.z.string().uuid().optional(),
        title: zod_1.z.string().trim().min(1).max(255),
        type: materialType,
        url: safe_url_1.webUrl.optional(),
        notes: text(2000).optional(),
        targetDate: zod_1.z.string().datetime().optional(),
        ...materialFile,
    }),
});
exports.updateStudyMaterialSchema = zod_1.z.object({
    body: zod_1.z.object({
        subjectId: zod_1.z.string().uuid().nullable().optional(),
        title: zod_1.z.string().trim().min(1).max(255).optional(),
        type: materialType.optional(),
        url: safe_url_1.webUrl.nullable().optional(),
        notes: text(2000).nullable().optional(),
        status: zod_1.z.enum(["PLANNED", "IN_PROGRESS", "COMPLETED", "ON_HOLD"]).optional(),
        progress: zod_1.z.number().int().min(0).max(100).optional(),
        targetDate: zod_1.z.string().datetime().nullable().optional(),
        ...materialFile,
    }),
});
exports.createStudySessionSchema = zod_1.z.object({
    body: zod_1.z.object({
        subjectId: zod_1.z.string().uuid().optional(),
        materialId: zod_1.z.string().uuid().optional(),
        title: zod_1.z.string().trim().min(1).max(255),
        startedAt: zod_1.z.string().datetime().optional(),
        notes: text(2000).optional(),
    }),
});
exports.endStudySessionSchema = zod_1.z.object({
    body: zod_1.z.object({ endedAt: zod_1.z.string().datetime().optional(), notes: text(2000).optional() }),
});
exports.dashboardStudyQuerySchema = zod_1.z.object({ query: zod_1.z.object({ range: zod_1.z.enum(["today", "week", "month"]).optional() }) });
