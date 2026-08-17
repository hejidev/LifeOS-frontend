import { z } from "zod";

export const createMemberSchema = z.object({
  body: z.object({
    name: z.string().trim().min(1).max(100),
    role: z.enum(["PARENT", "GUARDIAN", "CHILD"]),
    device: z.string().optional(),
    locationSharing: z.boolean().optional(),
  }),
});

export const updateMemberSchema = z.object({
  body: z.object({
    name: z.string().trim().min(1).max(100).optional(),
    role: z.enum(["PARENT", "GUARDIAN", "CHILD"]).optional(),
    device: z.string().optional(),
    locationSharing: z.boolean().optional(),
    status: z.enum(["ONLINE", "OFFLINE", "AWAY"]).optional(),
    screenTimeMinutesToday: z.number().int().min(0).optional(),
    avatarUrl: z.string().url().optional(),
  }),
});

export const createControlSchema = z.object({
  body: z.object({
    memberId: z.string().uuid().optional(),
    title: z.string().trim().min(1).max(150),
    description: z.string().optional(),
    enabled: z.boolean().optional(),
    value: z.string().optional(),
  }),
});

export const updateControlSchema = z.object({
  body: z.object({
    title: z.string().trim().min(1).max(150).optional(),
    description: z.string().optional(),
    enabled: z.boolean().optional(),
    value: z.string().optional(),
  }),
});

export const createInviteSchema = z.object({
  body: z.object({
    email: z.string().trim().toLowerCase().email(),
    role: z.enum(["PARENT", "GUARDIAN", "CHILD"]).default("CHILD"),
  }),
});

export const acceptInviteSchema = z.object({
  body: z.object({
    token: z.string().min(1),
    name: z.string().trim().min(1).max(100),
  }),
});