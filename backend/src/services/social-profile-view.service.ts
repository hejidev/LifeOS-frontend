import { prisma } from "../config/prisma";

interface CreateProfileViewData {
  profileId: string;
  userAgent?: string;
  referrer?: string;
  country?: string;
  device?: string;
}

export async function createProfileView(
  data: CreateProfileViewData
) {
  return prisma.socialProfileView.create({
    data: {
      profileId: data.profileId,
      userAgent: data.userAgent,
      referrer: data.referrer,
      country: data.country,
      device: data.device,
    },
  });
}