import { z } from "zod";

export const TARGET_FORMATS = [
  "pdf", "docx", "txt", "html", "rtf", "odt", "xlsx", "csv", "pptx",
  "jpg", "png", "webp", "gif", "tiff", "mp3", "wav", "m4a", "ogg", "mp4", "webm",
] as const;

export const textConvertSchema = z.object({
  body: z.object({
    content: z.string().min(1).max(900_000),
    from: z.enum(["json", "csv", "yaml"]),
    to: z.enum(["json", "csv", "yaml"]),
  }),
});

export const fileConvertSchema = z.object({
  body: z.object({
    targetFormat: z.preprocess((value) => (typeof value === "string" ? value.trim().toLowerCase() : value), z.enum(TARGET_FORMATS)),
  }),
});