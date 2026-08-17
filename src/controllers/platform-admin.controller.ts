import type { Response } from "express";
import { asyncHandler } from "../lib/errors";
import type { AuthenticatedRequest } from "../middlewares/auth.middleware";
import * as platformAdminService from "../services/platform-admin.service";

export const listUsers = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const search = req.query.search as string | undefined;
  const users = await platformAdminService.listUsers(search);
  return res.json({ users });
});

export const toggleUserStatus = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const user = await platformAdminService.toggleUserStatus(req.user!.id, req.params.id);
  return res.json({ user });
});

export const sendSupportPasswordReset = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  await platformAdminService.sendSupportPasswordReset(req.user!.id, req.params.id, req.body.reason);
  return res.status(204).send();
});

export const requestSupportEmailChange = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  await platformAdminService.requestSupportEmailChange(req.user!.id, req.params.id, req.body.email, req.body.reason);
  return res.status(204).send();
});

export const confirmSupportEmailChange = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  await platformAdminService.confirmSupportEmailChange(req.body.token);
  return res.status(204).send();
});

export const resetSupportTwoFactor = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  await platformAdminService.resetSupportTwoFactor(req.user!.id, req.params.id, req.body.reason);
  return res.status(204).send();
});

export const deleteUser = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  await platformAdminService.deleteUser(req.user!.id, req.params.id, req.body.confirmationEmail, req.body.reason);
  return res.status(204).send();
});

export const getOverview = asyncHandler(async (_req: AuthenticatedRequest, res: Response) => {
  const overview = await platformAdminService.getOverview();
  return res.json(overview);
});

export const getAuditLog = asyncHandler(async (_req: AuthenticatedRequest, res: Response) => {
  const logs = await platformAdminService.getAuditLog();
  return res.json({ logs });
});

export const listTenants = asyncHandler(async (_req: AuthenticatedRequest, res: Response) => {
  const tenants = await platformAdminService.listTenants();
  return res.json({ tenants });
});

export const getBillingStats = asyncHandler(async (_req: AuthenticatedRequest, res: Response) => {
  const stats = await platformAdminService.getBillingStats();
  return res.json(stats);
});

export const getAnalytics = asyncHandler(async (_req: AuthenticatedRequest, res: Response) => {
  const analytics = await platformAdminService.getAnalytics();
  return res.json(analytics);
});

export const getMyPermissions = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  return res.json(await platformAdminService.getMyPermissions(req.user!.id, req.user!.role));
});
