"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generativeEditSchema = exports.convertFormatSchema = exports.applyToolSchema = void 0;
const zod_1 = require("zod");
exports.applyToolSchema = zod_1.z.object({
    body: zod_1.z.object({
        publicId: zod_1.z.string().min(1),
        tool: zod_1.z.enum(["REMOVE_BACKGROUND", "UPSCALE", "ENHANCE", "GRAYSCALE", "SEPIA"]),
        format: zod_1.z.string().optional(),
    }),
});
exports.convertFormatSchema = zod_1.z.object({
    body: zod_1.z.object({
        publicId: zod_1.z.string().min(1),
        format: zod_1.z.enum(["jpg", "png", "webp", "avif", "gif"]),
        quality: zod_1.z.string().optional(),
    }),
});
exports.generativeEditSchema = zod_1.z.object({
    body: zod_1.z.object({
        publicId: zod_1.z.string().min(1),
        prompt: zod_1.z.string().trim().min(1).max(300),
        mode: zod_1.z.enum(["remove", "fill"]),
    }),
});
