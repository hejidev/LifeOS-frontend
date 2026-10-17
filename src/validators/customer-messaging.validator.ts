import { z } from "zod";

export const sendCustomerMessageSchema = z.object({
  body: z.object({
    customerIds: z.array(z.string().uuid()).min(1).max(500),
    subject: z.string().trim().min(1).max(200),
    body: z.string().trim().min(1).max(5000),
  }),
});