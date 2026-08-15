"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dashboardStudyQuerySchema = exports.endStudySessionSchema = exports.createStudySessionSchema = exports.updateStudyMaterialSchema = exports.createStudyMaterialSchema = exports.updateSubjectSchema = exports.createSubjectSchema = void 0;
const zod_1 = require("zod");
const materialTypeEnum = zod_1.z.enum([
    "BOOK", "ARTICLE", "VIDEO", "COURSE", "PODCAST", "PDF", "NOTE", "IMAGE", "DOCUMENT",
]);
exports.createSubjectSchema = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z.string().trim().min(1).max(100),
        color: zod_1.z.string().optional(),
        description: zod_1.z.string().optional(),
    }),
});
exports.updateSubjectSchema = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z.string().trim().min(1).max(100).optional(),
        color: zod_1.z.string().optional(),
        description: zod_1.z.string().optional(),
    }),
});
exports.createStudyMaterialSchema = zod_1.z.object({
    body: zod_1.z.object({
        subjectId: zod_1.z.string().uuid().optional(),
        title: zod_1.z.string().trim().min(1).max(255),
        type: materialTypeEnum,
        url: zod_1.z.string().url().optional(),
        fileName: zod_1.z.string().optional(),
        fileType: zod_1.z.string().optional(),
        fileSize: zod_1.z.number().int().positive().optional(),
        notes: zod_1.z.string().optional(),
        targetDate: zod_1.z.string().datetime().optional(),
    }),
});
exports.updateStudyMaterialSchema = zod_1.z.object({
    body: zod_1.z.object({
        subjectId: zod_1.z.string().uuid().optional(),
        title: zod_1.z.string().trim().min(1).max(255).optional(),
        type: materialTypeEnum.optional(),
        url: zod_1.z.string().url().optional(),
        fileName: zod_1.z.string().optional(),
        fileType: zod_1.z.string().optional(),
        fileSize: zod_1.z.number().int().positive().optional(),
        notes: zod_1.z.string().optional(),
        status: zod_1.z.enum(["PLANNED", "IN_PROGRESS", "COMPLETED", "ON_HOLD"]).optional(),
        progress: zod_1.z.number().int().min(0).max(100).optional(),
        targetDate: zod_1.z.string().datetime().optional(),
    }),
});
exports.createStudySessionSchema = zod_1.z.object({
    body: zod_1.z.object({
        subjectId: zod_1.z.string().uuid().optional(),
        materialId: zod_1.z.string().uuid().optional(),
        title: zod_1.z.string().trim().min(1).max(255),
        startedAt: zod_1.z.string().datetime().optional(),
        notes: zod_1.z.string().optional(),
    }),
});
exports.endStudySessionSchema = zod_1.z.object({
    body: zod_1.z.object({
        endedAt: zod_1.z.string().datetime().optional(),
        notes: zod_1.z.string().optional(),
    }),
});
exports.dashboardStudyQuerySchema = zod_1.z.object({
    query: zod_1.z.object({
        range: zod_1.z.enum(["today", "week", "month"]).optional(),
    }),
});
