"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateGoalSchema = exports.createGoalSchema = void 0;
const zod_1 = require("zod");
const goalModule = zod_1.z.enum([
    "TASKS",
    "FINANCE",
    "STUDY",
    "HEALTH",
    "CAREER",
    "OTHER",
]);
const amount = zod_1.z.number().finite().min(0).max(1e12);
exports.createGoalSchema = zod_1.z.object({
    body: zod_1.z.object({
        title: zod_1.z.string().trim().min(1).max(150),
        module: goalModule.default("OTHER"),
        target: amount.refine((value) => value > 0, "The target must be above zero"),
        progress: amount.optional(),
        unit: zod_1.z.string().trim().max(20).optional(),
        deadline: zod_1.z.string().datetime().optional(),
    }),
});
exports.updateGoalSchema = zod_1.z.object({
    body: zod_1.z.object({
        title: zod_1.z.string().trim().min(1).max(150).optional(),
        module: goalModule.optional(),
        target: amount
            .refine((value) => value > 0, "The target must be above zero")
            .optional(),
        progress: amount.optional(),
        unit: zod_1.z.string().trim().max(20).nullable().optional(),
        deadline: zod_1.z.string().datetime().nullable().optional(),
        status: zod_1.z.enum(["ACTIVE", "COMPLETED", "ABANDONED"]).optional(),
    }),
});
