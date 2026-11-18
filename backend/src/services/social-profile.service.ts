import crypto from "crypto";
import { prisma } from "../config/prisma";
import { redis } from "../config/redis";
import { AppError } from "../lib/errors";
import { isLinkUrl } from "../lib/safe-url";
import { createProfileView } from "./social-profile-view.service";

interface SocialLinkInput {
  platform: string;
  url: string;
  label?: string;
  enabled: boolean;
  sortOrder: number;
}

interface ProfileInput {
  displayName: string;
  bio?: string;
  avatar?: string;
  isPublic: boolean;
  links: SocialLinkInput[];
}

const linkRows = (links: SocialLinkInput[]) =>
  links.map((link) => ({ platform: link.platform, url: link.url, label: link.label, enabled: link.enabled, sortOrder: link.sortOrder }));

const withLinks = { links: { orderBy: { sortOrder: "asc" as const } } };

export async function createSocialProfile(data: ProfileInput & { userId: string; slug: string }) {
  const slug = data.slug.toLowerCase();

  if (await prisma.socialProfile.findUnique({ where: { userId: data.userId } })) {
    throw new AppError("You already have a social profile", 409);
  }

  try {
    return await prisma.socialProfile.create({
      data: {
        userId: data.userId,
        slug,
        displayName: data.displayName,
        bio: data.bio,
        avatar: data.avatar,
        isPublic: data.isPublic,
        links: { create: linkRows(data.links) },
      },
      include: withLinks,
    });
  } catch (err: any) {
    if (err?.code === "P2002") throw new AppError("That username is already taken", 409);
    throw err;
  }
}

export async function getSocialProfileByUserId(userId: string) {
  return prisma.socialProfile.findUnique({ where: { userId }, include: withLinks });
}

export async function updateSocialProfile(userId: string, data: ProfileInput) {
  const existing = await prisma.socialProfile.findUnique({ where: { userId } });
  if (!existing) throw new AppError("Social profile not found", 404);

  return prisma.$transaction(async (tx) => {
    await tx.socialLink.deleteMany({ where: { profileId: existing.id } });
    return tx.socialProfile.update({
      where: { id: existing.id },
      data: {
        displayName: data.displayName,
        bio: data.bio ?? null,
        avatar: data.avatar ?? null,
        isPublic: data.isPublic,
        links: { create: linkRows(data.links) },
      },
      include: withLinks,
    });
  });
}

export async function deleteSocialProfile(userId: string) {
  const existing = await prisma.socialProfile.findUnique({ where: { userId } });
  if (!existing) throw new AppError("Social profile not found", 404);
  await prisma.socialProfile.delete({ where: { id: existing.id } });
}

async function recordView(profileId: string, meta: { ip: string; userAgent?: string; referrer?: string }) {
  try {
    const visitor = crypto.createHash("sha256").update(`${meta.ip}|${meta.userAgent ?? ""}`).digest("hex").slice(0, 24);
    const fresh = await redis.set(`sp:view:${profileId}:${visitor}`, "1", "EX", 600, "NX");
    if (fresh !== "OK") return;
    await createProfileView({ profileId, userAgent: meta.userAgent?.slice(0, 300), referrer: meta.referrer?.slice(0, 300) });
  } catch (err) {
    console.error("[social-profile] view not recorded:", (err as Error).message);
  }
}

export async function getPublicProfile(slug: string, meta: { ip: string; userAgent?: string; referrer?: string }) {
  const profile = await prisma.socialProfile.findFirst({
    where: { slug: slug.toLowerCase(), isPublic: true },
    include: { links: { where: { enabled: true }, orderBy: { sortOrder: "asc" } } },
  });
  if (!profile) throw new AppError("Social profile not found", 404);

  void recordView(profile.id, meta);

  return {
    slug: profile.slug,
    displayName: profile.displayName,
    bio: profile.bio,
    avatar: profile.avatar,
    links: profile.links
      .filter((link) => isLinkUrl(link.url))
      .map((link) => ({ id: link.id, platform: link.platform, url: link.url, label: link.label })),
  };
}