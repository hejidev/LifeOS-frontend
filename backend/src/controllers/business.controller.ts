import type { Response } from "express";
import { asyncHandler } from "../lib/errors";
import type { AuthenticatedRequest } from "../middlewares/auth.middleware";
import * as businessService from "../services/business.service";

export const getDashboard = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { range, from, to } = req.query as { range?: string; from?: string; to?: string };
  const dashboard = await businessService.getDashboard(req.user!.id, { range, from, to });
  return res.json(dashboard);
});

export const getProfile = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const profile = await businessService.getOrCreateProfile(req.user!.id);
  return res.json({ profile });
});

export const updateProfile = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const profile = await businessService.updateProfile(req.user!.id, req.body);
  return res.json({ profile });
});

export const getProducts = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const products = await businessService.listProducts(req.user!.id, req.query.active === "true");
  return res.json({ products });
});

export const createProduct = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const product = await businessService.createProduct(req.user!.id, req.body);
  return res.status(201).json({ product });
});

export const updateProduct = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const product = await businessService.updateProduct(req.user!.id, req.params.id, req.body);
  return res.json({ product });
});

export const deleteProduct = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  await businessService.deleteProduct(req.user!.id, req.params.id);
  return res.status(204).send();
});

export const getCustomers = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const customers = await businessService.listCustomers(req.user!.id);
  return res.json({ customers });
});

export const createCustomer = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const customer = await businessService.createCustomer(req.user!.id, req.body);
  return res.status(201).json({ customer });
});

export const getSales = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const range = (req.query.range as "today" | "week" | "month") ?? "month";
  const sales = await businessService.listSales(req.user!.id, range);
  return res.json({ sales });
});

export const createSale = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const sale = await businessService.createSale(req.user!.id, req.body);
  return res.status(201).json({ sale });
});

export const updateSaleStatus = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const sale = await businessService.updateSaleStatus(req.user!.id, req.params.id, req.body.status);
  return res.json({ sale });
});

export const getExpenses = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const range = (req.query.range as "today" | "week" | "month") ?? "month";
  const expenses = await businessService.listExpenses(req.user!.id, range);
  return res.json({ expenses });
});

export const createExpense = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const expense = await businessService.createExpense(req.user!.id, req.body);
  return res.status(201).json({ expense });
});

export const deleteExpense = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  await businessService.deleteExpense(req.user!.id, req.params.id);
  return res.status(204).send();
});

export const getProductsPaged = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const page = Number(req.query.page) || 1;
  const pageSize = Number(req.query.pageSize) || 20;
  const search = req.query.search as string | undefined;
  const activeOnly = req.query.active === "true";
  const result = await businessService.listProductsPaged(req.user!.id, { page, pageSize, search, activeOnly });
  return res.json(result);
});