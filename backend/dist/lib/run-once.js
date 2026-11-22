"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runOnce = runOnce;
const redis_1 = require("../config/redis");
async function runOnce(name, ttlSeconds, job) {
    let claimed;
    try {
        claimed = await redis_1.redis.set(`cron:${name}`, String(process.pid), "EX", ttlSeconds, "NX");
    }
    catch {
        claimed = "OK";
    }
    if (claimed !== "OK")
        return false;
    await job();
    return true;
}
