"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fileConvertSchema = exports.textConvertSchema = exports.TARGET_FORMATS = void 0;
const zod_1 = require("zod");
exports.TARGET_FORMATS = [
    "pdf", "docx", "txt", "html", "rtf", "odt", "xlsx", "csv", "pptx",
    "jpg", "png", "webp", "gif", "tiff", "mp3", "wav", "m4a", "ogg", "mp4", "webm",
];
exports.textConvertSchema = zod_1.z.object({
    body: zod_1.z.object({
        content: zod_1.z.string().min(1).max(900000),
        from: zod_1.z.enum(["json", "csv", "yaml"]),
        to: zod_1.z.enum(["json", "csv", "yaml"]),
    }),
});
exports.fileConvertSchema = zod_1.z.object({
    body: zod_1.z.object({
        targetFormat: zod_1.z.preprocess((value) => (typeof value === "string" ? value.trim().toLowerCase() : value), zod_1.z.enum(exports.TARGET_FORMATS)),
    }),
});
