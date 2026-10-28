import { prisma } from "../config/prisma";
import { logger } from "../lib/logger";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";
const CHUNK_SIZE = 100;

export interface PushMessage {
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

export async function registerUserToken(userId: string, token: string, platform: string) {
  await prisma.pushToken.upsert({
    where: { token },
    update: { userId, staffId: null, bizProfileId: null, platform },
    create: { token, userId, platform },
  });
}

export async function registerStaffToken(staffId: string, bizProfileId: string, token: string, platform: string) {
  await prisma.pushToken.upsert({
    where: { token },
    update: { staffId, bizProfileId, userId: null, platform },
    create: { token, staffId, bizProfileId, platform },
  });
}

export async function removeUserToken(userId: string, token: string) {
  await prisma.pushToken.deleteMany({ where: { token, userId } });
}

export async function removeStaffToken(staffId: string, token: string) {
  await prisma.pushToken.deleteMany({ where: { token, staffId } });
}

async function deliver(tokens: string[], message: PushMessage) {
  if (tokens.length === 0) return;

  const headers: Record<string, string> = { Accept: "application/json", "Content-Type": "application/json" };
  if (process.env.EXPO_ACCESS_TOKEN) headers.Authorization = `Bearer ${process.env.EXPO_ACCESS_TOKEN}`;

  for (let index = 0; index < tokens.length; index += CHUNK_SIZE) {
    const batch = tokens.slice(index, index + CHUNK_SIZE);
    try {
      const response = await fetch(EXPO_PUSH_URL, {
        method: "POST",
        headers,
        body: JSON.stringify(
          batch.map((to) => ({
            to,
            title: message.title,
            body: message.body,
            data: message.data ?? {},
            sound: "default",
            channelId: "default",
            priority: "high",
          }))
        ),
      });

      if (!response.ok) {
        logger.error(`[push] expo responded with ${response.status}`);
        continue;
      }

      const result = (await response.json()) as { data?: { details?: { error?: string } }[] };
      const dead = batch.filter((_, position) => result.data?.[position]?.details?.error === "DeviceNotRegistered");
      if (dead.length > 0) await prisma.pushToken.deleteMany({ where: { token: { in: dead } } });
    } catch (err) {
      logger.error("[push] delivery failed:", err);
    }
  }
}

export async function sendPushToUser(userId: string, message: PushMessage) {
  const rows = await prisma.pushToken.findMany({ where: { userId }, select: { token: true } });
  await deliver(rows.map((row) => row.token), message);
}

export async function sendPushToStaff(staffIds: string[], message: PushMessage) {
  if (staffIds.length === 0) return;
  const rows = await prisma.pushToken.findMany({ where: { staffId: { in: staffIds } }, select: { token: true } });
  await deliver(rows.map((row) => row.token), message);
}