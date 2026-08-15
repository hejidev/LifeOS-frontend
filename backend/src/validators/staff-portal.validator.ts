import { z } from "zod";

export const logSelfActivitySchema = z.object({
  body: z.object({
    action: z.enum(["SALE_CREATED", "CUSTOMER_ADDED", "PRODUCT_UPDATED", "REFUND_ISSUED", "OTHER"]),
    description: z.string().trim().min(1).max(300),
  }),
});