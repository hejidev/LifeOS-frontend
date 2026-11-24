import type { Response } from "express";
import { asyncHandler } from "../lib/errors";
import type { AuthenticatedRequest } from "../middlewares/auth.middleware";
import * as service from "../services/payment-confirmation.service";

const store = (req: AuthenticatedRequest) => (typeof req.query.storeId === "string" && req.query.storeId ? req.query.storeId : undefined);
const actor = (req: AuthenticatedRequest) => req.user!.name ?? "Owner";

export const pending = asyncHandler(async (req: AuthenticatedRequest, res: Response) => res.json({ payments: await service.listPending(req.user!.id, store(req)) }));

export const summary = asyncHandler(async (req: AuthenticatedRequest, res: Response) => res.json(await service.getSummary(req.user!.id, store(req))));

export const confirm = asyncHandler(async (req: AuthenticatedRequest, res: Response) => res.json(await service.confirmSales(req.user!.id, req.body.ids, actor(req))));

export const dispute = asyncHandler(async (req: AuthenticatedRequest, res: Response) => res.json(await service.disputeSale(req.user!.id, req.params.id, req.body.reason, actor(req))));