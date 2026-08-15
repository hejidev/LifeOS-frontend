"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateEventSchema = exports.createEventSchema = void 0;
const zod_1 = require("zod");
exports.createEventSchema = zod_1.z.object({
    body: zod_1.z.object({
        title: zod_1.z.string().trim().min(1).max(200),
        description: zod_1.z.string().max(1000).optional(),
        start: zod_1.z.string().datetime(),
        end: zod_1.z.string().datetime(),
        allDay: zod_1.z.boolean().optional(),
        location: zod_1.z.string().max(200).optional(),
        type: zod_1.z.enum(["MEETING", "PERSONAL", "DEADLINE", "REMINDER", "OTHER"]).optional(),
    }),
});
exports.updateEventSchema = zod_1.z.object({
    body: zod_1.z.object({
        title: zod_1.z.string().trim().min(1).max(200).optional(),
        description: zod_1.z.string().max(1000).optional(),
        start: zod_1.z.string().datetime().optional(),
        end: zod_1.z.string().datetime().optional(),
        allDay: zod_1.z.boolean().optional(),
        location: zod_1.z.string().max(200).optional(),
        type: zod_1.z.enum(["MEETING", "PERSONAL", "DEADLINE", "REMINDER", "OTHER"]).optional(),
    }),
});
