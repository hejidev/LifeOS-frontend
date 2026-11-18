"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.consumeLimit = consumeLimit;
exports.rateLimitUser = rateLimitUser;
const redis_1 = require("../config/redis");
const errors_1 = require("./errors");
async function consumeLimit(key, limit, windowSeconds, message) {
    let count;
    let ttl = windowSeconds;
    try {
        count = await redis_1.redis.incr(key);
        if (count === 1)
            await redis_1.redis.expire(key, windowSeconds);
        else if (count > limit)
            ttl = await redis_1.redis.ttl(key);
    }
    catch (error) {
        console.error("[rate-limit] redis unavailable:", error.message);
        return;
    }
    if (count > limit) {
        const minutes = Math.max(1, Math.ceil(ttl / 60));
        throw new errors_1.AppError(`${message} Try again in about ${minutes} ${minutes === 1 ? "minute" : "minutes"}.`, 429);
    }
}
function rateLimitUser(name, limit, windowSeconds, message) {
    return (req, _res, next) => {
        consumeLimit(`rl:${name}:${req.user.id}`, limit, windowSeconds, message).then(() => next(), next);
    };
}
