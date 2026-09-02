"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = void 0;
const client_1 = require("@prisma/client");
const adapter_pg_1 = require("@prisma/adapter-pg");
const pg_1 = require("pg");
const env_1 = require("./env");
const pool = new pg_1.Pool({ connectionString: env_1.env.DATABASE_URL });
const adapter = new adapter_pg_1.PrismaPg(pool);
const RETRYABLE_CODES = new Set(["57P03", "57P01", "08006", "08003", "08001"]);
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1500;
function isRetryable(err) {
    const code = err?.code ?? err?.meta?.code ?? err?.cause?.code;
    if (RETRYABLE_CODES.has(code))
        return true;
    const message = String(err?.message ?? "");
    return (message.includes("57P03") ||
        message.includes("recovery mode") ||
        message.includes("Connection terminated") ||
        message.includes("ECONNREFUSED") ||
        message.includes("terminating connection"));
}
function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
const basePrisma = new client_1.PrismaClient({
    adapter,
    log: ["warn", "error"],
});
exports.prisma = basePrisma.$extends({
    query: {
        async $allOperations({ operation, model, args, query }) {
            let attempt = 0;
            while (true) {
                try {
                    return await query(args);
                }
                catch (err) {
                    attempt += 1;
                    if (attempt > MAX_RETRIES || !isRetryable(err))
                        throw err;
                    console.warn(`[prisma] retryable error on ${model}.${operation} (attempt ${attempt}/${MAX_RETRIES}), retrying in ${RETRY_DELAY_MS}ms...`);
                    await delay(RETRY_DELAY_MS);
                }
            }
        },
    },
});
