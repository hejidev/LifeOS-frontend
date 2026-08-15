import type { Response } from "express";
import { asyncHandler, AppError } from "../lib/errors";
import type { AuthenticatedRequest } from "../middlewares/auth.middleware";
import * as converterService from "../services/converter.service";

export const convertText = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { content, from, to } = req.body;
  const result = converterService.convertText(content, from, to);
  return res.json({ result });
});

export const extractPdfText = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const file = (req as any).file;
  if (!file) throw new AppError("No file uploaded", 400);
  const result = await converterService.extractPdfText(file.buffer);
  return res.json(result);
});

export const extractDocxText = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const file = (req as any).file;
  if (!file) throw new AppError("No file uploaded", 400);
  const result = await converterService.extractDocxText(file.buffer);
  return res.json(result);
});

export const convertFile = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const file = (req as any).file;
  if (!file) throw new AppError("No file uploaded", 400);
  const result = await converterService.convertGenericFile(file.buffer, file.originalname, req.body.targetFormat);
  return res.json(result);
});