"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.saveDocumentSchema = exports.streamWritingSchema = void 0;
const zod_1 = require("zod");
const modeEnum = zod_1.z.enum(["GENERATE", "REWRITE", "IMPROVE", "SHORTEN", "EXPAND", "SUMMARIZE", "TRANSLATE", "TONE_CHANGE"]);
const label = zod_1.z.string().trim().min(1).max(40).regex(/^[\p{L}\p{N} \-()]+$/u, "Invalid option");
exports.streamWritingSchema = zod_1.z.object({
    body: zod_1.z.object({
        mode: modeEnum,
        input: zod_1.z.string().trim().min(1).max(8000),
        tone: label.optional(),
        targetLanguage: label.optional(),
    }),
});
exports.saveDocumentSchema = zod_1.z.object({
    body: zod_1.z.object({
        title: zod_1.z.string().trim().min(1).max(150),
        mode: modeEnum,
        input: zod_1.z.string().max(8000),
        output: zod_1.z.string().min(1).max(30000),
        tone: label.optional(),
    }),
});
