"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateNoteSchema = exports.createNoteSchema = void 0;
const zod_1 = require("zod");
exports.createNoteSchema = zod_1.z.object({
    body: zod_1.z.object({
        title: zod_1.z.string().trim().min(1).max(255),
        content: zod_1.z.string().default(""),
        folder: zod_1.z.enum(["Personal", "Work", "Study"]).default("Personal"),
        tags: zod_1.z.array(zod_1.z.string()).default([]),
        pinned: zod_1.z.boolean().default(false),
    }),
});
exports.updateNoteSchema = zod_1.z.object({
    body: zod_1.z.object({
        title: zod_1.z.string().trim().min(1).max(255).optional(),
        content: zod_1.z.string().optional(),
        folder: zod_1.z.enum(["Personal", "Work", "Study"]).optional(),
        tags: zod_1.z.array(zod_1.z.string()).optional(),
        pinned: zod_1.z.boolean().optional(),
    }),
});
