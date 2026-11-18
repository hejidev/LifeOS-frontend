import { z } from "zod";

export const chatMessageSchema = z.object({
  body: z.object({
    message: z.string().trim().min(1).max(2000),
    conversationId: z.string().uuid().optional(),
  }),
});

export const conversationParamsSchema = z.object({ params: z.object({ id: z.string().uuid() }) });