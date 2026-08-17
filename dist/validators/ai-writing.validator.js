"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.saveDocumentSchema = exports.streamWritingSchema = void 0;
const zod_1 = require("zod");
const modeEnum = zod_1.z.enum(["GENERATE", "REWRITE", "IMPROVE", "SHORTEN", "EXPAND", "SUMMARIZE", "TRANSLATE", "TONE_CHANGE"]);
exports.streamWritingSchema = zod_1.z.object({
    body: zod_1.z.object({
        mode: modeEnum,
        input: zod_1.z.string().trim().min(1).max(8000),
        tone: zod_1.z.string().optional(),
        targetLanguage: zod_1.z.string().optional(),
    }),
});
exports.saveDocumentSchema = zod_1.z.object({
    body: zod_1.z.object({
        title: zod_1.z.string().trim().min(1).max(150),
        mode: modeEnum,
        input: zod_1.z.string(),
        output: zod_1.z.string(),
        tone: zod_1.z.string().optional(),
    }),
});
