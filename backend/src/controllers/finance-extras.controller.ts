import type { Response } from "express";
import { asyncHandler } from "../lib/errors";
import type { AuthenticatedRequest } from "../middlewares/auth.middleware";
import * as finance from "../services/finance.service";

export const createTransfer = asyncHandler(async (req: AuthenticatedRequest, res: Response) =>
  res.status(201).json({ transfer: await finance.createTransfer(req.user!.id, req.body) })
);

export const updateAccount = asyncHandler(async (req: AuthenticatedRequest, res: Response) =>
  res.json({ account: await finance.updateAccount(req.user!.id, req.params.id, req.body) })
);

export const deleteAccount = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  await finance.deleteAccount(req.user!.id, req.params.id);
  return res.status(204).send();
});

export const deleteCategory = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  await finance.deleteCategory(req.user!.id, req.params.id);
  return res.status(204).send();
});