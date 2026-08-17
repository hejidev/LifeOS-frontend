"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fileConvertSchema = exports.textConvertSchema = void 0;
const zod_1 = require("zod");
exports.textConvertSchema = zod_1.z.object({
    body: zod_1.z.object({
        content: zod_1.z.string().min(1),
        from: zod_1.z.enum(["json", "csv", "yaml"]),
        to: zod_1.z.enum(["json", "csv", "yaml"]),
    }),
});
exports.fileConvertSchema = zod_1.z.object({
    body: zod_1.z.object({ targetFormat: zod_1.z.string().trim().min(1).max(20) }),
});
