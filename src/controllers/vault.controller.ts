import type { Response } from "express";
import { asyncHandler } from "../lib/errors";
import type { AuthenticatedRequest } from "../middlewares/auth.middleware";
import * as vaultService from "../services/vault.service";

export const getDashboard = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const data = await vaultService.getVaultDashboard(req.user!.id);
  return res.json(data);
});

export const revealItem = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const item = await vaultService.getVaultItemWithPassword(req.user!.id, req.params.id);
  return res.json({ item });
});

export const createItem = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const item = await vaultService.createVaultItem(req.user!.id, req.body);
  return res.status(201).json({ item });
});

export const updateItem = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const item = await vaultService.updateVaultItem(req.user!.id, req.params.id, req.body);
  return res.json({ item });
});

export const deleteItem = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  await vaultService.deleteVaultItem(req.user!.id, req.params.id);
  return res.status(204).send();
});