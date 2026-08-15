import { z } from "zod";

export const createVaultItemSchema = z.object({
  body: z.object({
    label: z.string().trim().min(1).max(100),
    username: z.string().trim().max(255).optional(),
    password: z.string().max(255).optional(),
    url: z.string().url().optional(),
    category: z.enum(["WEBSITE", "APP", "BANK", "CARD", "NOTE"]).optional(),
    notes: z.string().optional(),
    tags: z.array(z.string()).optional(),
    favorite: z.boolean().optional(),
  }),
});

export const updateVaultItemSchema = z.object({
  body: z.object({
    label: z.string().trim().min(1).max(100).optional(),
    username: z.string().trim().max(255).optional(),
    password: z.string().max(255).optional(),
    url: z.string().url().optional(),
    category: z.enum(["WEBSITE", "APP", "BANK", "CARD", "NOTE"]).optional(),
    notes: z.string().optional(),
    tags: z.array(z.string()).optional(),
    favorite: z.boolean().optional(),
  }),
});