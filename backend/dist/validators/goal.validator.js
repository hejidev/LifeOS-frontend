"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateGoalSchema = exports.createGoalSchema = void 0;
const zod_1 = require("zod");
exports.createGoalSchema = zod_1.z.object({
    body: zod_1.z.object({
        title: zod_1.z.string().trim().min(1).max(200),
        module: zod_1.z.enum(["TASKS", "FINANCE", "STUDY", "HEALTH", "CAREER", "OTHER"]).optional(),
        target: zod_1.z.number().positive(),
        unit: zod_1.z.string().max(20).optional(),
        deadline: zod_1.z.string().datetime().optional(),
    }),
});
exports.updateGoalSchema = zod_1.z.object({
    body: zod_1.z.object({
        title: zod_1.z.string().trim().min(1).max(200).optional(),
        progress: zod_1.z.number().min(0).optional(),
        target: zod_1.z.number().positive().optional(),
        status: zod_1.z.enum(["ACTIVE", "COMPLETED", "ABANDONED"]).optional(),
        deadline: zod_1.z.string().datetime().optional().nullable(),
    }),
});
