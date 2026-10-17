import { z } from "zod";

export const createStoreSchema = z.object({
  body: z.object({
    name: z.string().trim().min(1).max(120),
    address: z.string().trim().max(255).optional(),
    phone: z.string().trim().max(32).optional(),
  }),
});

export const updateStoreSchema = z.object({
  body: z.object({
    name: z.string().trim().min(1).max(120).optional(),
    address: z.string().trim().max(255).optional(),
    phone: z.string().trim().max(32).optional(),
    active: z.boolean().optional(),
  }),
});