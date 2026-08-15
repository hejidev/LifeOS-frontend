import { z } from "zod";

export const applyMerchantSchema = z.object({
  body: z.object({
    businessName: z.string().trim().min(1).max(120),
    category: z.enum([
      "RETAIL", "FOOD_BEVERAGE", "SERVICES", "FASHION",
      "ELECTRONICS", "HEALTH_BEAUTY", "EDUCATION", "OTHER",
    ]),
    description: z.string().trim().min(10).max(1000),
    contactPhone: z.string().trim().min(1).max(32),
    contactEmail: z.string().email(),
    address: z.string().trim().min(1).max(255),
    currency: z.string().trim().length(3).default("USD"),
    idDocumentType: z.enum(["NATIONAL_ID", "PASSPORT", "DRIVERS_LICENSE", "VOTERS_CARD"]),
    idDocumentNumber: z.string().trim().min(3).max(64),
    idFrontUrl: z.string().url(),
    idBackUrl: z.string().url().optional(),
  }),
});

export const merchantCheckoutSchema = z.object({
  body: z.object({
    plan: z.enum(["STARTER", "GROWTH", "PRO"]),
    interval: z.enum(["month", "year"]).default("month"),
  }),
});

export const reviewApplicationSchema = z.object({
    body: z.object({
      action: z.enum(["APPROVE", "REJECT", "SUSPEND", "REACTIVATE"]),
      rejectionReason: z.string().max(500).optional(),
    }),
  });

  export const notificationSettingsSchema = z.object({
    body: z.object({
      notifyLowStock: z.boolean().optional(),
      notifyNewSale: z.boolean().optional(),
      notifyDailySummary: z.boolean().optional(),
    }),
  });
  
  export const pauseStoreSchema = z.object({
    body: z.object({ paused: z.boolean() }),
  });