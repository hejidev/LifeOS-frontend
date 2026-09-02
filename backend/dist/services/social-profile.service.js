"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSocialProfile = createSocialProfile;
exports.getSocialProfileByUserId = getSocialProfileByUserId;
const prisma_1 = require("../config/prisma");
async function createSocialProfile(data) {
    const existing = await prisma_1.prisma.socialProfile.findUnique({
        where: {
            slug: data.slug.toLowerCase(),
        },
    });
    if (existing) {
        throw new Error("That username is already taken");
    }
    return prisma_1.prisma.socialProfile.create({
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
async function getSocialProfileByUserId(userId) {
    return prisma_1.prisma.socialProfile.findUnique({
        where: { userId },
        include: {
            links: {
                orderBy: { sortOrder: "asc" },
            },
        },
    });
}
