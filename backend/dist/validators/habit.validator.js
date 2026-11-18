"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toggleHabitSchema = exports.updateHabitSchema = exports.createHabitSchema = void 0;
const zod_1 = require("zod");
const category = zod_1.z.enum(["health", "focus", "learning", "finance", "other"]);
const colorHex = zod_1.z.string().regex(/^#[0-9a-fA-F]{6}$/);
exports.createHabitSchema = zod_1.z.object({
    body: zod_1.z.object({
        title: zod_1.z.string().trim().min(1).max(160),
        description: zod_1.z.string().max(500).optional(),
        frequency: zod_1.z.enum(["daily", "weekly"]).default("daily"),
        category: category.default("other"),
        colorHex: colorHex.optional(),
    }),
});
exports.updateHabitSchema = zod_1.z.object({
    body: zod_1.z.object({
        title: zod_1.z.string().trim().min(1).max(160).optional(),
        description: zod_1.z.string().max(500).optional(),
        frequency: zod_1.z.enum(["daily", "weekly"]).optional(),
        category: category.optional(),
        colorHex: colorHex.optional(),
        archived: zod_1.z.boolean().optional(),
    }),
});
exports.toggleHabitSchema = zod_1.z.object({
    body: zod_1.z.object({ date: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional() }).default({}),
});
