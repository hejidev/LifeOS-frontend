import { z } from "zod";
import { webUrl } from "../lib/safe-url";

const category = z.enum(["WEBSITE", "APP", "BANK", "CARD", "NOTE"]);
const tags = z.array(z.string().trim().min(1).max(40)).max(20);

export const createVaultItemSchema = z.object({
  body: z.object({
    label: z.string().trim().min(1).max(100),
    username: z.string().trim().max(255).optional(),
    password: z.string().min(1).max(255).optional(),
    url: webUrl.optional(),
    category: category.optional(),
    notes: z.string().max(5000).optional(),
    tags: tags.optional(),
    favorite: z.boolean().optional(),
  }),
});

export const updateVaultItemSchema = z.object({
  body: z.object({
    label: z.string().trim().min(1).max(100).optional(),
    username: z.string().trim().max(255).nullable().optional(),
    password: z.string().min(1).max(255).optional(),
    url: webUrl.nullable().optional(),
    category: category.optional(),
    notes: z.string().max(5000).nullable().optional(),
    tags: tags.optional(),
    favorite: z.boolean().optional(),
  }),
});