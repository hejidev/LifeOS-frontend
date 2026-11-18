"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deactivateAccountSchema = exports.changePasswordSchema = exports.updateNotificationsSchema = exports.updatePreferencesSchema = exports.updateProfileSchema = exports.SUPPORTED_CURRENCIES = void 0;
const zod_1 = require("zod");
const safe_url_1 = require("../lib/safe-url");
exports.SUPPORTED_CURRENCIES = [
    "NGN", "USD", "EUR", "GBP", "GHS", "ZAR", "KES", "CAD", "AUD", "AED", "CNY", "INR", "JPY",
    "XOF", "XAF", "EGP", "TZS", "UGX", "RWF", "BRL", "MXN", "SGD", "CHF", "SAR",
];
const validZone = (value) => {
    try {
        new Intl.DateTimeFormat("en-US", { timeZone: value });
        return true;
    }
    catch {
        return false;
    }
};
exports.updateProfileSchema = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z.string().trim().min(1).max(100).optional(),
        avatarUrl: safe_url_1.webUrl.optional(),
        timezone: zod_1.z.string().trim().max(64).refine(validZone, "Choose a valid timezone").optional(),
        location: zod_1.z.string().trim().max(100).optional(),
        currency: zod_1.z.string().trim().toUpperCase().refine((value) => exports.SUPPORTED_CURRENCIES.includes(value), "Choose a supported currency").optional(),
    }),
});
exports.updatePreferencesSchema = zod_1.z.object({
    body: zod_1.z.object({ darkMode: zod_1.z.boolean().optional(), weekStartsOn: zod_1.z.number().int().min(0).max(6).optional() }),
});
exports.updateNotificationsSchema = zod_1.z.object({
    body: zod_1.z.object({ notifyTasks: zod_1.z.boolean().optional(), notifyCalendar: zod_1.z.boolean().optional(), notifyFinance: zod_1.z.boolean().optional() }),
});
exports.changePasswordSchema = zod_1.z.object({
    body: zod_1.z.object({ currentPassword: zod_1.z.string().min(1).max(128), newPassword: zod_1.z.string().min(12).max(72) }),
});
exports.deactivateAccountSchema = zod_1.z.object({
    body: zod_1.z.object({ password: zod_1.z.string().max(128).optional(), confirmEmail: zod_1.z.string().trim().toLowerCase().max(254).optional() }).default({}),
});
