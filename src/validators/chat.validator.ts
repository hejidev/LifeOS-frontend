import { z } from "zod";

const tokenPattern = /^Expo(nent)?PushToken\[[A-Za-z0-9_-]+\]$/;

export const sendChatMessageSchema = z.object({
  body: z.object({ body: z.string().trim().min(1).max(2000) }),
});

export const pushTokenSchema = z.object({
  body: z.object({ token: z.string().regex(tokenPattern), platform: z.string().max(20) }),
});

export const pushTokenRemovalSchema = z.object({
  body: z.object({ token: z.string().regex(tokenPattern) }),
});