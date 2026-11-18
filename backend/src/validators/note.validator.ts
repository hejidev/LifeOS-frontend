import { z } from "zod";

const folder = z.enum(["Personal", "Work", "Study"]);
const tags = z.array(z.string().trim().min(1).max(30)).max(20);
const title = z.string().trim().min(1).max(200);
const content = z.string().max(200_000);

export const createNoteSchema = z.object({
  body: z.object({
    title,
    content: content.default(""),
    folder: folder.default("Personal"),
    tags: tags.optional(),
    pinned: z.boolean().optional(),
  }),
});

export const updateNoteSchema = z.object({
  body: z.object({
    title: title.optional(),
    content: content.optional(),
    folder: folder.optional(),
    tags: tags.optional(),
    pinned: z.boolean().optional(),
  }),
});