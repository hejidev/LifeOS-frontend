"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateNoteSchema = exports.createNoteSchema = void 0;
const zod_1 = require("zod");
const folder = zod_1.z.enum(["Personal", "Work", "Study"]);
const tags = zod_1.z.array(zod_1.z.string().trim().min(1).max(30)).max(20);
const title = zod_1.z.string().trim().min(1).max(200);
const content = zod_1.z.string().max(200000);
exports.createNoteSchema = zod_1.z.object({
    body: zod_1.z.object({
        title,
        content: content.default(""),
        folder: folder.default("Personal"),
        tags: tags.optional(),
        pinned: zod_1.z.boolean().optional(),
    }),
});
exports.updateNoteSchema = zod_1.z.object({
    body: zod_1.z.object({
        title: title.optional(),
        content: content.optional(),
        folder: folder.optional(),
        tags: tags.optional(),
        pinned: zod_1.z.boolean().optional(),
    }),
});
