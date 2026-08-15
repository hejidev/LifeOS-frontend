import type { Response } from "express";
import { AppError, asyncHandler } from "../lib/errors";
import type { AuthenticatedRequest } from "../middlewares/auth.middleware";
import * as merchantService from "../services/merchant.service";
import { prisma } from "../config/prisma";
import crypto from "crypto";

export const getStatus = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const status = await merchantService.getApplicationStatus(req.user!.id);
  return res.json(status);
});

export const apply = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const profile = await merchantService.applyAsMerchant(req.user!.id, req.body);
  return res.status(201).json({ profile });
});

export const listApplications = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const status = req.query.status as any;
  const applications = await merchantService.listApplications(status);
  return res.json({ applications });
});

export const reviewApplication = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { action, rejectionReason } = req.body;
    const profile = await merchantService.changeMerchantStatus(req.user!.id, req.params.id, action, rejectionReason);
    return res.json({ profile });
  });
  
  export const getApplicationDetail = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const detail = await merchantService.getApplicationDetail(req.params.id);
    return res.json({ detail });
  });

  export const uploadIdDocument = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const file = (req as any).file;
    if (!file) throw new AppError("No file uploaded", 400);
    const result = await merchantService.uploadIdDocument(file.buffer);
    return res.status(201).json(result);
  });
  
  export const checkout = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const url = await merchantService.createMerchantCheckout(req.user!.id, req.user!.email, req.body.plan, req.body.interval ?? "month");
    return res.json({ url });
  });
  
  export const portal = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const url = await merchantService.createMerchantPortalSession(req.user!.id);
    return res.json({ url });
  });
  
  export const verifyId = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const profile = await merchantService.markIdVerified(req.user!.id, req.params.id);
    return res.json({ profile });
  });

  export const getStaffLoginCode = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    let profile = await prisma.bizProfile.findUnique({ where: { userId: req.user!.id } });
    if (!profile) throw new AppError("Merchant profile not found", 404);
    if (!profile.staffLoginCode) {
      profile = await prisma.bizProfile.update({
        where: { id: profile.id },
        data: { staffLoginCode: crypto.randomBytes(4).toString("hex").toUpperCase() },
      });
    }
    return res.json({ storeCode: profile.staffLoginCode });
  });

  export const regenerateStoreCode = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const profile = await merchantService.regenerateStoreCode(req.user!.id);
    return res.json({ storeCode: profile.staffLoginCode });
  });
  
  export const forceStaffLogout = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    await merchantService.forceStaffLogout(req.user!.id);
    return res.status(204).send();
  });
  
  export const updateNotificationSettings = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const profile = await merchantService.updateNotificationSettings(req.user!.id, req.body);
    return res.json({ profile });
  });
  
  export const setPaused = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const profile = await merchantService.setPaused(req.user!.id, req.body.paused);
    return res.json({ profile });
  });