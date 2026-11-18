"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSocialProfile = createSocialProfile;
exports.getSocialProfileByUserId = getSocialProfileByUserId;
exports.updateSocialProfile = updateSocialProfile;
exports.deleteSocialProfile = deleteSocialProfile;
exports.getPublicProfile = getPublicProfile;
const crypto_1 = __importDefault(require("crypto"));
const prisma_1 = require("../config/prisma");
const redis_1 = require("../config/redis");
const errors_1 = require("../lib/errors");
const safe_url_1 = require("../lib/safe-url");
const social_profile_view_service_1 = require("./social-profile-view.service");
const linkRows = (links) => links.map((link) => ({ platform: link.platform, url: link.url, label: link.label, enabled: link.enabled, sortOrder: link.sortOrder }));
const withLinks = { links: { orderBy: { sortOrder: "asc" } } };
async function createSocialProfile(data) {
    const slug = data.slug.toLowerCase();
    if (await prisma_1.prisma.socialProfile.findUnique({ where: { userId: data.userId } })) {
        throw new errors_1.AppError("You already have a social profile", 409);
    }
    try {
        return await prisma_1.prisma.socialProfile.create({
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
    }
    catch (err) {
        if (err?.code === "P2002")
            throw new errors_1.AppError("That username is already taken", 409);
        throw err;
    }
}
async function getSocialProfileByUserId(userId) {
    return prisma_1.prisma.socialProfile.findUnique({ where: { userId }, include: withLinks });
}
async function updateSocialProfile(userId, data) {
    const existing = await prisma_1.prisma.socialProfile.findUnique({ where: { userId } });
    if (!existing)
        throw new errors_1.AppError("Social profile not found", 404);
    return prisma_1.prisma.$transaction(async (tx) => {
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
async function deleteSocialProfile(userId) {
    const existing = await prisma_1.prisma.socialProfile.findUnique({ where: { userId } });
    if (!existing)
        throw new errors_1.AppError("Social profile not found", 404);
    await prisma_1.prisma.socialProfile.delete({ where: { id: existing.id } });
}
async function recordView(profileId, meta) {
    try {
        const visitor = crypto_1.default.createHash("sha256").update(`${meta.ip}|${meta.userAgent ?? ""}`).digest("hex").slice(0, 24);
        const fresh = await redis_1.redis.set(`sp:view:${profileId}:${visitor}`, "1", "EX", 600, "NX");
        if (fresh !== "OK")
            return;
        await (0, social_profile_view_service_1.createProfileView)({ profileId, userAgent: meta.userAgent?.slice(0, 300), referrer: meta.referrer?.slice(0, 300) });
    }
    catch (err) {
        console.error("[social-profile] view not recorded:", err.message);
    }
}
async function getPublicProfile(slug, meta) {
    const profile = await prisma_1.prisma.socialProfile.findFirst({
        where: { slug: slug.toLowerCase(), isPublic: true },
        include: { links: { where: { enabled: true }, orderBy: { sortOrder: "asc" } } },
    });
    if (!profile)
        throw new errors_1.AppError("Social profile not found", 404);
    void recordView(profile.id, meta);
    return {
        slug: profile.slug,
        displayName: profile.displayName,
        bio: profile.bio,
        avatar: profile.avatar,
        links: profile.links
            .filter((link) => (0, safe_url_1.isLinkUrl)(link.url))
            .map((link) => ({ id: link.id, platform: link.platform, url: link.url, label: link.label })),
    };
}
