"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAchievementSchema = exports.updateSkillSchema = exports.createSkillSchema = exports.updateGoalSchema = exports.createGoalSchema = void 0;
const zod_1 = require("zod");
const safe_url_1 = require("../lib/safe-url");
const area = zod_1.z.enum(["SKILLS", "ROLE", "PROJECT", "CERTIFICATION"]);
const level = zod_1.z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED", "EXPERT"]);
const notes = zod_1.z.string().trim().max(2000);
exports.createGoalSchema = zod_1.z.object({
    body: zod_1.z.object({ title: zod_1.z.string().trim().min(1).max(200), area, targetDate: zod_1.z.string().datetime().optional(), notes: notes.optional() }),
});
exports.updateGoalSchema = zod_1.z.object({
    body: zod_1.z.object({
        title: zod_1.z.string().trim().min(1).max(200).optional(),
        area: area.optional(),
        status: zod_1.z.enum(["NOT_STARTED", "IN_PROGRESS", "COMPLETED", "ON_HOLD"]).optional(),
        progress: zod_1.z.number().int().min(0).max(100).optional(),
        targetDate: zod_1.z.string().datetime().nullable().optional(),
        notes: notes.nullable().optional(),
    }),
});
exports.createSkillSchema = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z.string().trim().min(1).max(100),
        level: level.optional(),
        progress: zod_1.z.number().int().min(0).max(100).optional(),
        category: zod_1.z.string().trim().max(60).optional(),
        relatedGoalId: zod_1.z.string().uuid().optional(),
    }),
});
exports.updateSkillSchema = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z.string().trim().min(1).max(100).optional(),
        level: level.optional(),
        progress: zod_1.z.number().int().min(0).max(100).optional(),
        category: zod_1.z.string().trim().max(60).optional(),
        relatedGoalId: zod_1.z.string().uuid().nullable().optional(),
        lastPracticedAt: zod_1.z.string().datetime().optional(),
    }),
});
exports.createAchievementSchema = zod_1.z.object({
    body: zod_1.z.object({
        title: zod_1.z.string().trim().min(1).max(200),
        type: zod_1.z.enum(["CERTIFICATION", "AWARD", "PROMOTION", "PUBLICATION", "OTHER"]).optional(),
        issuer: zod_1.z.string().trim().max(120).optional(),
        date: zod_1.z.string().datetime().optional(),
        description: notes.optional(),
        credentialUrl: safe_url_1.webUrl.optional(),
    }),
});
