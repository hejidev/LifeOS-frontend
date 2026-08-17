"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pauseStoreSchema = exports.notificationSettingsSchema = exports.reviewApplicationSchema = exports.merchantCheckoutSchema = exports.applyMerchantSchema = void 0;
const zod_1 = require("zod");
exports.applyMerchantSchema = zod_1.z.object({
    body: zod_1.z.object({
        businessName: zod_1.z.string().trim().min(1).max(120),
        category: zod_1.z.enum([
            "RETAIL", "FOOD_BEVERAGE", "SERVICES", "FASHION",
            "ELECTRONICS", "HEALTH_BEAUTY", "EDUCATION", "OTHER",
        ]),
        description: zod_1.z.string().trim().min(10).max(1000),
        contactPhone: zod_1.z.string().trim().min(1).max(32),
        contactEmail: zod_1.z.string().email(),
        address: zod_1.z.string().trim().min(1).max(255),
        currency: zod_1.z.string().trim().length(3).default("USD"),
        idDocumentType: zod_1.z.enum(["NATIONAL_ID", "PASSPORT", "DRIVERS_LICENSE", "VOTERS_CARD"]),
        idDocumentNumber: zod_1.z.string().trim().min(3).max(64),
        idFrontUrl: zod_1.z.string().url(),
        idBackUrl: zod_1.z.string().url().optional(),
    }),
});
exports.merchantCheckoutSchema = zod_1.z.object({
    body: zod_1.z.object({
        plan: zod_1.z.enum(["STARTER", "GROWTH", "PRO"]),
        interval: zod_1.z.enum(["month", "year"]).default("month"),
    }),
});
exports.reviewApplicationSchema = zod_1.z.object({
    body: zod_1.z.object({
        action: zod_1.z.enum(["APPROVE", "REJECT", "SUSPEND", "REACTIVATE"]),
        rejectionReason: zod_1.z.string().max(500).optional(),
    }),
});
exports.notificationSettingsSchema = zod_1.z.object({
    body: zod_1.z.object({
        notifyLowStock: zod_1.z.boolean().optional(),
        notifyNewSale: zod_1.z.boolean().optional(),
        notifyDailySummary: zod_1.z.boolean().optional(),
    }),
});
exports.pauseStoreSchema = zod_1.z.object({
    body: zod_1.z.object({ paused: zod_1.z.boolean() }),
});
