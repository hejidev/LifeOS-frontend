import { z } from "zod";

export const applyToolSchema = z.object({
  body: z.object({
    publicId: z.string().min(1),
    tool: z.enum(["REMOVE_BACKGROUND", "UPSCALE", "ENHANCE", "GRAYSCALE", "SEPIA"]),
    format: z.string().optional(),
  }),
});

export const convertFormatSchema = z.object({
  body: z.object({
    publicId: z.string().min(1),
    format: z.enum(["jpg", "png", "webp", "avif", "gif"]),
    quality: z.string().optional(),
  }),
});

export const generativeEditSchema = z.object({
  body: z.object({
    publicId: z.string().min(1),
    prompt: z.string().trim().min(1).max(300),
    mode: z.enum(["remove", "fill"]),
  }),
});