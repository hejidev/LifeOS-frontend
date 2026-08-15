// src/validators/cms.validator.ts
import { z } from "zod";

export const createContentSchema = z.object({
  body: z.object({
    type: z.enum(["ABOUT", "CONTACT", "BLOG", "FAQ"]),
    title: z.string().trim().min(1).max(200),
    excerpt: z.string().max(300).optional(),
    body: z.string().min(1),
    coverImageUrl: z.string().url().optional(),
    order: z.number().int().optional(),
  }),
});

export const updateContentSchema = z.object({
  body: z.object({
    title: z.string().trim().min(1).max(200).optional(),
    excerpt: z.string().max(300).optional(),
    body: z.string().min(1).optional(),
    coverImageUrl: z.string().url().optional(),
    order: z.number().int().optional(),
  }),
});

export const reviewContentSchema = z.object({
  body: z.object({
    action: z.enum(["APPROVE", "REJECT"]),
    note: z.string().max(500).optional(),
  }),
});