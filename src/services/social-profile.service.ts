import { prisma } from "../config/prisma";

interface SocialLinkInput {
  platform: string;
  url: string;
  label?: string;
  enabled: boolean;
  sortOrder: number;
}

interface CreateSocialProfileInput {
  userId: string;
  slug: string;
  displayName: string;
  bio?: string;
  avatar?: string;
  isPublic: boolean;
  links: SocialLinkInput[];
}

export async function createSocialProfile(
  data: CreateSocialProfileInput
) {
  const existing = await prisma.socialProfile.findUnique({
    where: {
      slug: data.slug.toLowerCase(),
    },
  });

  if (existing) {
    throw new Error("That username is already taken");
  }

  return prisma.socialProfile.create({
    data: {
      userId: data.userId,
      slug: data.slug.toLowerCase(),
      displayName: data.displayName,
      bio: data.bio,
      avatar: data.avatar,
      isPublic: data.isPublic,

      links: {
        create: data.links.map((link) => ({
          platform: link.platform,
          url: link.url,
          label: link.label,
          enabled: link.enabled,
          sortOrder: link.sortOrder,
        })),
      },
    },

    include: {
      links: {
        orderBy: {
          sortOrder: "asc",
        },
      },
    },
  });
}

export async function getSocialProfileByUserId(userId: string) {
  return prisma.socialProfile.findUnique({
    where: { userId },
    include: {
      links: {
        orderBy: { sortOrder: "asc" },
      },
    },
  });
}