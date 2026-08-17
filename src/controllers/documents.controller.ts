import type { Response } from "express";
import { AppError, asyncHandler } from "../lib/errors";
import type { AuthenticatedRequest } from "../middlewares/auth.middleware";
import * as documentsService from "../services/documents.service";

export const getDashboard = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { q, category } = (req as any).validated.query ?? {};
  const data = await documentsService.getDocumentsDashboard(req.user!.id, { q, category });
  return res.json(data);
});

export const createFolder = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const folder = await documentsService.createFolder(req.user!.id, (req as any).validated.body);
  return res.status(201).json({ folder });
});

export const updateFolder = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const folder = await documentsService.updateFolder(
    req.user!.id,
    req.params.id,
    (req as any).validated.body,
  );
  return res.json({ folder });
});

export const deleteFolder = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  await documentsService.deleteFolder(req.user!.id, req.params.id);
  return res.status(204).send();
});

export const createDocument = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const doc = await documentsService.createDocument(
    req.user!.id,
    (req as any).validated.body,
  );
  return res.status(201).json({ document: doc });
});

export const updateDocument = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const doc = await documentsService.updateDocument(
    req.user!.id,
    req.params.id,
    (req as any).validated.body,
  );
  return res.json({ document: doc });
});

export const deleteDocument = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  await documentsService.deleteDocument(req.user!.id, req.params.id);
  return res.status(204).send();
});

export const uploadDocumentFile = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const file = (req as any).file;
  if (!file) throw new AppError("No file uploaded", 400);
  const result = await documentsService.uploadDocumentFile(file.buffer, file.originalname, file.mimetype);
  return res.status(201).json(result);
});