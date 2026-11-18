import type { NextFunction, Response } from "express";
import { redis } from "../config/redis";
import { AppError } from "./errors";
import type { AuthenticatedRequest } from "../middlewares/auth.middleware";

export async function consumeLimit(key: string, limit: number, windowSeconds: number, message: string) {
  let count: number;
  let ttl = windowSeconds;

  try {
    count = await redis.incr(key);
    if (count === 1) await redis.expire(key, windowSeconds);
    else if (count > limit) ttl = await redis.ttl(key);
  } catch (error) {
    console.error("[rate-limit] redis unavailable:", (error as Error).message);
    return;
  }

  if (count > limit) {
    const minutes = Math.max(1, Math.ceil(ttl / 60));
    throw new AppError(`${message} Try again in about ${minutes} ${minutes === 1 ? "minute" : "minutes"}.`, 429);
  }
}

export function rateLimitUser(name: string, limit: number, windowSeconds: number, message: string) {
  return (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
    consumeLimit(`rl:${name}:${req.user!.id}`, limit, windowSeconds, message).then(() => next(), next);
  };
}