"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = require("../config/prisma");
const instance_1 = require("../lib/instance");
const router = (0, express_1.Router)();
router.get("/ping", (_req, res) => {
    res.setHeader("Cache-Control", "no-store");
    res.json({
        ok: true,
        instance: instance_1.INSTANCE_ID,
        uptimeSec: Math.round(process.uptime()),
        bootedAt: instance_1.BOOTED_AT.toISOString(),
        time: new Date().toISOString(),
    });
});
router.get("/ping/db", async (_req, res, next) => {
    try {
        const started = Date.now();
        await prisma_1.prisma.$queryRaw `SELECT 1`;
        res.setHeader("Cache-Control", "no-store");
        res.json({ ok: true, instance: instance_1.INSTANCE_ID, dbMs: Date.now() - started });
    }
    catch (err) {
        next(err);
    }
});
exports.default = router;
