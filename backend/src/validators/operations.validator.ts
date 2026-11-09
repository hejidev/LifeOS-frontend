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
  body: z.object({
    paymentMethod: z.enum(["CASH", "CARD", "TRANSFER", "MOBILE_MONEY"]),
    amount: z.number().finite().positive().max(1_000_000_000).optional(),
  }),
});

const cashAmount = z.number().finite().min(0).max(1_000_000_000);

export const openRegisterSchema = z.object({
  body: z.object({ openingFloat: cashAmount, storeId: z.string().uuid().optional() }),
});

export const registerMovementSchema = z.object({
  body: z.object({
    kind: z.enum(["PAY_IN", "PAY_OUT"]),
    amount: z.number().finite().positive().max(1_000_000_000),
    reason: z.string().trim().min(2).max(100),
    storeId: z.string().uuid().optional(),
  }),
});

export const closeRegisterSchema = z.object({
  body: z.object({ countedCash: cashAmount, note: z.string().trim().max(200).optional(), storeId: z.string().uuid().optional() }),
});