import { z } from "zod";

const tokenPattern = /^Expo(nent)?PushToken\[[A-Za-z0-9_-]+\]$/;

const attachmentSchema = z.object({
  type: z.enum(["PRODUCT", "SALE"]),
  id: z.string().trim().min(1).max(64),
});

export const sendChatMessageSchema = z.object({
  body: z
    .object({
      body: z.string().trim().max(2000).default(""),
      attachment: attachmentSchema.optional(),
    })
    .refine((value) => value.body.length > 0 || !!value.attachment, { message: "Write a message or attach something." }),
});

export const pushTokenSchema = z.object({
  body: z.object({ token: z.string().regex(tokenPattern), platform: z.string().max(20) }),
});

export const pushTokenRemovalSchema = z.object({
  body: z.object({ token: z.string().regex(tokenPattern) }),
});