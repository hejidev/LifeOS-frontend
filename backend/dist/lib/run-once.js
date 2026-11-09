"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runOnce = runOnce;
const redis_1 = require("../config/redis");
async function runOnce(name, lockSeconds, job) {
    const acquired = await redis_1.redis.set(`cron-lock:${name}`, "1", "EX", lockSeconds, "NX");
    if (acquired !== "OK")
        return;
    await job();
}
