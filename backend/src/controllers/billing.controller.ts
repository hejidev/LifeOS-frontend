import type { Request, Response } from "express";
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
  const signature = req.headers["stripe-signature"];
  if (!signature) throw new AppError("Missing signature", 400);

  let event;
  try {
    event = billingService.stripe.webhooks.constructEvent(req.body, signature, env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    throw new AppError("Invalid webhook signature", 400);
  }

  await billingService.handleWebhookEvent(event);
  return res.json({ received: true });
});