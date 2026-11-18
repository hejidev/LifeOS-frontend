"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generativeEditSchema = exports.convertFormatSchema = exports.applyToolSchema = void 0;
const zod_1 = require("zod");
const publicId = zod_1.z.string().min(1).max(300);
exports.applyToolSchema = zod_1.z.object({
    body: zod_1.z.object({
        publicId,
        tool: zod_1.z.enum(["REMOVE_BACKGROUND", "UPSCALE", "ENHANCE", "GRAYSCALE", "SEPIA"]),
        format: zod_1.z.enum(["jpg", "png", "webp", "avif"]).optional(),
    }),
});
exports.convertFormatSchema = zod_1.z.object({
    body: zod_1.z.object({
        publicId,
        format: zod_1.z.enum(["jpg", "png", "webp", "avif", "gif"]),
        quality: zod_1.z.string().regex(/^(auto(:(best|good|eco|low))?|\d{1,3})$/).optional(),
    }),
});
exports.generativeEditSchema = zod_1.z.object({
    body: zod_1.z.object({
        publicId,
        prompt: zod_1.z.string().trim().min(1).max(300),
        mode: zod_1.z.enum(["remove", "fill"]),
    }),
});
