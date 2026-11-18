import type { Request, Response } from "express";
import { asyncHandler } from "../lib/errors";
import type { AuthenticatedRequest } from "../middlewares/auth.middleware";
import * as utilitiesService from "../services/utilities.service";
import * as socialProfileService from "../services/social-profile.service";

export const getExchangeRates = asyncHandler(async (req: Request, res: Response) =>
  res.json(await utilitiesService.getExchangeRates(String(req.query.base ?? "USD")))
);

export const translateText = asyncHandler(async (req: Request, res: Response) => {
  const { text, targetLanguage } = req.body;
  return res.json({ translated: await utilitiesService.translateText(text, targetLanguage) });
});

export const createSocialProfile = asyncHandler(async (req: AuthenticatedRequest, res: Response) =>
  res.status(201).json(await socialProfileService.createSocialProfile({ userId: req.user!.id, ...req.body }))
);

export const getMySocialProfile = asyncHandler(async (req: AuthenticatedRequest, res: Response) =>
  res.json(await socialProfileService.getSocialProfileByUserId(req.user!.id))
);

export const updateSocialProfile = asyncHandler(async (req: AuthenticatedRequest, res: Response) =>
  res.json(await socialProfileService.updateSocialProfile(req.user!.id, req.body))
);

export const deleteSocialProfile = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  await socialProfileService.deleteSocialProfile(req.user!.id);
  return res.status(204).send();
});