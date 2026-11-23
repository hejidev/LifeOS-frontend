import { z } from "zod";
import { webUrl } from "../lib/safe-url";

export const SUPPORTED_CURRENCIES = [
  "NGN", "USD", "EUR", "GBP", "GHS", "ZAR", "KES", "CAD", "AUD", "AED", "CNY", "INR", "JPY",
  "XOF", "XAF", "EGP", "TZS", "UGX", "RWF", "BRL", "MXN", "SGD", "CHF", "SAR",
];

const validZone = (value: string) => {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value });
    return true;
  } catch {
    return false;
  }
};

export const updateProfileSchema = z.object({
  body: z.object({
    name: z.string().trim().min(1).max(100).optional(),
    avatarUrl: webUrl.optional(),
    timezone: z.string().trim().max(64).refine(validZone, "Choose a valid timezone").optional(),
    location: z.string().trim().max(100).optional(),
    currency: z.string().trim().toUpperCase().refine((value) => SUPPORTED_CURRENCIES.includes(value), "Choose a supported currency").optional(),
  }),
});

export const updatePreferencesSchema = z.object({
  body: z.object({ darkMode: z.boolean().optional(), weekStartsOn: z.number().int().min(0).max(6).optional() }),
});

export const updateNotificationsSchema = z.object({
  body: z.object({ notifyTasks: z.boolean().optional(),
    notifyCalendar: z.boolean().optional(),
    notifyFinance: z.boolean().optional() }),
    notifyWeekly: z.boolean().optional(),
    notifyDocuments: z.boolean().optional(),
});

export const changePasswordSchema = z.object({
  body: z.object({ currentPassword: z.string().min(1).max(128), newPassword: z.string().min(12).max(72) }),
});

export const deactivateAccountSchema = z.object({
  body: z.object({ password: z.string().max(128).optional(), confirmEmail: z.string().trim().toLowerCase().max(254).optional() }).default({}),
});