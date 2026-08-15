"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateSubtaskSchema = exports.updateTaskSchema = exports.createTaskSchema = void 0;
const zod_1 = require("zod");
exports.createTaskSchema = zod_1.z.object({
    body: zod_1.z.object({
        title: zod_1.z.string().trim().min(1).max(255),
        description: zod_1.z.string().optional(),
        priority: zod_1.z.enum(["P1", "P2", "P3", "P4"]).default("P3"),
        dueDate: zod_1.z.string().datetime({ offset: true }).optional().or(zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()),
        dueTime: zod_1.z.string().regex(/^\d{2}:\d{2}$/).optional(),
        tags: zod_1.z.array(zod_1.z.string()).default([]),
        linkedNoteId: zod_1.z.string().uuid().optional(),
        recurring: zod_1.z.boolean().default(false),
        smartReminder: zod_1.z.boolean().default(false),
        subtasks: zod_1.z.array(zod_1.z.object({ title: zod_1.z.string().min(1) })).default([]),
    }),
});
exports.updateTaskSchema = zod_1.z.object({
    body: zod_1.z.object({
        title: zod_1.z.string().trim().min(1).max(255).optional(),
        description: zod_1.z.string().optional(),
        priority: zod_1.z.enum(["P1", "P2", "P3", "P4"]).optional(),
        status: zod_1.z.enum(["TODO", "IN_PROGRESS", "DONE"]).optional(),
        dueDate: zod_1.z.string().optional(),
        dueTime: zod_1.z.string().optional(),
        tags: zod_1.z.array(zod_1.z.string()).optional(),
        recurring: zod_1.z.boolean().optional(),
        smartReminder: zod_1.z.boolean().optional(),
        suggestedSchedule: zod_1.z.string().optional(),
    }),
});
exports.updateSubtaskSchema = zod_1.z.object({
    body: zod_1.z.object({
        completed: zod_1.z.boolean(),
    }),
});
