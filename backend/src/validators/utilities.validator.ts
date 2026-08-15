import { z } from "zod";

export const translateSchema = z.object({
  body: z.object({
    text: z.string().trim().min(1).max(1000),
    targetLanguage: z.string().trim().min(1).max(60),
  }),
});