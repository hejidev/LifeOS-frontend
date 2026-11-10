import http from "http";
import https from "https";
import { monitorEventLoopDelay } from "perf_hooks";
import { Prisma } from "@prisma/client";
import type { Request } from "express";
import { prisma } from "../config/prisma";
import { AppError } from "../lib/errors";
import { logger } from "../lib/logger";
import { loadTestHeader } from "../lib/loadtest-signature";
import * as businessService from "./business.service";
import { signAccessToken } from "./token.service";

export type TargetKey = "public" | "user" | "merchant" | "admin" | "super_admin";
type FixtureKey = "user" | "merchant" | "admin";

interface Ctx {
  storeId: string;
  date: string;
}

type PathSpec = string | ((ctx: Ctx) => string);

const ep = (path: PathSpec) => ({ path: typeof path === "string" ? () => path : path });

export const TARGETS: Record<TargetKey, { label: string; endpoints: { path: (ctx: Ctx) => string }[] }> = {
  public: { label: "Public API", endpoints: [ep("/ping"), ep("/ping/db")] },
  user: {
    label: "User dashboard",
    endpoints: [
      ep("/overview/today"),
      ep("/tasks"),
      ep("/notes"),
      ep("/finance/dashboard"),
      ep("/health/summary"),
      ep("/health/habits/summary"),
      ep("/goals"),
      ep("/calendar?range=month"),
      ep("/documents/dashboard"),
      ep("/study/dashboard?range=month"),
      ep("/career/dashboard"),
      ep("/settings/profile"),
      ep("/settings/overview"),
      ep("/notifications/unread-count"),
    ],
  },
  merchant: {
    label: "Merchant dashboard",
    endpoints: [
      ep("/merchant/status"),
      ep("/business/profile"),
      ep("/stores"),
      ep((c) => `/business/dashboard?range=month&storeId=${c.storeId}`),
      ep((c) => `/business/products?active=true&storeId=${c.storeId}`),
      ep((c) => `/business/sales?range=month&storeId=${c.storeId}`),
      ep("/business/customers"),
      ep((c) => `/business/analytics?range=month&storeId=${c.storeId}`),
      ep((c) => `/ops/attention?storeId=${c.storeId}`),
      ep((c) => `/ops/reports/daily?date=${c.date}&offset=0&storeId=${c.storeId}`),
      ep((c) => `/ops/register/current?storeId=${c.storeId}`),
      ep("/merchant/staff"),
      ep("/merchant/chat/threads"),
      ep("/notifications/unread-count"),
    ],
  },
  admin: {
    label: "Admin dashboard",
    endpoints: [
      ep("/platform-admin/overview"),
      ep("/platform-admin/users"),
      ep("/platform-admin/tenants"),
      ep("/platform-admin/audit-log"),
      ep("/platform-admin/my-permissions"),
    ],
  },
  super_admin: {
    label: "Super admin dashboard",
    endpoints: [
      ep("/platform-admin/overview"),
      ep("/platform-admin/users"),
      ep("/platform-admin/tenants"),
      ep("/platform-admin/billing"),
      ep("/platform-admin/analytics"),
      ep("/platform-admin/audit-log"),
      ep("/security/overview"),
      ep("/security/flagged-accounts"),
      ep("/security/login-attempts"),
      ep("/platform-admin/my-permissions"),
    ],
  },
};

const FIXTURES = {
  user: { email: "loadtest-user@lifeos.invalid", name: "Load Test User", role: "USER" },
  merchant: { email: "loadtest-merchant@lifeos.invalid", name: "Load Test Merchant", role: "USER" },
  admin: { email: "loadtest-admin@lifeos.invalid", name: "Load Test Admin", role: "ADMIN" },
} as const;

const FIXTURE_KEYS: FixtureKey[] = ["user", "merchant", "admin"];
const CAPABILITIES = ["MANAGE_USERS", "MANAGE_MERCHANTS", "MANAGE_CONTENT", "SEND_BROADCASTS", "VIEW_ANALYTICS", "MESSAGE_USERS"] as const;
const LIMITS = { concurrency: 100, durationSec: 60, rampUpSec: 15, requests: 50_000, timeoutMs: 15_000 };
const SEED_TARGET = { products: 40, customers: 25, sales: 150 };
const CATEGORIES = ["Drinks", "Snacks", "Household", "Beauty", "Stationery"];

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const round1 = (value: number) => Math.round(value * 10) / 10;
const pick = <T>(items: T[]): T => items[Math.floor(Math.random() * items.length)];

export function baseUrlOf(req: Request) {
  const configured = process.env.LOADTEST_BASE_URL;
  if (configured) return configured.replace(/\/$/, "");
  if (process.env.NODE_ENV === "production") {
    throw new AppError("Set LOADTEST_BASE_URL on the server first (your API's public address, for example https://api.lifeos.com.ng).", 500);
  }
  const proto = String(req.get("x-forwarded-proto") ?? req.protocol).split(",")[0];
  return `${proto}://${req.get("host")}`;
}

interface Timed {
  status: number;
  ms: number;
  instance: string | null;
}

async function timedFetch(url: string, token: string | undefined, header: string | undefined): Promise<Timed> {
  const started = performance.now();
  try {
    const res = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": "LifeOS-LoadTest/1",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(header ? { "X-LoadTest": header } : {}),
      },
      signal: AbortSignal.timeout(LIMITS.timeoutMs),
    });
    await res.arrayBuffer();
    return { status: res.status, ms: performance.now() - started, instance: res.headers.get("x-instance") };
  } catch {
    return { status: 0, ms: performance.now() - started, instance: null };
  }
}

function freshGet(url: string): Promise<Timed> {
  return new Promise((resolve) => {
    const started = performance.now();
    const target = new URL(url);
    const client = target.protocol === "https:" ? https : http;
    const request = client.request(
      target,
      { method: "GET", agent: false, timeout: LIMITS.timeoutMs, headers: { Connection: "close", "User-Agent": "LifeOS-Probe/1" } },
      (res) => {
        res.resume();
        res.on("end", () => {
          const header = res.headers["x-instance"];
          resolve({ status: res.statusCode ?? 0, ms: performance.now() - started, instance: Array.isArray(header) ? header[0] : header ?? null });
        });
      }
    );
    request.on("timeout", () => request.destroy());
    request.on("error", () => resolve({ status: 0, ms: performance.now() - started, instance: null }));
    request.end();
  });
}

async function runPool<T>(items: T[], size: number, task: (item: T, index: number) => Promise<void>) {
  let cursor = 0;
  await Promise.all(
    Array.from({ length: Math.min(size, items.length) }, async () => {
      while (cursor < items.length) {
        const index = cursor;
        cursor += 1;
        await task(items[index], index);
      }
    })
  );
}

async function ensureUser(key: FixtureKey) {
  const spec = FIXTURES[key];
  const found = await prisma.user.findUnique({ where: { email: spec.email } });
  if (found) return found;
  return prisma.user.create({
    data: { email: spec.email, name: spec.name, role: spec.role as any, isActive: false, emailVerified: true },
  });
}

async function activateFixture(key: FixtureKey) {
  const spec = FIXTURES[key];
  await ensureUser(key);
  const user = await prisma.user.update({ where: { email: spec.email }, data: { isActive: true, role: spec.role as any } });
  return { userId: user.id, token: signAccessToken({ sub: user.id, role: user.role, sv: user.sessionVersion }) };
}

async function releaseFixtures(keys: FixtureKey[]) {
  if (keys.length === 0) return;
  await prisma.user
    .updateMany({
      where: { email: { in: keys.map((key) => FIXTURES[key].email) } },
      data: { isActive: false, sessionVersion: { increment: 1 } },
    })
    .catch((err) => logger.error("[loadtest] couldn't switch the test accounts off:", err));
}

async function merchantContext(userId: string) {
  const profile = await prisma.bizProfile.findUnique({ where: { userId } });
  const store = profile ? await prisma.store.findFirst({ where: { bizProfileId: profile.id, isDefault: true } }) : null;
  const products = await prisma.bizProduct.count({ where: { userId } });
  if (!profile || !store || products < 10) throw new Error("the test merchant has no data yet. Use Prepare test data first");
  return store.id;
}

async function seedMerchant(userId: string) {
  const profile = await prisma.bizProfile.upsert({
    where: { userId },
    update: { status: "APPROVED", planStatus: "ACTIVE", paused: false },
    create: { userId, businessName: "Load Test Merchant", status: "APPROVED", planTier: "PRO", planStatus: "ACTIVE" },
  });
  const store =
    (await prisma.store.findFirst({ where: { bizProfileId: profile.id, isDefault: true } })) ??
    (await prisma.store.create({ data: { bizProfileId: profile.id, name: "Load Test Store", isDefault: true, active: true } }));

  const created = { products: 0, customers: 0, sales: 0 };

  const productCount = await prisma.bizProduct.count({ where: { userId } });
  const newProducts = Array.from({ length: Math.max(0, SEED_TARGET.products - productCount) }, (_, index) => productCount + index + 1);
  await runPool(newProducts, 4, async (n) => {
    const price = Math.round((200 + Math.random() * 8800) / 50) * 50;
    await businessService.createProduct(
      userId,
      {
        name: `Test Item ${String(n).padStart(3, "0")}`,
        category: pick(CATEGORIES),
        barcode: `LT-${userId.slice(0, 6)}-${n}`,
        price,
        cost: Math.round(price * (0.55 + Math.random() * 0.25)),
        stock: 400,
        lowStockAt: 5,
      },
      store.id
    );
    created.products += 1;
  });

  const customerCount = await prisma.bizCustomer.count({ where: { userId } });
  const newCustomers = Array.from({ length: Math.max(0, SEED_TARGET.customers - customerCount) }, (_, index) => customerCount + index + 1);
  await runPool(newCustomers, 4, async (n) => {
    await businessService.createCustomer(userId, { name: `Test Customer ${n}`, phone: `0800000${String(n).padStart(4, "0")}` });
    created.customers += 1;
  });

  const saleCount = await prisma.bizSale.count({ where: { userId } });
  const salesToMake = Math.max(0, SEED_TARGET.sales - saleCount);
  if (salesToMake > 0) {
    const products = await prisma.bizProduct.findMany({ where: { userId, active: true }, take: 60 });
    const customers = await prisma.bizCustomer.findMany({ where: { userId }, select: { id: true }, take: 60 });
    const methods = ["CASH", "CARD", "TRANSFER", "MOBILE_MONEY"];
    await runPool(Array.from({ length: salesToMake }), 3, async (_, index) => {
      const lines = Array.from({ length: 1 + Math.floor(Math.random() * 3) }, () => {
        const product = pick(products);
        return { productId: product.id, name: product.name, quantity: 1 + Math.floor(Math.random() * 3), unitPrice: Number(product.price) };
      });
      const credit = index % 19 === 0 && customers.length > 0;
      await businessService.createSale(
        userId,
        {
          items: lines,
          paymentMethod: pick(methods),
          status: credit ? "PENDING" : "PAID",
          customerId: credit || Math.random() < 0.5 ? pick(customers).id : undefined,
          offline: true,
          soldAt: new Date(Date.now() - Math.random() * 14 * 86_400_000),
        },
        store.id
      );
      created.sales += 1;
    });
  }
  return created;
}

export async function seedFixtures() {
  const [user, merchant, admin] = await Promise.all([ensureUser("user"), ensureUser("merchant"), ensureUser("admin")]);
  await Promise.all(
    CAPABILITIES.map((capability) =>
      prisma.adminPermission.upsert({
        where: { userId_capability: { userId: admin.id, capability } },
        update: {},
        create: { userId: admin.id, capability, grantedBy: admin.id },
      })
    )
  );
  const created = await seedMerchant(merchant.id);
  return { users: [user.email, merchant.email, admin.email], created };
}

export async function fixtureStatus() {
  const rows = await prisma.user.findMany({
    where: { email: { in: FIXTURE_KEYS.map((key) => FIXTURES[key].email) } },
    select: { id: true, email: true },
  });
  const byEmail = new Map(rows.map((row) => [row.email, row.id]));
  const merchantId = byEmail.get(FIXTURES.merchant.email);
  const [products, customers, sales] = merchantId
    ? await Promise.all([
      prisma.bizProduct.count({ where: { userId: merchantId } }),
      prisma.bizCustomer.count({ where: { userId: merchantId } }),
      prisma.bizSale.count({ where: { userId: merchantId } }),
    ])
    : [0, 0, 0];
  return {
    user: { exists: byEmail.has(FIXTURES.user.email), email: FIXTURES.user.email },
    admin: { exists: byEmail.has(FIXTURES.admin.email), email: FIXTURES.admin.email },
    merchant: { exists: !!merchantId, email: FIXTURES.merchant.email, products, customers, sales, ready: products >= 30 && sales >= 100 },
  };
}

export async function removeFixtures() {
  if (await prisma.loadTestRun.findFirst({ where: { status: "RUNNING" } })) throw new AppError("Wait for the running test to finish.", 409);
  const users = await prisma.user.findMany({ where: { email: { in: FIXTURE_KEYS.map((key) => FIXTURES[key].email) } }, select: { id: true } });
  const ids = users.map((user) => user.id);
  if (ids.length === 0) return { removed: 0 };
  const profiles = await prisma.bizProfile.findMany({ where: { userId: { in: ids } }, select: { id: true } });
  const profileIds = profiles.map((profile) => profile.id);
  await prisma.$transaction([
    prisma.salePayment.deleteMany({ where: { bizProfileId: { in: profileIds } } }),
    prisma.stockMovement.deleteMany({ where: { bizProfileId: { in: profileIds } } }),
    prisma.cashSession.deleteMany({ where: { bizProfileId: { in: profileIds } } }),
    prisma.user.deleteMany({ where: { id: { in: ids } } }),
  ]);
  return { removed: ids.length };
}

interface RunConfig {
  targets: TargetKey[];
  concurrency: number;
  durationSec: number;
  rampUpSec: number;
  thinkMs: number;
  direct: boolean;
}

interface Job {
  target: TargetKey;
  label: string;
  url: string;
  token?: string;
}

function validateConfig(raw: RunConfig): RunConfig {
  const targets = [...new Set(raw.targets)].filter((target) => target in TARGETS);
  if (targets.length === 0) throw new AppError("Choose at least one dashboard to test.", 400);
  if (raw.concurrency < 1 || raw.concurrency > LIMITS.concurrency) throw new AppError(`Use 1 to ${LIMITS.concurrency} simulated users.`, 400);
  if (raw.durationSec < 5 || raw.durationSec > LIMITS.durationSec) throw new AppError(`Use a duration of 5 to ${LIMITS.durationSec} seconds.`, 400);
  if (raw.rampUpSec < 0 || raw.rampUpSec > Math.min(LIMITS.rampUpSec, Math.floor(raw.durationSec / 2))) {
    throw new AppError("The ramp-up can be at most half the duration.", 400);
  }
  return {
    targets,
    concurrency: raw.concurrency,
    durationSec: raw.durationSec,
    rampUpSec: raw.rampUpSec,
    thinkMs: Math.min(10000, Math.max(0, Math.round(raw.thinkMs ?? 0))),
    direct: raw.direct === true,
  };
}

async function buildJobs(config: RunConfig, base: string, callerToken: string | undefined, header: string | undefined, warnings: string[], toRelease: Set<FixtureKey>) {
  const jobs: Job[] = [];
  const date = new Date().toISOString().slice(0, 10);

  for (const target of config.targets) {
    const spec = TARGETS[target];
    try {
      let token: string | undefined;
      let ctx: Ctx = { storeId: "", date };

      if (target === "super_admin") {
        if (!callerToken) throw new Error("your session token wasn't available");
        token = callerToken;
      } else if (target !== "public") {
        const key = target as FixtureKey;
        toRelease.add(key);
        const account = await activateFixture(key);
        token = account.token;
        if (key === "merchant") ctx = { storeId: await merchantContext(account.userId), date };
      }

      let usable = 0;
      for (const endpoint of spec.endpoints) {
        const path = endpoint.path(ctx);
        const label = path.split("?")[0];
        const url = `${base}/api${path}`;
        const probe = await timedFetch(url, token, header);
        if (probe.status >= 200 && probe.status < 300) {
          jobs.push({ target, label, url, token });
          usable += 1;
        } else {
          warnings.push(`${spec.label}: ${label} answered ${probe.status || "nothing"} and was skipped.`);
        }
      }
      if (usable === 0) throw new Error("none of its endpoints answered successfully");
    } catch (err) {
      warnings.push(`${spec.label} was skipped: ${err instanceof Error ? err.message : "unknown problem"}.`);
    }
  }
  return jobs;
}

function summarize(latencies: number[]) {
  const sorted = [...latencies].sort((a, b) => a - b);
  const at = (q: number) => (sorted.length === 0 ? 0 : sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))]);
  const sum = sorted.reduce((total, value) => total + value, 0);
  return {
    avgMs: sorted.length ? round1(sum / sorted.length) : 0,
    p50: round1(at(0.5)),
    p95: round1(at(0.95)),
    p99: round1(at(0.99)),
    maxMs: round1(sorted[sorted.length - 1] ?? 0),
  };
}

async function execute(runId: string, config: RunConfig, base: string, callerToken: string | undefined) {
  const warnings: string[] = [];
  const toRelease = new Set<FixtureKey>();
  const header = loadTestHeader(runId);
  const lag = monitorEventLoopDelay({ resolution: 20 });
  lag.enable();

  try {
    const jobs = await buildJobs(config, base, callerToken, header, warnings, toRelease);
    if (jobs.length === 0) throw new Error("Nothing could be tested. See the notes for each skipped dashboard.");

    const endpointStats = new Map<string, { target: TargetKey; label: string; lat: number[]; failed: number; limited: number }>();
    const targetStats = new Map<TargetKey, { lat: number[]; failed: number }>();
    const instances = new Map<string, number>();
    const timeline: { requests: number; failed: number; sumMs: number }[] = [];
    const allLat: number[] = [];
    const dbPings: number[] = [];
    const state = { total: 0, failed: 0, limited: 0, active: 0, cursor: 0, stop: false, reason: null as string | null };
    let recent: { at: number; bad: boolean }[] = [];
    const startedAt = Date.now();
    const endAt = startedAt + config.durationSec * 1000;

    const record = (job: Job, result: Timed) => {
      const isLimited = result.status === 429;
      const isFailed = result.status === 0 || (result.status >= 400 && !isLimited);
      state.total += 1;
      if (isFailed) state.failed += 1;
      if (isLimited) state.limited += 1;
      allLat.push(result.ms);
      recent.push({ at: Date.now(), bad: isFailed });

      const key = `${job.target}|${job.label}`;
      const endpoint = endpointStats.get(key) ?? { target: job.target, label: job.label, lat: [], failed: 0, limited: 0 };
      endpoint.lat.push(result.ms);
      if (isFailed) endpoint.failed += 1;
      if (isLimited) endpoint.limited += 1;
      endpointStats.set(key, endpoint);

      const group = targetStats.get(job.target) ?? { lat: [], failed: 0 };
      group.lat.push(result.ms);
      if (isFailed) group.failed += 1;
      targetStats.set(job.target, group);

      if (result.instance) instances.set(result.instance, (instances.get(result.instance) ?? 0) + 1);

      const second = Math.floor((Date.now() - startedAt) / 1000);
      const slot = (timeline[second] ??= { requests: 0, failed: 0, sumMs: 0 });
      slot.requests += 1;
      slot.sumMs += result.ms;
      if (isFailed) slot.failed += 1;
      if (state.total >= LIMITS.requests && !state.reason) {
        state.reason = "Stopped at the request limit.";
        state.stop = true;
      }
    };

    const snapshot = () => {
      const elapsed = Math.max(1, (Date.now() - startedAt) / 1000);
      const overall = summarize(allLat);
      const counted = [...instances.values()].reduce((sum, value) => sum + value, 0) || 1;
      const length = Math.min(timeline.length, 120);
      const first = timeline.length - length;
      return {
        elapsedSec: round1(Math.min(elapsed, config.durationSec)),
        activeWorkers: state.active,
        requests: state.total,
        failed: state.failed,
        limited: state.limited,
        rps: round1(state.total / elapsed),
        ...overall,
        endpoints: [...endpointStats.values()].map((stat) => ({
          target: stat.target,
          label: stat.label,
          requests: stat.lat.length,
          failed: stat.failed,
          limited: stat.limited,
          ...summarize(stat.lat),
        })),
        targets: [...targetStats].map(([target, stat]) => {
          const figures = summarize(stat.lat);
          return { target, label: TARGETS[target].label, requests: stat.lat.length, failed: stat.failed, avgMs: figures.avgMs, p95: figures.p95 };
        }),
        timeline: Array.from({ length }, (_, index) => {
          const slot = timeline[first + index];
          return {
            second: first + index,
            requests: slot?.requests ?? 0,
            failed: slot?.failed ?? 0,
            avgMs: slot && slot.requests ? round1(slot.sumMs / slot.requests) : 0,
          };
        }),
        instances: [...instances].map(([instance, requests]) => ({ instance, requests, share: round1((requests / counted) * 100) })),
      };
    };

    let ticking = false;
    const ticker = setInterval(async () => {
      if (ticking) return;
      ticking = true;
      try {
        const now = Date.now();
        recent = recent.filter((entry) => entry.at > now - 5000);
        if (!state.reason && recent.length >= 30 && recent.filter((entry) => entry.bad).length / recent.length > 0.4) {
          state.reason = "Stopped automatically: more than 40% of requests were failing.";
          state.stop = true;
        }

        const pingStart = performance.now();
        await prisma.$queryRaw`SELECT 1`;
        dbPings.push(performance.now() - pingStart);

        const row = await prisma.loadTestRun.update({
          where: { id: runId },
          data: { progress: snapshot() as unknown as Prisma.InputJsonValue, heartbeatAt: new Date() },
          select: { stopRequested: true },
        });
        if (row.stopRequested && !state.reason) {
          state.reason = "Stopped by you.";
          state.stop = true;
        }
      } catch (err) {
        logger.error("[loadtest] progress update failed:", err);
      } finally {
        ticking = false;
      }
    }, 1000);

    const worker = async (index: number) => {
      if (config.rampUpSec > 0) await sleep((index / config.concurrency) * config.rampUpSec * 1000);
      state.active += 1;
      while (!state.stop && Date.now() < endAt) {
        const job = jobs[state.cursor % jobs.length];
        state.cursor += 1;
        record(job, await timedFetch(job.url, job.token, header));
        if (config.thinkMs > 0 && !state.stop) await sleep(config.thinkMs * (0.5 + Math.random()));
      }
      state.active -= 1;
    };

    await Promise.all(Array.from({ length: config.concurrency }, (_, index) => worker(index)));
    clearInterval(ticker);

    const final = snapshot();
    const lagValue = lag.percentile(99) / 1e6;
    const serverHealth = {
      loopLagP99Ms: Number.isFinite(lagValue) && lagValue < 1e6 ? Math.round(lagValue) : 0,
      dbPingAvgMs: dbPings.length ? round1(dbPings.reduce((sum, value) => sum + value, 0) / dbPings.length) : 0,
      dbPingMaxMs: dbPings.length ? round1(Math.max(...dbPings)) : 0,
    };

    const errorRate = final.requests ? final.failed / final.requests : 0;
    const aborted = !!state.reason && state.reason.startsWith("Stopped automatically");
    const verdict = aborted || errorRate >= 0.05 || final.p95 >= 5000 ? "failing" : errorRate >= 0.01 || final.p95 >= 1500 ? "degraded" : "healthy";

    const hints: string[] = [];
    if (final.requests < 300) {
      hints.push(`Only ${final.requests} requests were measured, which is too few for a reliable slow-request (p95) figure. Run it longer or with more users before trusting the verdict.`);
    }
    hints.push(
      `Sustained throughput was ${final.rps} requests per second. If each person using LifeOS makes about one request every 5 seconds, that supports roughly ${Math.round(final.rps * 5)} people at the same time.`
    );
    if (final.failed === 0 && verdict !== "healthy") {
      hints.push("Nothing errored. The server simply answered slower than the limits because it was at capacity.");
    }
    if (config.thinkMs === 0 && config.concurrency >= 20) {
      hints.push("This run had no pause between requests, so each simulated user acted like many real ones. Add a think time of 1 to 3 seconds for a realistic picture.");
    }
    if (config.direct) hints.push("This run called the server directly and skipped the load balancer, so it measures the app alone.");
    if (final.instances.length === 1) hints.push("Every request was served by a single instance. Add instances in Render so the load is shared.");
    if (final.instances.length > 1) {
      const shares = final.instances.map((entry) => entry.share);
      if (Math.max(...shares) > Math.min(...shares) * 2) hints.push("The load was spread unevenly across instances.");
    }
    if (serverHealth.loopLagP99Ms > 100) {
      hints.push(`The server's event loop lagged by ${serverHealth.loopLagP99Ms} ms (p99). That means CPU is the limit. More CPU or more instances will help, though part of this load is the test itself.`);
    }
    if (serverHealth.dbPingMaxMs > 300 || serverHealth.dbPingAvgMs > 100) {
      hints.push(`The database slowed down under load (ping averaged ${serverHealth.dbPingAvgMs} ms, peaked at ${serverHealth.dbPingMaxMs} ms). Check your connection pool size and the slowest endpoint's queries.`);
    }
    if (final.p50 > 0 && final.p95 > final.p50 * 5) hints.push("A few requests were much slower than typical. Look at the slowest endpoint below.");
    if (state.limited > 0) hints.push(`${state.limited} requests were rate limited (429), so these results reflect the limiter.`);
    const slowest = [...final.endpoints].sort((a, b) => b.p95 - a.p95)[0];
    if (slowest && slowest.p95 >= 800) hints.push(`Slowest endpoint: ${slowest.label} (p95 ${slowest.p95} ms).`);
    if (verdict === "healthy") hints.push("Latency and error rates stayed within healthy limits at this load. Try a higher number of users next.");

    await prisma.loadTestRun.update({
      where: { id: runId },
      data: {
        status: state.reason ? "STOPPED" : "COMPLETED",
        finishedAt: new Date(),
        result: { ...final, verdict, hints, warnings, serverHealth, stoppedReason: state.reason } as unknown as Prisma.InputJsonValue,
      },
    });
  } catch (err) {
    await prisma.loadTestRun
      .update({
        where: { id: runId },
        data: { status: "FAILED", finishedAt: new Date(), result: { error: err instanceof Error ? err.message : "The test failed.", warnings } as unknown as Prisma.InputJsonValue },
      })
      .catch(() => undefined);
  } finally {
    lag.disable();
    await releaseFixtures([...toRelease]);
  }
}

export async function startRun(input: { config: RunConfig; actorName: string; base: string; callerToken?: string }) {
  const config = validateConfig(input.config);
  const stale = await prisma.loadTestRun.updateMany({
    where: { status: "RUNNING", heartbeatAt: { lt: new Date(Date.now() - 20_000) } },
    data: { status: "FAILED", finishedAt: new Date() },
  });
  if (stale.count > 0) await releaseFixtures(FIXTURE_KEYS);
  if (await prisma.loadTestRun.findFirst({ where: { status: "RUNNING" } })) throw new AppError("A load test is already running.", 409);

  const run = await prisma.loadTestRun.create({
    data: { createdByName: input.actorName, status: "RUNNING", config: config as unknown as Prisma.InputJsonValue },
  });
  const base = config.direct ? `http://127.0.0.1:${process.env.PORT ?? 5000}` : input.base;
  void execute(run.id, config, base, input.callerToken);
  return run.id;
}

export async function stopRun(id: string) {
  await prisma.loadTestRun.updateMany({ where: { id, status: "RUNNING" }, data: { stopRequested: true } });
}

export async function getRun(id: string) {
  const run = await prisma.loadTestRun.findUnique({ where: { id } });
  if (!run) throw new AppError("Test run not found", 404);
  return {
    id: run.id,
    status: run.status,
    createdAt: run.createdAt.toISOString(),
    finishedAt: run.finishedAt?.toISOString() ?? null,
    createdByName: run.createdByName,
    config: run.config,
    progress: run.progress,
    result: run.result,
  };
}

export async function listRuns() {
  const runs = await prisma.loadTestRun.findMany({ orderBy: { createdAt: "desc" }, take: 15 });
  return runs.map((run) => {
    const result = (run.result ?? {}) as any;
    return {
      id: run.id,
      status: run.status,
      createdAt: run.createdAt.toISOString(),
      createdByName: run.createdByName,
      config: run.config,
      verdict: result.verdict ?? null,
      requests: result.requests ?? null,
      p95: result.p95 ?? null,
    };
  });
}

export async function probeBalance(base: string, count = 60) {
  const tally = new Map<string, number>();
  const latencies: number[] = [];
  let failed = 0;
  let cursor = 0;

  await Promise.all(
    Array.from({ length: 8 }, async () => {
      while (cursor < count) {
        cursor += 1;
        const result = await freshGet(`${base}/api/ping`);
        latencies.push(result.ms);
        if (result.status === 200 && result.instance) tally.set(result.instance, (tally.get(result.instance) ?? 0) + 1);
        else failed += 1;
      }
    })
  );

  const served = [...tally.values()].reduce((sum, value) => sum + value, 0) || 1;
  const stats = summarize(latencies);
  return {
    requests: count,
    failed,
    avgMs: stats.avgMs,
    p95: stats.p95,
    instances: [...tally].map(([instance, requests]) => ({ instance, requests, share: round1((requests / served) * 100) })),
  };
}