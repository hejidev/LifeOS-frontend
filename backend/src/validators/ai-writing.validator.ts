import { z } from "zod";

const modeEnum = z.enum(["GENERATE", "REWRITE", "IMPROVE", "SHORTEN", "EXPAND", "SUMMARIZE", "TRANSLATE", "TONE_CHANGE"]);
const label = z.string().trim().min(1).max(40).regex(/^[\p{L}\p{N} \-()]+$/u, "Invalid option");

export const streamWritingSchema = z.object({
  body: z.object({
    mode: modeEnum,
    input: z.string().trim().min(1).max(8000),
    tone: label.optional(),
    targetLanguage: label.optional(),
  }),
});

export const saveDocumentSchema = z.object({
  body: z.object({
    title: z.string().trim().min(1).max(150),
    mode: modeEnum,
    input: z.string().max(8000),
    output: z.string().min(1).max(30_000),
    tone: label.optional(),
  }),
});