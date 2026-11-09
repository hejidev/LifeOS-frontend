import { redis } from "../config/redis";

export async function runOnce(name: string, lockSeconds: number, job: () => Promise<void>) {
  const acquired = await redis.set(`cron-lock:${name}`, "1", "EX", lockSeconds, "NX");
  if (acquired !== "OK") return;
  await job();
}