"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateShiftSchema = exports.createShiftSchema = void 0;
const zod_1 = require("zod");
exports.createShiftSchema = zod_1.z.object({
    body: zod_1.z
        .object({
        staffId: zod_1.z.string().uuid(),
        startsAt: zod_1.z.string().min(1),
        endsAt: zod_1.z.string().min(1),
        storeId: zod_1.z.string().uuid().optional(),
        note: zod_1.z.string().trim().max(300).optional(),
    })
        .refine((d) => new Date(d.endsAt).getTime() > new Date(d.startsAt).getTime(), {
        message: "Shift end time must be after the start time",
        path: ["endsAt"],
    }),
});
exports.updateShiftSchema = zod_1.z.object({
    body: zod_1.z.object({
        startsAt: zod_1.z.string().min(1).optional(),
        endsAt: zod_1.z.string().min(1).optional(),
        storeId: zod_1.z.string().uuid().optional(),
        note: zod_1.z.string().trim().max(300).optional(),
    }),
});
