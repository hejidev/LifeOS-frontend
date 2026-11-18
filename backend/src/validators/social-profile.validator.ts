import { z } from "zod";
import { linkUrl, webUrl } from "../lib/safe-url";

const RESERVED = ["admin", "api", "app", "login", "signup", "settings", "connect", "www", "support", "lifeos"];

const link = z.object({
  platform: z.string().trim().min(1).max(30),
  url: linkUrl,
  label: z.string().trim().max(50).optional(),
  enabled: z.boolean().default(true),
  sortOrder: z.number().int().min(0).max(100).default(0),
});

const profileFields = {
  displayName: z.string().trim().min(1).max(100),
  bio: z.string().trim().max(300).optional(),
  avatar: webUrl.optional(),
  isPublic: z.boolean().default(true),
  links: z.array(link).min(1).max(30),
};

export const createSocialProfileSchema = z.object({
  body: z.object({
    slug: z
      .string()
      .trim()
      .toLowerCase()
      .min(3)
      .max(30)
      .regex(/^[a-z0-9_-]+$/, "Username can only contain letters, numbers, underscores and hyphens")
      .refine((value) => !RESERVED.includes(value), "That username isn't available"),
    ...profileFields,
  }),
});

export const updateSocialProfileSchema = z.object({ body: z.object(profileFields) });