import { z } from "zod";

const publicId = z.string().min(1).max(300);

export const applyToolSchema = z.object({
  body: z.object({
    publicId,
    tool: z.enum(["REMOVE_BACKGROUND", "UPSCALE", "ENHANCE", "GRAYSCALE", "SEPIA"]),
    format: z.enum(["jpg", "png", "webp", "avif"]).optional(),
  }),
});

export const convertFormatSchema = z.object({
  body: z.object({
    publicId,
    format: z.enum(["jpg", "png", "webp", "avif", "gif"]),
    quality: z.string().regex(/^(auto(:(best|good|eco|low))?|\d{1,3})$/).optional(),
  }),
});

export const generativeEditSchema = z.object({
  body: z.object({
    publicId,
    prompt: z.string().trim().min(1).max(300),
    mode: z.enum(["remove", "fill"]),
  }),
});