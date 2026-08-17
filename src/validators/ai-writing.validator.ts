import { z } from "zod";

const modeEnum = z.enum(["GENERATE", "REWRITE", "IMPROVE", "SHORTEN", "EXPAND", "SUMMARIZE", "TRANSLATE", "TONE_CHANGE"]);

export const streamWritingSchema = z.object({
  body: z.object({
    mode: modeEnum,
    input: z.string().trim().min(1).max(8000),
    tone: z.string().optional(),
    targetLanguage: z.string().optional(),
  }),
});

export const saveDocumentSchema = z.object({
  body: z.object({
    title: z.string().trim().min(1).max(150),
    mode: modeEnum,
    input: z.string(),
    output: z.string(),
    tone: z.string().optional(),
  }),
});