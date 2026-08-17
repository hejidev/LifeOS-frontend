"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateHabitSchema = exports.createHabitSchema = void 0;
const zod_1 = require("zod");
exports.createHabitSchema = zod_1.z.object({
    body: zod_1.z.object({
        title: zod_1.z.string().trim().min(1).max(160),
        description: zod_1.z.string().max(500).optional(),
        frequency: zod_1.z.enum(["daily", "weekly"]).default("daily"),
        category: zod_1.z.enum(["health", "focus", "learning", "finance", "other"]).default("other"),
        colorHex: zod_1.z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
    }),
});
exports.updateHabitSchema = zod_1.z.object({
    body: zod_1.z.object({
        title: zod_1.z.string().trim().min(1).max(160).optional(),
        description: zod_1.z.string().max(500).optional(),
        frequency: zod_1.z.enum(["daily", "weekly"]).optional(),
        category: zod_1.z.enum(["health", "focus", "learning", "finance", "other"]).optional(),
        colorHex: zod_1.z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
        archived: zod_1.z.boolean().optional(),
    }),
});
