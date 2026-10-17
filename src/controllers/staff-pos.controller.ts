import type { Response } from "express";
import { asyncHandler } from "../lib/errors";
import type { StaffRequest } from "../middlewares/staff-session.middleware";
import * as staffPosService from "../services/staff-pos.service";

export const getProducts = asyncHandler(async (req: StaffRequest, res: Response) => {
  const products = await staffPosService.getProducts(req.staff!.bizProfileId, req.staff!.storeId);
  return res.json({ products });
});

export const getProductByBarcode = asyncHandler(async (req: StaffRequest, res: Response) => {
  const product = await staffPosService.getProductByBarcode(req.staff!.bizProfileId, req.staff!.storeId, req.params.barcode);
  return res.json({ product });
});

export const getCustomers = asyncHandler(async (req: StaffRequest, res: Response) => {
  const customers = await staffPosService.getCustomers(req.staff!.bizProfileId);
  return res.json({ customers });
});

export const createCustomer = asyncHandler(async (req: StaffRequest, res: Response) => {
  const customer = await staffPosService.createCustomer(req.staff!.bizProfileId, req.body);
  return res.status(201).json({ customer });
});

export const createSale = asyncHandler(async (req: StaffRequest, res: Response) => {
  const sale = await staffPosService.createSale(req.staff!.staffId, req.staff!.bizProfileId, req.staff!.storeId, req.body);
  return res.status(201).json({ sale });
});