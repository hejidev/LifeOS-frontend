"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAchievementSchema = exports.updateSkillSchema = exports.createSkillSchema = exports.updateGoalSchema = exports.createGoalSchema = void 0;
const zod_1 = require("zod");
exports.createGoalSchema = zod_1.z.object({
    body: zod_1.z.object({
        title: zod_1.z.string().trim().min(1).max(200),
        area: zod_1.z.enum(["SKILLS", "ROLE", "PROJECT", "CERTIFICATION"]),
        targetDate: zod_1.z.string().datetime().optional(),
        notes: zod_1.z.string().optional(),
    }),
});
exports.updateGoalSchema = zod_1.z.object({
    body: zod_1.z.object({
        title: zod_1.z.string().trim().min(1).max(200).optional(),
        area: zod_1.z.enum(["SKILLS", "ROLE", "PROJECT", "CERTIFICATION"]).optional(),
        status: zod_1.z.enum(["NOT_STARTED", "IN_PROGRESS", "COMPLETED", "ON_HOLD"]).optional(),
        progress: zod_1.z.number().int().min(0).max(100).optional(),
        targetDate: zod_1.z.string().datetime().optional(),
        notes: zod_1.z.string().optional(),
    }),
});
exports.createSkillSchema = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z.string().trim().min(1).max(100),
        level: zod_1.z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED", "EXPERT"]).optional(),
        progress: zod_1.z.number().int().min(0).max(100).optional(),
        category: zod_1.z.string().optional(),
        relatedGoalId: zod_1.z.string().uuid().optional(),
    }),
});
exports.updateSkillSchema = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z.string().trim().min(1).max(100).optional(),
        level: zod_1.z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED", "EXPERT"]).optional(),
        progress: zod_1.z.number().int().min(0).max(100).optional(),
        category: zod_1.z.string().optional(),
        relatedGoalId: zod_1.z.string().uuid().optional(),
        lastPracticedAt: zod_1.z.string().datetime().optional(),
    }),
});
exports.createAchievementSchema = zod_1.z.object({
    body: zod_1.z.object({
        title: zod_1.z.string().trim().min(1).max(200),
        type: zod_1.z.enum(["CERTIFICATION", "AWARD", "PROMOTION", "PUBLICATION", "OTHER"]).optional(),
        issuer: zod_1.z.string().optional(),
        date: zod_1.z.string().datetime().optional(),
        description: zod_1.z.string().optional(),
        credentialUrl: zod_1.z.string().url().optional(),
    }),
});
