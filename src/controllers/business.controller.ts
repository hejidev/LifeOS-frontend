import type { Response } from "express";
import { AppError, asyncHandler } from "../lib/errors";
import type { AuthenticatedRequest } from "../middlewares/auth.middleware";
import * as businessService from "../services/business.service";


export const getDashboard = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { range, from, to, storeId } = req.query as { range?: string; from?: string; to?: string; storeId?: string };
  const dashboard = await businessService.getDashboard(req.user!.id, { range, from, to }, storeId);
  return res.json(dashboard);
});

export const getProductsPaged = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const page = Number(req.query.page) || 1;
  const pageSize = Number(req.query.pageSize) || 20;
  const search = req.query.search as string | undefined;
  const activeOnly = req.query.active === "true";
  const storeId = req.query.storeId as string | undefined;
  const result = await businessService.listProductsPaged(req.user!.id, { page, pageSize, search, activeOnly, storeId });
  return res.json(result);
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
  const products = await businessService.listProducts(req.user!.id, req.query.active === "true", req.query.storeId as string | undefined);
  return res.json({ products });
});

export const createProduct = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { storeId, ...body } = req.body;
  const product = await businessService.createProduct(req.user!.id, body, storeId);
  return res.status(201).json({ product });
});

export const updateProduct = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { storeId, ...body } = req.body;
  const product = await businessService.updateProduct(req.user!.id, req.params.id, body, storeId);
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

export const updateCustomer = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const customer = await businessService.updateCustomer(req.user!.id, req.params.id, req.body);
  return res.json({ customer });
});

export const exportCustomers = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const csv = await businessService.exportCustomersCSV(req.user!.id);
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="customers-export-${new Date().toISOString().slice(0, 10)}.csv"`);
  return res.send(csv);
});

export const createSale = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { storeId, ...body } = req.body;
  const sale = await businessService.createSale(req.user!.id, body, storeId);
  return res.status(201).json({ sale });
});

export const getSales = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const range = (req.query.range as "today" | "week" | "month") ?? "month";
  const sales = await businessService.listSales(req.user!.id, range, req.query.storeId as string | undefined);
  return res.json({ sales });
});

export const updateSaleStatus = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const sale = await businessService.updateSaleStatus(req.user!.id, req.params.id, req.body.status);
  return res.json({ sale });
});

export const createExpense = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { storeId, ...body } = req.body;
  const expense = await businessService.createExpense(req.user!.id, body, storeId);
  return res.status(201).json({ expense });
});

export const getExpenses = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const range = (req.query.range as "today" | "week" | "month") ?? "month";
  const expenses = await businessService.listExpenses(req.user!.id, range, req.query.storeId as string | undefined);
  return res.json({ expenses });
});

export const deleteExpense = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  await businessService.deleteExpense(req.user!.id, req.params.id);
  return res.status(204).send();
});

export const getProductByBarcode = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const product = await businessService.getProductByBarcode(req.user!.id, req.params.barcode, req.query.storeId as string | undefined);
  return res.json({ product });
});

export const uploadProductImage = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const file = (req as any).file;
  if (!file) throw new AppError("No file uploaded", 400);
  const result = await businessService.uploadProductImage(file.buffer, file.originalname);
  return res.status(201).json(result);
});

export const bulkImportProducts = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { products, storeId } = req.body;
  if (!Array.isArray(products) || products.length === 0) {
    throw new AppError("Invalid products data - expected non-empty array", 400);
  }
  const results = await businessService.bulkImportProducts(req.user!.id, products, storeId);
  return res.status(201).json(results);
});

export const exportProducts = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const csv = await businessService.exportProductsCSV(req.user!.id, {
    storeId: req.query.storeId as string | undefined,
    activeOnly: req.query.active === "true",
  });
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="products-export-${new Date().toISOString().slice(0, 10)}.csv"`);
  return res.send(csv);
});

export const exportSales = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const csv = await businessService.exportSalesCSV(req.user!.id, {
    range: req.query.range as any,
    storeId: req.query.storeId as string | undefined,
  });
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="sales-export-${new Date().toISOString().slice(0, 10)}.csv"`);
  return res.send(csv);
});
