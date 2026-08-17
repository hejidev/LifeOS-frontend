import { z } from "zod";

export const checkoutSchema = z.object({
  body: z.object({
    plan: z.enum(["STARTER", "PRO", "PREMIUM"]),
    interval: z.enum(["month", "year"]).default("month"),
  }),
});