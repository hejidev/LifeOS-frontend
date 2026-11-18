import type { Response } from "express";
import { asyncHandler, AppError } from "../lib/errors";
import type { AuthenticatedRequest } from "../middlewares/auth.middleware";
import * as aiImageService from "../services/ai-image.service";

export const uploadImage = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const file = (req as any).file;
  if (!file) throw new AppError("No file uploaded", 400);
  return res.status(201).json(await aiImageService.uploadForProcessing(req.user!.id, file.buffer));
});

export const applyTool = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { publicId, tool, format } = req.body;
  aiImageService.assertOwnImage(req.user!.id, publicId);
  const url = aiImageService.buildTransformedUrl(publicId, tool, format);
  await aiImageService.verifyDerived(url);
  return res.json({ url });
});

export const convertFormat = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { publicId, format, quality } = req.body;
  aiImageService.assertOwnImage(req.user!.id, publicId);
  const url = aiImageService.buildFormatConvertedUrl(publicId, format, quality);
  await aiImageService.verifyDerived(url);
  return res.json({ url });
});

export const generativeEdit = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { publicId, prompt, mode } = req.body;
  aiImageService.assertOwnImage(req.user!.id, publicId);
  const url = aiImageService.buildGenerativeEditUrl(publicId, prompt, mode);
  await aiImageService.verifyDerived(url);
  return res.json({ url });
});