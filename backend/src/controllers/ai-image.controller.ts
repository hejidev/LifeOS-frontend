import type { Response } from "express";
import { asyncHandler, AppError } from "../lib/errors";
import type { AuthenticatedRequest } from "../middlewares/auth.middleware";
import * as aiImageService from "../services/ai-image.service";

export const uploadImage = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const file = (req as any).file;
  if (!file) throw new AppError("No file uploaded", 400);
  const result = await aiImageService.uploadForProcessing(file.buffer, file.originalname);
  return res.status(201).json(result);
});

export const applyTool = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { publicId, tool, format } = req.body;
  const url = aiImageService.buildTransformedUrl(publicId, tool, format);
  return res.json({ url });
});

export const convertFormat = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { publicId, format, quality } = req.body;
  const url = aiImageService.buildFormatConvertedUrl(publicId, format, quality);
  return res.json({ url });
});

export const generativeEdit = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { publicId, prompt, mode } = req.body;
  const url = aiImageService.buildGenerativeEditUrl(publicId, prompt, mode);
  return res.json({ url });
});