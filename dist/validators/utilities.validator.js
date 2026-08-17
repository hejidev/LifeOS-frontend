"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.translateSchema = void 0;
const zod_1 = require("zod");
exports.translateSchema = zod_1.z.object({
    body: zod_1.z.object({
        text: zod_1.z.string().trim().min(1).max(1000),
        targetLanguage: zod_1.z.string().trim().min(1).max(60),
    }),
});
