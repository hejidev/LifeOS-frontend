import type { Request, Response } from "express";
import { asyncHandler } from "../lib/errors";
import * as utilitiesService from "../services/utilities.service";
import type { AuthenticatedRequest } from "../middlewares/auth.middleware";
import * as socialProfileService from "../services/social-profile.service";
import * as socialProfileViewService from "../services/social-profile-view.service";
import { prisma } from "../config/prisma";

export const getExchangeRates = asyncHandler(async (req: Request, res: Response) => {
  const base = (req.query.base as string) ?? "USD";
  const data = await utilitiesService.getExchangeRates(base);
  return res.json(data);
});

export const translateText = asyncHandler(async (req: Request, res: Response) => {
  const { text, targetLanguage } = req.body;
  const translated = await utilitiesService.translateText(text, targetLanguage);
  return res.json({ translated });
});


export const createSocialProfile = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.id;

    const profile =
      await socialProfileService.createSocialProfile({
        userId,
        ...req.body,
      });

    return res.status(201).json(profile);
  }
);

export async function getPublicSocialProfile(
  slug: string,
  viewData?: {
    userAgent?: string;
    referrer?: string;
    country?: string;
    device?: string;
  }
) {
  const profile = await prisma.socialProfile.findFirst({
    where: {
      slug: slug.toLowerCase(),
      isPublic: true,
    },
    include: {
      links: {
        where: {
          enabled: true,
        },
        orderBy: {
          sortOrder: "asc",
        },
      },
    },
  });

  if (!profile) {
    throw new Error("Social profile not found");
  }

  await socialProfileViewService.createProfileView({
    profileId: profile.id,
    ...viewData,
  });

  return profile;
}


export const getMySocialProfile = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const profile = await socialProfileService.getSocialProfileByUserId(req.user!.id);
    return res.json(profile); // null if the user hasn't created one yet — that's fine
  }
);