import { z } from "zod";

export const adjustStockSchema = z.object({
  body: z.object({
    delta: z
      .number()
      .int()
      .refine((value) => value !== 0, "The quantity can't be zero")
      .refine((value) => Math.abs(value) <= 100000, "That quantity is too large"),
    reason: z.enum(["RECEIVED", "DAMAGED", "EXPIRED", "COUNT_CORRECTION", "RETURNED_TO_SUPPLIER", "OTHER"]),
    note: z.string().trim().max(200).optional(),
    storeId: z.string().uuid().optional(),
  }),
});

export const collectPaymentSchema = z.object({
  body: z.object({ paymentMethod: z.enum(["CASH", "CARD", "TRANSFER", "MOBILE_MONEY"]) }),
});