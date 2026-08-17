import { z } from "zod";

export const createNoteSchema = z.object({
  body: z.object({
    title: z.string().trim().min(1).max(255),
    content: z.string().default(""),
    folder: z.enum(["Personal", "Work", "Study"]).default("Personal"),
    tags: z.array(z.string()).default([]),
    pinned: z.boolean().default(false),
  }),
});

export const updateNoteSchema = z.object({
  body: z.object({
    title: z.string().trim().min(1).max(255).optional(),
    content: z.string().optional(),
    folder: z.enum(["Personal", "Work", "Study"]).optional(),
    tags: z.array(z.string()).optional(),
    pinned: z.boolean().optional(),
  }),
});