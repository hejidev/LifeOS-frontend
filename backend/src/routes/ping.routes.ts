import { Router } from "express";
import { prisma } from "../config/prisma";
import { BOOTED_AT, INSTANCE_ID } from "../lib/instance";

const router = Router();

router.get("/ping", (_req, res) => {
  res.setHeader("Cache-Control", "no-store");
  res.json({
    ok: true,
    instance: INSTANCE_ID,
    uptimeSec: Math.round(process.uptime()),
    bootedAt: BOOTED_AT.toISOString(),
    time: new Date().toISOString(),
  });
});

router.get("/ping/db", async (_req, res, next) => {
  try {
    const started = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    res.setHeader("Cache-Control", "no-store");
    res.json({ ok: true, instance: INSTANCE_ID, dbMs: Date.now() - started });
  } catch (err) {
    next(err);
  }
});

export default router;