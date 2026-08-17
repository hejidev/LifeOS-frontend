// src/validators/two-factor.validator.ts
import { z } from "zod";
export const verifyCodeSchema = z.object({ body: z.object({ code: z.string().length(6) }) });

export const disableTwoFactorSchema = z.object({
    body: z.object({
      password: z.string().min(1),
      code: z.string().length(6),
    }),
  });