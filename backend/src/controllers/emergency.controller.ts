import type { Request, Response } from "express";
import { asyncHandler } from "../lib/errors";
import type { AuthenticatedRequest } from "../middlewares/auth.middleware";
import * as emergencyService from "../services/emergency.service";

export const getProfile = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const profile = await emergencyService.getProfile(req.user!.id);
  return res.json({ profile });
});

export const updateProfile = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const profile = await emergencyService.updateProfile(req.user!.id, req.body);
  return res.json({ profile });
});

export const addContact = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const contact = await emergencyService.addContact(req.user!.id, req.body);
  return res.status(201).json({ contact });
});

export const updateContact = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const contact = await emergencyService.updateContact(req.user!.id, req.params.id, req.body);
  return res.json({ contact });
});

export const deleteContact = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  await emergencyService.deleteContact(req.user!.id, req.params.id);
  return res.status(204).send();
});

export const reorderContacts = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  await emergencyService.reorderContacts(req.user!.id, req.body.orderedIds);
  return res.status(204).send();
});

export const enableShare = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const profile = await emergencyService.enableShare(req.user!.id, req.body.expiresInDays);
  return res.json({ profile });
});

export const disableShare = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const profile = await emergencyService.disableShare(req.user!.id);
  return res.json({ profile });
});

export const setPin = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const profile = await emergencyService.setSharePin(req.user!.id, req.body.pin);
  return res.json({ profile });
});

export const getAccessLog = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const log = await emergencyService.getAccessLog(req.user!.id);
  return res.json({ log });
});

export const getPublic = asyncHandler(async (req: Request, res: Response) => {
  const pin = req.query.pin as string | undefined;
  const data = await emergencyService.getPublicByToken(req.params.token, pin, {
    ip: req.ip,
    userAgent: req.headers["user-agent"],
  });
  return res.json({ emergency: data });
});