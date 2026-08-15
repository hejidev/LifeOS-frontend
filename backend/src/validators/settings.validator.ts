import { z } from "zod";

export const updateProfileSchema = z.object({
  body: z.object({
    name: z.string().trim().min(1).max(120).optional(),
    avatarUrl: z.string().url().optional(),
    timezone: z.string().max(64).optional(),
    location: z.string().max(120).optional(),
    currency: z.string().length(3).optional(),
  }),
});

export const updatePreferencesSchema = z.object({
  body: z.object({
    darkMode: z.boolean().optional(),
    weekStartsOn: z.number().int().min(0).max(1).optional(),
  }),
});

export const updateNotificationsSchema = z.object({
  body: z.object({
    notifyTasks: z.boolean().optional(),
    notifyCalendar: z.boolean().optional(),
    notifyFinance: z.boolean().optional(),
  }),
});

export const changePasswordSchema = z.object({
  body: z.object({
    currentPassword: z.string().min(8),
    newPassword: z.string().min(8).max(128),
  }),
});