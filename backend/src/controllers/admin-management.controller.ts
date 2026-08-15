import type { Response } from "express";
import { asyncHandler } from "../lib/errors";
import type { AuthenticatedRequest } from "../middlewares/auth.middleware";
import * as adminManagementService from "../services/admin-management.service";

export const changeRole = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const user = await adminManagementService.changeUserRole(req.user!.id, req.params.id, req.body.role);
  return res.json({ user });
});

export const createAdmin = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const user = await adminManagementService.createAdmin(req.user!.id, req.body);
  return res.status(201).json({ user });
});

export const grantPermission = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  await adminManagementService.grantPermission(req.user!.id, req.params.id, req.body.capability);
  return res.status(204).send();
});

export const revokePermission = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  await adminManagementService.revokePermission(req.user!.id, req.params.id, req.body.capability);
  return res.status(204).send();
});

export const getAdmins = asyncHandler(async (_req: AuthenticatedRequest, res: Response) => {
  const admins = await adminManagementService.getAdmins();
  return res.json({ admins });
});

export const sendBroadcast = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const result = await adminManagementService.sendBroadcast(req.user!.id, req.body);
  return res.json(result);
});