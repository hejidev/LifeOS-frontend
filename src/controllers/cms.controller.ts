// src/controllers/cms.controller.ts
import type { Request, Response } from "express";
import { AppError, asyncHandler } from "../lib/errors";
import type { AuthenticatedRequest } from "../middlewares/auth.middleware";
import * as cmsService from "../services/cms.service";
import { cloudinary } from "../config/cloudinary";

export const create = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const item = await cmsService.createContent(req.user!.id, req.body);
  return res.status(201).json({ item });
});

export const update = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const item = await cmsService.updateContent(req.params.id, req.body);
  return res.json({ item });
});

export const submitForReview = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const item = await cmsService.submitForReview(req.user!.id, req.params.id);
  return res.json({ item });
});

export const publishDirectly = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const item = await cmsService.publishDirectly(req.params.id);
  return res.json({ item });
});

export const review = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { action, note } = req.body;
  const item = await cmsService.reviewContent(req.user!.id, req.params.id, action, note);
  return res.json({ item });
});

export const remove = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  await cmsService.deleteContent(req.params.id);
  return res.status(204).send();
});

export const listAll = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const items = await cmsService.listAllContent(req.query.type as string, req.query.status as string);
  return res.json({ items });
});

export const listMine = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const items = await cmsService.listMyContent(req.user!.id);
  return res.json({ items });
});

export const getPublished = asyncHandler(async (req: Request, res: Response) => {
  const items = await cmsService.getPublished(req.params.type);
  return res.json({ items });
});

export const getPublishedBySlug = asyncHandler(async (req: Request, res: Response) => {
  const item = await cmsService.getPublishedBySlug(req.params.slug);
  return res.json({ item });
});

export const uploadImage = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const file = (req as any).file;
  if (!file) throw new AppError("No file uploaded", 400);

  const uploaded = await new Promise<any>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: "lifeos/cms", resource_type: "image" },
      (err, result) => (err || !result ? reject(err) : resolve(result))
    );
    stream.end(file.buffer);
  });

  return res.status(201).json({ url: uploaded.secure_url });
});