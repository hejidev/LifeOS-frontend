import type { Request, Response } from "express";
import crypto from "crypto";
import { redis } from "../config/redis";
import { asyncHandler, AppError } from "../lib/errors";
import type { AuthenticatedRequest } from "../middlewares/auth.middleware";
import { env } from "../config/env";
import * as billingService from "../services/billing.service";

export const getSummary = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const summary = await billingService.getBillingSummary(req.user!.id);
  return res.json(summary);
});

export const checkout = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { plan, interval } = req.body;
  const url = await billingService.createCheckoutSession(req.user!.id, req.user!.email, plan, interval);
  return res.json({ url });
});

export const portal = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const url = await billingService.createPortalSession(req.user!.id);
  return res.json({ url });
});

async function claimEvent(key: string) {
  try {
    return (await redis.set(key, "1", "EX", 7 * 86_400, "NX")) === "OK";
  } catch {
    return true;
  }
}

export const webhook = asyncHandler(async (req: Request, res: Response) => {
  const signature = String(req.headers["x-paystack-signature"] ?? "");
  if (!signature) throw new AppError("Missing signature", 400);

  const expected = Buffer.from(crypto.createHmac("sha512", env.PAYSTACK_SECRET_KEY).update(req.body).digest("hex"));
  const received = Buffer.from(signature);
  if (expected.length !== received.length || !crypto.timingSafeEqual(expected, received)) throw new AppError("Invalid webhook signature", 400);

  let event: { event: string; data: any };
  try {
    event = JSON.parse(req.body.toString());
  } catch {
    throw new AppError("Invalid webhook body", 400);
  }

  const reference = event.data?.id ?? event.data?.reference ?? event.data?.subscription_code;
  const key = reference ? `paystack:event:${event.event}:${reference}` : null;
  if (key && !(await claimEvent(key))) return res.status(200).json({ received: true, duplicate: true });

  try {
    await billingService.handleWebhookEvent(event);
  } catch (err) {
    if (key) await redis.del(key).catch(() => undefined);
    throw err;
  }
  return res.status(200).json({ received: true });
});