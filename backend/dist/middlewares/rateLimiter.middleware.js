"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.twoFactorRateLimiter = exports.registerRateLimiter = exports.loginRateLimiter = void 0;
const redis_1 = require("../config/redis");
const errors_1 = require("../lib/errors");
function rateLimit({ windowSeconds, max, keyFn, }) {
    return async (req, _res, next) => {
        const key = `ratelimit:${keyFn(req)}`;
        const count = await redis_1.redis.incr(key);
        if (count === 1)
            await redis_1.redis.expire(key, windowSeconds);
        if (count > max) {
            return next(new errors_1.AppError("Too many attempts, please try again later", 429));
        }
        next();
    };
}
exports.loginRateLimiter = rateLimit({
    windowSeconds: 15 * 60,
    max: 100,
    keyFn: (req) => `login:${req.ip}:${(req.body?.email ?? "").toLowerCase()}`,
});
exports.registerRateLimiter = rateLimit({
    windowSeconds: 60 * 60,
    max: 5,
    keyFn: (req) => `register:${req.ip}`,
});
exports.twoFactorRateLimiter = rateLimit({
    windowSeconds: 15 * 60,
    max: 8,
    keyFn: (req) => `two-factor:${req.ip}`,
});
