"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createHabitSchema = exports.logHealthSchema = void 0;
const zod_1 = require("zod");
exports.logHealthSchema = zod_1.z.object({
    body: zod_1.z.object({
        date: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
        sleepHours: zod_1.z.number().min(0).max(24).optional(),
        steps: zod_1.z.number().int().min(0).optional(),
        waterGlasses: zod_1.z.number().int().min(0).optional(),
        workoutDone: zod_1.z.boolean().optional(),
        notes: zod_1.z.string().optional(),
    }),
});
exports.createHabitSchema = zod_1.z.object({
    body: zod_1.z.object({
        title: zod_1.z.string().trim().min(1).max(100),
        description: zod_1.z.string().optional(),
        frequency: zod_1.z.enum(["daily", "weekly"]).default("daily"),
        category: zod_1.z.enum(["health", "focus", "learning", "finance"]).optional(),
    }),
});
