import type { Response } from "express";
import { asyncHandler, AppError } from "../lib/errors";
import type { AuthenticatedRequest } from "../middlewares/auth.middleware";
import * as studyService from "../services/study.service";

export const getDashboard = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { range } = (req as any).validated.query ?? {};
  const data = await studyService.getStudyDashboard(req.user!.id, range ?? "month");
  return res.json(data);
});

export const getSubjects = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const subjects = await studyService.getSubjects(req.user!.id);
  return res.json({ subjects });
});

export const createSubject = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const subject = await studyService.createSubject(req.user!.id, (req as any).validated.body);
  return res.status(201).json({ subject });
});

export const updateSubject = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const subject = await studyService.updateSubject(req.user!.id, req.params.id, (req as any).validated.body);
  return res.json({ subject });
});

export const getMaterials = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const materials = await studyService.getMaterials(req.user!.id);
  return res.json({ materials });
});

export const createMaterial = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const material = await studyService.createMaterial(req.user!.id, (req as any).validated.body);
  return res.status(201).json({ material });
});

export const updateMaterial = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const material = await studyService.updateMaterial(req.user!.id, req.params.id, (req as any).validated.body);
  return res.json({ material });
});

export const uploadMaterialFile = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const file = (req as any).file;
  if (!file) throw new AppError("No file uploaded", 400);
  const result = await studyService.uploadMaterialFile(file.buffer, file.originalname, file.mimetype);
  return res.status(201).json(result);
});

export const createSession = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const session = await studyService.createSession(req.user!.id, (req as any).validated.body);
  return res.status(201).json({ session });
});

export const endSession = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const session = await studyService.endSession(req.user!.id, req.params.id, (req as any).validated.body);
  return res.json({ session });
});

export const deleteMaterial = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  await studyService.deleteMaterial(req.user!.id, req.params.id);
  return res.status(204).send();
});