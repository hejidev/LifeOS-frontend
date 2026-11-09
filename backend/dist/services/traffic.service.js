"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WINDOWS = exports.AREAS = void 0;
exports.trafficMiddleware = trafficMiddleware;
exports.flushTraffic = flushTraffic;
exports.startTrafficRecorder = startTrafficRecorder;
exports.getTraffic = getTraffic;
exports.getInstances = getInstances;
const perf_hooks_1 = require("perf_hooks");
const prisma_1 = require("../config/prisma");
const logger_1 = require("../lib/logger");
const instance_1 = require("../lib/instance");
const loadtest_signature_1 = require("../lib/loadtest-signature");
exports.AREAS = ["super_admin", "admin", "merchant", "staff", "user", "public", "loadtest"];
const EDGES = [50, 100, 250, 500, 1000, 2500];
const UPPER = [...EDGES, 5000];
const MINUTE = 60000;
const HOUR = 3600000;
const FLUSH_MS = 20000;
const STAFF_PATHS = /^\/api\/(staff-|my-shifts)/;
const MERCHANT_PATHS = /^\/api\/(business|merchant|ops|stores)/;
exports.WINDOWS = {
    "15m": { span: 15 * MINUTE, step: MINUTE },
    "1h": { span: HOUR, step: MINUTE },
    "6h": { span: 6 * HOUR, step: 5 * MINUTE },
    "24h": { span: 24 * HOUR, step: 15 * MINUTE },
};
const minutes = new Map();
const hours = new Map();
const roles = new Map();
const cache = new Map();
const loop = (0, perf_hooks_1.monitorEventLoopDelay)({ resolution: 20 });
loop.enable();
let handled = 0;
let lastCleanup = 0;
let started = false;
const binFor = (ms) => {
    const index = EDGES.findIndex((edge) => ms < edge);
    return index === -1 ? EDGES.length : index;
};
function tally(counter, status, ms) {
    counter.requests += 1;
    if (status >= 500)
        counter.serverErrors += 1;
    else if (status >= 400)
        counter.clientErrors += 1;
    counter.totalMs += ms;
    if (ms > counter.maxMs)
        counter.maxMs = ms;
    counter.dirty = true;
}
function record(area, route, status, ms) {
    const now = Date.now();
    const minuteKey = `${Math.floor(now / MINUTE) * MINUTE}|${area}`;
    let counter = minutes.get(minuteKey);
    if (!counter) {
        counter = { requests: 0, clientErrors: 0, serverErrors: 0, totalMs: 0, maxMs: 0, bins: new Array(UPPER.length).fill(0), dirty: false };
        minutes.set(minuteKey, counter);
    }
    tally(counter, status, ms);
    counter.bins[binFor(ms)] += 1;
    if (!route)
        return;
    const hourKey = `${Math.floor(now / HOUR) * HOUR}|${route}`;
    let routeCounter = hours.get(hourKey);
    if (!routeCounter) {
        routeCounter = { requests: 0, clientErrors: 0, serverErrors: 0, totalMs: 0, maxMs: 0, dirty: false };
        hours.set(hourKey, routeCounter);
    }
    tally(routeCounter, status, ms);
}
async function resolveRole(req) {
    if (req.user?.role)
        return String(req.user.role).toUpperCase();
    const id = req.user?.id;
    if (!id)
        return "";
    const hit = roles.get(id);
    if (hit && Date.now() - hit.at < 300000)
        return hit.role;
    const user = await prisma_1.prisma.user.findUnique({ where: { id }, select: { role: true } });
    const role = String(user?.role ?? "").toUpperCase();
    if (roles.size > 5000)
        roles.clear();
    roles.set(id, { role, at: Date.now() });
    return role;
}
async function areaOf(req) {
    const path = String(req.originalUrl ?? "").split("?")[0];
    if (req.staff || STAFF_PATHS.test(path))
        return "staff";
    if (!req.user)
        return "public";
    const role = await resolveRole(req);
    if (role === "SUPER_ADMIN")
        return "super_admin";
    if (role === "ADMIN")
        return "admin";
    return MERCHANT_PATHS.test(path) ? "merchant" : "user";
}
function trafficMiddleware(req, res, next) {
    const begun = process.hrtime.bigint();
    res.setHeader("X-Instance", instance_1.INSTANCE_ID);
    res.once("finish", () => {
        const url = req.originalUrl;
        if (req.method === "OPTIONS" || url === "/health" || url.startsWith("/api/ping") || url.startsWith("/api/platform-tools"))
            return;
        const ms = Number(process.hrtime.bigint() - begun) / 1e6;
        const status = res.statusCode;
        handled += 1;
        if ((0, loadtest_signature_1.isLoadTestRequest)(req)) {
            record("loadtest", null, status, ms);
            return;
        }
        const route = req.route ? `${req.method} ${req.baseUrl}${String(req.route.path)}` : null;
        void areaOf(req)
            .then((area) => record(area, route, status, ms))
            .catch(() => undefined);
    });
    next();
}
async function cleanup(now) {
    await prisma_1.prisma
        .$transaction([
        prisma_1.prisma.trafficBucket.deleteMany({ where: { minute: { lt: new Date(now - 48 * HOUR) } } }),
        prisma_1.prisma.trafficRoute.deleteMany({ where: { hour: { lt: new Date(now - 7 * 24 * HOUR) } } }),
        prisma_1.prisma.serviceInstance.deleteMany({ where: { lastSeenAt: { lt: new Date(now - 24 * HOUR) } } }),
        prisma_1.prisma.loadTestRun.deleteMany({ where: { createdAt: { lt: new Date(now - 30 * 24 * HOUR) } } }),
    ])
        .catch(() => undefined);
}
async function flushTraffic() {
    const now = Date.now();
    const dirtyMinutes = [...minutes].filter(([, counter]) => counter.dirty);
    const dirtyRoutes = [...hours].filter(([, counter]) => counter.dirty);
    try {
        const pingStart = Date.now();
        await prisma_1.prisma.$queryRaw `SELECT 1`;
        const dbPingMs = Date.now() - pingStart;
        const lag = loop.percentile(99) / 1e6;
        loop.reset();
        const memory = process.memoryUsage();
        const instanceData = {
            lastSeenAt: new Date(),
            rssMb: Math.round(memory.rss / 1048576),
            heapMb: Math.round(memory.heapUsed / 1048576),
            loopLagMs: Number.isFinite(lag) && lag < 1e6 ? Math.round(lag) : 0,
            dbPingMs,
            requests: handled,
        };
        await prisma_1.prisma.$transaction([
            ...dirtyMinutes.map(([key, counter]) => {
                const [stamp, area] = key.split("|");
                const minute = new Date(Number(stamp));
                const data = {
                    requests: counter.requests,
                    clientErrors: counter.clientErrors,
                    serverErrors: counter.serverErrors,
                    totalMs: Math.round(counter.totalMs),
                    maxMs: Math.round(counter.maxMs),
                    b50: counter.bins[0],
                    b100: counter.bins[1],
                    b250: counter.bins[2],
                    b500: counter.bins[3],
                    b1000: counter.bins[4],
                    b2500: counter.bins[5],
                    bSlow: counter.bins[6],
                };
                return prisma_1.prisma.trafficBucket.upsert({
                    where: { minute_instance_area: { minute, instance: instance_1.INSTANCE_ID, area } },
                    update: data,
                    create: { minute, instance: instance_1.INSTANCE_ID, area, ...data },
                });
            }),
            ...dirtyRoutes.map(([key, counter]) => {
                const split = key.indexOf("|");
                const hour = new Date(Number(key.slice(0, split)));
                const route = key.slice(split + 1);
                const data = {
                    requests: counter.requests,
                    clientErrors: counter.clientErrors,
                    serverErrors: counter.serverErrors,
                    totalMs: Math.round(counter.totalMs),
                    maxMs: Math.round(counter.maxMs),
                };
                return prisma_1.prisma.trafficRoute.upsert({
                    where: { hour_instance_route: { hour, instance: instance_1.INSTANCE_ID, route } },
                    update: data,
                    create: { hour, instance: instance_1.INSTANCE_ID, route, ...data },
                });
            }),
            prisma_1.prisma.serviceInstance.upsert({
                where: { instance: instance_1.INSTANCE_ID },
                update: instanceData,
                create: { instance: instance_1.INSTANCE_ID, bootedAt: instance_1.BOOTED_AT, ...instanceData },
            }),
        ]);
        dirtyMinutes.forEach(([, counter]) => {
            counter.dirty = false;
        });
        dirtyRoutes.forEach(([, counter]) => {
            counter.dirty = false;
        });
    }
    catch (err) {
        logger_1.logger.error("[traffic] flush failed:", err);
    }
    for (const key of minutes.keys())
        if (Number(key.split("|")[0]) < now - 3 * MINUTE)
            minutes.delete(key);
    for (const key of hours.keys())
        if (Number(key.slice(0, key.indexOf("|"))) < now - 2 * HOUR)
            hours.delete(key);
    if (now - lastCleanup > HOUR) {
        lastCleanup = now;
        await cleanup(now);
    }
}
function startTrafficRecorder() {
    if (started)
        return;
    started = true;
    const timer = setInterval(() => void flushTraffic(), FLUSH_MS);
    timer.unref();
    process.once("SIGTERM", () => void flushTraffic());
    void flushTraffic();
}
const emptyAgg = () => ({ requests: 0, clientErrors: 0, serverErrors: 0, totalMs: 0, maxMs: 0, bins: new Array(UPPER.length).fill(0) });
function estimate(bins, q) {
    const total = bins.reduce((sum, value) => sum + value, 0);
    if (total === 0)
        return 0;
    const rank = q * total;
    let seen = 0;
    for (let index = 0; index < bins.length; index += 1) {
        if (seen + bins[index] >= rank) {
            const low = index === 0 ? 0 : UPPER[index - 1];
            const fraction = bins[index] === 0 ? 0 : (rank - seen) / bins[index];
            return Math.round(low + (UPPER[index] - low) * fraction);
        }
        seen += bins[index];
    }
    return UPPER[UPPER.length - 1];
}
function finish(agg) {
    return {
        requests: agg.requests,
        clientErrors: agg.clientErrors,
        serverErrors: agg.serverErrors,
        avgMs: agg.requests ? Math.round(agg.totalMs / agg.requests) : 0,
        p50: estimate(agg.bins, 0.5),
        p95: estimate(agg.bins, 0.95),
        p99: estimate(agg.bins, 0.99),
        maxMs: agg.maxMs,
    };
}
async function getTraffic(key) {
    const hit = cache.get(key);
    if (hit && Date.now() - hit.at < 5000)
        return hit.data;
    const { span, step } = exports.WINDOWS[key];
    const until = Date.now();
    const first = Math.floor((until - span) / step) * step;
    const [rows, routeRows] = await Promise.all([
        prisma_1.prisma.trafficBucket.findMany({ where: { minute: { gte: new Date(first) } } }),
        prisma_1.prisma.trafficRoute.findMany({ where: { hour: { gte: new Date(Math.floor(first / HOUR) * HOUR) } } }),
    ]);
    const total = emptyAgg();
    const byArea = new Map(exports.AREAS.map((area) => [area, emptyAgg()]));
    const byInstance = new Map();
    const series = new Map();
    for (let t = first; t <= until; t += step)
        series.set(t, { requests: 0, clientErrors: 0, serverErrors: 0, byArea: {} });
    for (const row of rows) {
        const bins = [row.b50, row.b100, row.b250, row.b500, row.b1000, row.b2500, row.bSlow];
        const point = series.get(Math.floor(row.minute.getTime() / step) * step);
        for (const agg of [total, byArea.get(row.area) ?? emptyAgg()]) {
            agg.requests += row.requests;
            agg.clientErrors += row.clientErrors;
            agg.serverErrors += row.serverErrors;
            agg.totalMs += row.totalMs;
            agg.maxMs = Math.max(agg.maxMs, row.maxMs);
            bins.forEach((count, index) => {
                agg.bins[index] += count;
            });
        }
        byInstance.set(row.instance, (byInstance.get(row.instance) ?? 0) + row.requests);
        if (point) {
            point.requests += row.requests;
            point.clientErrors += row.clientErrors;
            point.serverErrors += row.serverErrors;
            point.byArea[row.area] = (point.byArea[row.area] ?? 0) + row.requests;
        }
    }
    const routeMap = new Map();
    for (const row of routeRows) {
        const current = routeMap.get(row.route) ?? { requests: 0, clientErrors: 0, serverErrors: 0, totalMs: 0, maxMs: 0 };
        current.requests += row.requests;
        current.clientErrors += row.clientErrors;
        current.serverErrors += row.serverErrors;
        current.totalMs += row.totalMs;
        current.maxMs = Math.max(current.maxMs, row.maxMs);
        routeMap.set(row.route, current);
    }
    const sum = total.requests || 1;
    const data = {
        window: key,
        stepMs: step,
        since: new Date(first).toISOString(),
        until: new Date(until).toISOString(),
        totals: { ...finish(total), rps: Math.round((total.requests / (span / 1000)) * 100) / 100 },
        areas: exports.AREAS.map((area) => ({ area, ...finish(byArea.get(area) ?? emptyAgg()) })),
        series: [...series].map(([t, point]) => ({ t: new Date(t).toISOString(), ...point })),
        instances: [...byInstance].map(([instance, requests]) => ({ instance, requests, share: Math.round((requests / sum) * 1000) / 10 })),
        routes: [...routeMap]
            .filter(([, value]) => value.requests >= 3)
            .map(([route, value]) => ({
            route,
            requests: value.requests,
            avgMs: Math.round(value.totalMs / value.requests),
            maxMs: value.maxMs,
            serverErrors: value.serverErrors,
            clientErrors: value.clientErrors,
        }))
            .sort((a, b) => b.avgMs - a.avgMs)
            .slice(0, 10),
    };
    cache.set(key, { at: Date.now(), data });
    return data;
}
async function getInstances() {
    const now = Date.now();
    const rows = await prisma_1.prisma.serviceInstance.findMany({
        where: { lastSeenAt: { gte: new Date(now - 6 * HOUR) } },
        orderBy: { lastSeenAt: "desc" },
        take: 12,
    });
    return rows.map((row) => ({
        instance: row.instance,
        current: row.instance === instance_1.INSTANCE_ID,
        live: now - row.lastSeenAt.getTime() < 90000,
        bootedAt: row.bootedAt.toISOString(),
        lastSeenAt: row.lastSeenAt.toISOString(),
        uptimeSec: Math.round((row.lastSeenAt.getTime() - row.bootedAt.getTime()) / 1000),
        rssMb: row.rssMb,
        heapMb: row.heapMb,
        loopLagMs: row.loopLagMs,
        dbPingMs: row.dbPingMs,
        requests: row.requests,
    }));
}
