// src/validators/dm.validator.ts
import { z } from "zod";

export const startConversationSchema = z.object({
  body: z.object({ userId: z.string().uuid(), message: z.string().trim().min(1).max(2000) }),
});

export const sendMessageSchema = z.object({
  body: z.object({ body: z.string().trim().min(1).max(2000) }),
});

export const contactSupportSchema = z.object({ 
  body: z.object({ message: z.string().trim().min(1).max(2000) }) 
});