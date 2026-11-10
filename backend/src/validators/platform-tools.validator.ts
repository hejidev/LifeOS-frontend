import { z } from "zod";

export const startLoadTestSchema = z.object({
  body: z.object({
    targets: z.array(z.enum(["public", "user", "merchant", "admin", "super_admin"])).min(1).max(5),
    concurrency: z.number().int().min(1).max(100),
    durationSec: z.number().int().min(5).max(60),
    rampUpSec: z.number().int().min(0).max(15),
    thinkMs: z.number().int().min(0).max(10000).default(0),
    direct: z.boolean().default(false),
  }),
});

export const noteSchema = z.object({ body: z.object({ body: z.string().trim().min(2).max(1000) }) });

export const merchantActionSchema = z.object({
  body: z.object({
    action: z.enum(["FORCE_STAFF_LOGOUT", "REGENERATE_STORE_CODE", "PAUSE_STORE", "RESUME_STORE"]),
    reason: z.string().trim().min(5).max(300),
  }),
});