"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.merchantActionSchema = exports.noteSchema = exports.startLoadTestSchema = void 0;
const zod_1 = require("zod");
exports.startLoadTestSchema = zod_1.z.object({
    body: zod_1.z.object({
        targets: zod_1.z.array(zod_1.z.enum(["public", "user", "merchant", "admin", "super_admin"])).min(1).max(5),
        concurrency: zod_1.z.number().int().min(1).max(100),
        durationSec: zod_1.z.number().int().min(5).max(60),
        rampUpSec: zod_1.z.number().int().min(0).max(15),
        thinkMs: zod_1.z.number().int().min(0).max(10000).default(0),
        direct: zod_1.z.boolean().default(false),
    }),
});
exports.noteSchema = zod_1.z.object({ body: zod_1.z.object({ body: zod_1.z.string().trim().min(2).max(1000) }) });
exports.merchantActionSchema = zod_1.z.object({
    body: zod_1.z.object({
        action: zod_1.z.enum(["FORCE_STAFF_LOGOUT", "REGENERATE_STORE_CODE", "PAUSE_STORE", "RESUME_STORE"]),
        reason: zod_1.z.string().trim().min(5).max(300),
    }),
});
