import crypto from "crypto";
import type { Request } from "express";

const sign = (runId: string, secret: string) => crypto.createHmac("sha256", secret).update(runId).digest("hex").slice(0, 24);

export function loadTestHeader(runId: string) {
  const secret = process.env.LOADTEST_SECRET;
  return secret ? `${runId}.${sign(runId, secret)}` : undefined;
}

export function isLoadTestRequest(req: Request) {
  const secret = process.env.LOADTEST_SECRET;
  const header = req.get("x-loadtest");
  if (!secret || !header) return false;
  const [runId, signature] = header.split(".");
  if (!runId || !signature) return false;
  const expected = sign(runId, secret);
  return signature.length === expected.length && crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}