import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { env } from "./env";
import { logger } from "../lib/logger";

const requestedMax = Number(process.env.DB_POOL_MAX);
const poolMax = Number.isInteger(requestedMax) && requestedMax >= 2 ? requestedMax : 20;

const pool = new Pool({
  connectionString: env.DATABASE_URL,
  max: poolMax,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 8_000,
  keepAlive: true,
});

pool.on("error", (err) => {
  logger.error("[db] idle connection error:", err);
});

const adapter = new PrismaPg(pool);

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1500;
const RETRYABLE_CODES = new Set(["57P03", "57P01", "08006", "08003", "08001"]);
const READ_OPERATIONS = new Set([
  "findUnique",
  "findUniqueOrThrow",
  "findFirst",
  "findFirstOrThrow",
  "findMany",
  "count",
  "aggregate",
  "groupBy",
  "$queryRaw",
  "queryRaw",
]);

function errorText(err: any) {
  return String(err?.message ?? "");
}

function isRetryable(err: any): boolean {
  const code = err?.code ?? err?.meta?.code ?? err?.cause?.code;
  if (RETRYABLE_CODES.has(code)) return true;
  const message = errorText(err);
  return (
    message.includes("57P03") ||
    message.includes("recovery mode") ||
    message.includes("Connection terminated") ||
    message.includes("ECONNREFUSED") ||
    message.includes("terminating connection")
  );
}

function neverReachedDatabase(err: any): boolean {
  const code = err?.code ?? err?.meta?.code ?? err?.cause?.code;
  const message = errorText(err);
  return code === "57P03" || message.includes("57P03") || message.includes("recovery mode") || message.includes("starting up") || message.includes("ECONNREFUSED");
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const basePrisma = new PrismaClient({
  adapter,
  log: ["warn", "error"],
});

export const prisma = basePrisma.$extends({
  query: {
    async $allOperations({ operation, model, args, query }) {
      let attempt = 0;
      while (true) {
        try {
          return await query(args);
        } catch (err: any) {
          attempt += 1;
          const safeToRetry = READ_OPERATIONS.has(operation) ? isRetryable(err) : neverReachedDatabase(err);
          if (attempt > MAX_RETRIES || !safeToRetry) throw err;
          logger.warn(`[prisma] retryable error on ${model ?? "raw"}.${operation} (attempt ${attempt}/${MAX_RETRIES}), retrying in ${RETRY_DELAY_MS}ms`);
          await delay(RETRY_DELAY_MS);
        }
      }
    },
  },
});