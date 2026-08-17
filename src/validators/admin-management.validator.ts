import { z } from "zod";

export const changeRoleSchema = z.object({
  body: z.object({ role: z.enum(["USER", "ADMIN", "SUPER_ADMIN"]) }),
});

export const createAdminSchema = z.object({
  body: z.object({
    name: z.string().trim().min(2).max(80),
    email: z.string().trim().toLowerCase().email(),
    password: z.string().min(8).max(72).regex(/[a-z]/).regex(/[A-Z]/).regex(/[0-9]/),
  }),
});

export const permissionSchema = z.object({
  body: z.object({
    capability: z.enum(["MANAGE_USERS", "MANAGE_MERCHANTS", "MANAGE_CONTENT", "SEND_BROADCASTS", "VIEW_ANALYTICS", "MESSAGE_USERS"]),
  }),
});

export const broadcastSchema = z.object({
  body: z.object({
    title: z.string().trim().min(1).max(120),
    message: z.string().trim().min(1).max(1000),
    audience: z.enum(["ALL", "USERS", "MERCHANTS"]),
  }),
});

export const supportReasonSchema = z.object({
  body: z.object({
    reason: z.string().trim().min(8).max(500),
  }),
});

export const supportEmailChangeSchema = z.object({
  body: z.object({
    email: z.string().trim().toLowerCase().email(),
    reason: z.string().trim().min(8).max(500),
  }),
});

export const deleteUserSchema = z.object({
  body: z.object({
    confirmationEmail: z.string().trim().toLowerCase().email(),
    reason: z.string().trim().min(8).max(500),
  }),
});

export const confirmSupportEmailChangeSchema = z.object({
  body: z.object({ token: z.string().trim().length(64) }),
});
