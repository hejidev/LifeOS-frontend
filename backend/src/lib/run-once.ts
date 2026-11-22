import { redis } from "../config/redis";

export async function runOnce(name: string, ttlSeconds: number, job: () => Promise<unknown>) {
  let claimed: string | null;
  try {
    claimed = await redis.set(`cron:${name}`, String(process.pid), "EX", ttlSeconds, "NX");
  } catch {
    claimed = "OK";
  }
  if (claimed !== "OK") return false;
  await job();
  return true;
}