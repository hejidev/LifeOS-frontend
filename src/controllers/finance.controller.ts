import type { Response } from "express";
import { asyncHandler } from "../lib/errors";
import type { AuthenticatedRequest } from "../middlewares/auth.middleware";
import * as financeService from "../services/finance.service";

export const getDashboard = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { month, year } = (req as any).validated.query ?? {};
  const data = await financeService.getFinanceDashboard(req.user!.id, month, year);
  return res.json(data);
});

export const getAccounts = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const accounts = await financeService.getAccounts(req.user!.id);
  return res.json({ accounts });
});

export const createAccount = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const account = await financeService.createAccount(req.user!.id, (req as any).validated.body);
  return res.status(201).json({ account });
});

export const updateAccount = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const account = await financeService.updateAccount(
    req.user!.id,
    req.params.id,
    (req as any).validated.body,
  );
  return res.json({ account });
});

export const getCategories = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const categories = await financeService.getCategories(req.user!.id);
  return res.json({ categories });
});

export const createCategory = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const category = await financeService.createCategory(
    req.user!.id,
    (req as any).validated.body,
  );
  return res.status(201).json({ category });
});

export const createBudget = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const budget = await financeService.createBudget(req.user!.id, (req as any).validated.body);
  return res.status(201).json({ budget });
});

export const createTransaction = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const tx = await financeService.createTransaction(req.user!.id, (req as any).validated.body);
  return res.status(201).json({ transaction: tx });
});

export const updateTransaction = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const tx = await financeService.updateTransaction(
    req.user!.id,
    req.params.id,
    (req as any).validated.body,
  );
  return res.json({ transaction: tx });
});

export const deleteTransaction = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  await financeService.deleteTransaction(req.user!.id, req.params.id);
  return res.status(204).send();
});