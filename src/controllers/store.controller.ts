import type { Response } from "express";
import { asyncHandler } from "../lib/errors";
import type { AuthenticatedRequest } from "../middlewares/auth.middleware";
import * as storeService from "../services/store.service";

export const listStores = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const stores = await storeService.listStores(req.user!.id);
  return res.json({ stores });
});

export const createStore = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const store = await storeService.createStore(req.user!.id, req.body);
  return res.status(201).json({ store });
});

export const updateStore = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const store = await storeService.updateStore(req.user!.id, req.params.id, req.body);
  return res.json({ store });
});

export const setDefaultStore = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const stores = await storeService.setDefaultStore(req.user!.id, req.params.id);
  return res.json({ stores });
});