import { z } from "zod";

const socialLinkSchema = z.object({
  platform: z
    .string()
    .trim()
    .min(1)
    .max(30),

  url: z
    .string()
    .trim()
    .url(),

  label: z
    .string()
    .trim()
    .max(50)
    .optional(),

  enabled: z
    .boolean()
    .default(true),

  sortOrder: z
    .number()
    .int()
    .min(0)
    .default(0),
});

export const createSocialProfileSchema = z.object({
  body: z.object({
    slug: z
      .string()
      .trim()
      .min(3)
      .max(30)
      .regex(
        /^[a-zA-Z0-9_-]+$/,
        "Username can only contain letters, numbers, underscores and hyphens"
      ),

    displayName: z
      .string()
      .trim()
      .min(1)
      .max(100),

    bio: z
      .string()
      .trim()
      .max(300)
      .optional(),

    avatar: z
      .string()
      .url()
      .optional(),

    isPublic: z
      .boolean()
      .default(true),

    links: z
      .array(socialLinkSchema)
      .min(1)
      .max(30),
  }),
});