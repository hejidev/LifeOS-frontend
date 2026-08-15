import { z } from "zod";

export const textConvertSchema = z.object({
  body: z.object({
    content: z.string().min(1),
    from: z.enum(["json", "csv", "yaml"]),
    to: z.enum(["json", "csv", "yaml"]),
  }),
});

export const fileConvertSchema = z.object({
  body: z.object({ targetFormat: z.string().trim().min(1).max(20) }),
});