import { z } from "zod";

export const teamMemberSchema = z.object({
  body: z.object({
    name: z.string().trim().min(1).max(100),
    role: z.string().trim().min(1).max(100),
    bio: z.string().max(500).optional(),
    imageUrl: z.string().url().optional(),
    linkedinUrl: z.string().url().optional(),
    twitterUrl: z.string().url().optional(),
    githubUrl: z.string().url().optional(),
    isFounder: z.boolean().optional(),
    order: z.number().int().optional(),
  }),
});

export const testimonialSchema = z.object({
  body: z.object({
    quote: z.string().trim().min(1).max(500),
    name: z.string().trim().min(1).max(100),
    role: z.string().max(150).optional(),
    avatarUrl: z.string().url().optional(),
    order: z.number().int().optional(),
  }),
});