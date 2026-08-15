import type { Request, Response, NextFunction } from "express";
import { redis } from "../config/redis";
import { AppError } from "../lib/errors";

function rateLimit({
  windowSeconds,
  max,
  keyFn,
}: {
  windowSeconds: number;
  max: number;
  keyFn: (req: Request) => string;
}) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    const key = `ratelimit:${keyFn(req)}`;
    const count = await redis.incr(key);
    if (count === 1) await redis.expire(key, windowSeconds);

    if (count > max) {
      return next(new AppError("Too many attempts, please try again later", 429));
    }
    next();
  };
}

export const loginRateLimiter = rateLimit({
  windowSeconds: 15 * 60,
  max: 100,
  keyFn: (req) => `login:${req.ip}:${(req.body?.email ?? "").toLowerCase()}`,
});

export const registerRateLimiter = rateLimit({
  windowSeconds: 60 * 60,
  max: 5,
  keyFn: (req) => `register:${req.ip}`,
});

export const twoFactorRateLimiter = rateLimit({
  windowSeconds: 15 * 60,
  max: 8,
  keyFn: (req) => `two-factor:${req.ip}`,
});
