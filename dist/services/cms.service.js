"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createContent = createContent;
exports.updateContent = updateContent;
exports.submitForReview = submitForReview;
exports.publishDirectly = publishDirectly;
exports.reviewContent = reviewContent;
exports.deleteContent = deleteContent;
exports.listAllContent = listAllContent;
exports.listMyContent = listMyContent;
exports.getPublished = getPublished;
exports.getPublishedBySlug = getPublishedBySlug;
const prisma_1 = require("../config/prisma");
const errors_1 = require("../lib/errors");
function slugify(title) {
    return title.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}
async function createContent(authorId, data) {
    const needsSlug = data.type === "BLOG" || data.type === "FAQ";
    return prisma_1.prisma.contentItem.create({
        data: {
            type: data.type,
            title: data.title,
            slug: needsSlug ? `${slugify(data.title)}-${Date.now().toString(36)}` : null,
            excerpt: data.excerpt,
            body: data.body,
            coverImageUrl: data.coverImageUrl,
            order: data.order ?? 0,
            authorId,
            status: "DRAFT",
        },
    });
}
async function updateContent(id, data) {
    const item = await prisma_1.prisma.contentItem.findUnique({ where: { id } });
    if (!item)
        throw new errors_1.AppError("Content not found", 404);
    return prisma_1.prisma.contentItem.update({ where: { id }, data });
}
async function submitForReview(userId, id) {
    const item = await prisma_1.prisma.contentItem.findUnique({ where: { id } });
    if (!item)
        throw new errors_1.AppError("Content not found", 404);
    if (item.authorId !== userId)
        throw new errors_1.AppError("You can only submit your own content", 403);
    return prisma_1.prisma.contentItem.update({ where: { id }, data: { status: "PENDING_REVIEW" } });
}
async function publishDirectly(id) {
    const item = await prisma_1.prisma.contentItem.findUnique({ where: { id } });
    if (!item)
        throw new errors_1.AppError("Content not found", 404);
    return prisma_1.prisma.contentItem.update({ where: { id }, data: { status: "PUBLISHED", publishedAt: new Date() } });
}
async function reviewContent(reviewerId, id, action, note) {
    const item = await prisma_1.prisma.contentItem.findUnique({ where: { id } });
    if (!item)
        throw new errors_1.AppError("Content not found", 404);
    if (item.status !== "PENDING_REVIEW")
        throw new errors_1.AppError("This item isn't pending review", 400);
    return prisma_1.prisma.contentItem.update({
        where: { id },
        data: {
            status: action === "APPROVE" ? "PUBLISHED" : "REJECTED",
            reviewedBy: reviewerId,
            reviewedAt: new Date(),
            reviewNote: note,
            publishedAt: action === "APPROVE" ? new Date() : null,
        },
    });
}
async function deleteContent(id) {
    const item = await prisma_1.prisma.contentItem.findUnique({ where: { id } });
    if (!item)
        throw new errors_1.AppError("Content not found", 404);
    await prisma_1.prisma.contentItem.delete({ where: { id } });
}
async function listAllContent(type, status) {
    return prisma_1.prisma.contentItem.findMany({
        where: { ...(type && { type: type }), ...(status && { status: status }) },
        include: { author: { select: { name: true, email: true } } },
        orderBy: [{ type: "asc" }, { order: "asc" }, { createdAt: "desc" }],
    });
}
async function listMyContent(userId) {
    return prisma_1.prisma.contentItem.findMany({ where: { authorId: userId }, orderBy: { updatedAt: "desc" } });
}
async function getPublished(type) {
    return prisma_1.prisma.contentItem.findMany({
        where: { type: type, status: "PUBLISHED" },
        orderBy: [{ order: "asc" }, { publishedAt: "desc" }],
    });
}
async function getPublishedBySlug(slug) {
    const item = await prisma_1.prisma.contentItem.findFirst({ where: { slug, status: "PUBLISHED" } });
    if (!item)
        throw new errors_1.AppError("Not found", 404);
    return item;
}
