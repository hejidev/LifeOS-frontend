import type { Request, Response } from "express";
import { asyncHandler } from "../lib/errors";
import type { AuthenticatedRequest } from "../middlewares/auth.middleware";
import * as familyService from "../services/family.service";

export const getDashboard = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const data = await familyService.getFamilyDashboard(req.user!.id);
  return res.json(data);
});

export const createMember = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const member = await familyService.createMember(req.user!.id, req.body);
  return res.status(201).json({ member });
});

export const updateMember = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const member = await familyService.updateMember(req.user!.id, req.params.id, req.body);
  return res.json({ member });
});

export const deleteMember = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  await familyService.deleteMember(req.user!.id, req.params.id);
  return res.status(204).send();
});

export const createControl = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const control = await familyService.createControl(req.user!.id, req.body);
  return res.status(201).json({ control });
});

export const updateControl = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const control = await familyService.updateControl(req.user!.id, req.params.id, req.body);
  return res.json({ control });
});

export const deleteControl = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  await familyService.deleteControl(req.user!.id, req.params.id);
  return res.status(204).send();
});

export const createInvite = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const invite = await familyService.createInvite(req.user!.id, req.user!.name ?? "A family member", req.body);
  return res.status(201).json({ invite });
});

export const revokeInvite = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  await familyService.revokeInvite(req.user!.id, req.params.id);
  return res.status(204).send();
});

export const getInvite = asyncHandler(async (req: Request, res: Response) => {
    const invite = await familyService.getInviteByToken(req.params.token);
    return res.json({ invite });
  });
  
  export const acceptInvite = asyncHandler(async (req: Request, res: Response) => {
    const member = await familyService.acceptInvite(req.body.token, req.body.name);
    return res.status(201).json({ member });
  });