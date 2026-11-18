import { prisma } from "../config/prisma";

export interface UserClock {
  zone: string;
  weekStartsOn: number;
}

const TTL_MS = 60_000;
const MAX_ENTRIES = 5_000;
const cache = new Map<string, { clock: UserClock; expires: number }>();

export async function getUserClock(userId: string): Promise<UserClock> {
  const hit = cache.get(userId);
  if (hit && hit.expires > Date.now()) return hit.clock;

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { timezone: true, weekStartsOn: true } });
  const weekStartsOn = user?.weekStartsOn;
  const clock: UserClock = {
    zone: user?.timezone || "Africa/Lagos",
    weekStartsOn: Number.isInteger(weekStartsOn) && weekStartsOn! >= 0 && weekStartsOn! <= 6 ? weekStartsOn! : 1,
  };

  if (cache.size >= MAX_ENTRIES) cache.clear();
  cache.set(userId, { clock, expires: Date.now() + TTL_MS });
  return clock;
}

export function invalidateUserClock(userId: string) {
  cache.delete(userId);
}