import type { Request, Response } from "express";
import crypto from "crypto";
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

export const webhook = asyncHandler(async (req: Request, res: Response) => {
  const signature = req.headers["x-paystack-signature"];
  if (!signature) throw new AppError("Missing signature", 400);

  const expected = crypto
    .createHmac("sha512", env.PAYSTACK_SECRET_KEY)
    .update(req.body)
    .digest("hex");

  if (expected !== signature) {
    throw new AppError("Invalid webhook signature", 400);
  }

  const event = JSON.parse(req.body.toString());
  await billingService.handleWebhookEvent(event);
  return res.status(200).json({ received: true });
});