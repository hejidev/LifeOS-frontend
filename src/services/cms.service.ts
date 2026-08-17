import { prisma } from "../config/prisma";
import { AppError } from "../lib/errors";

function slugify(title: string) {
  return title.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export async function createContent(authorId: string, data: {
  type: string; title: string; excerpt?: string; body: string; coverImageUrl?: string; order?: number;
}) {
  const needsSlug = data.type === "BLOG" || data.type === "FAQ";
  return prisma.contentItem.create({
    data: {
      type: data.type as any,
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

export async function updateContent(id: string, data: any) {
  const item = await prisma.contentItem.findUnique({ where: { id } });
  if (!item) throw new AppError("Content not found", 404);
  return prisma.contentItem.update({ where: { id }, data });
}

export async function submitForReview(userId: string, id: string) {
  const item = await prisma.contentItem.findUnique({ where: { id } });
  if (!item) throw new AppError("Content not found", 404);
  if (item.authorId !== userId) throw new AppError("You can only submit your own content", 403);
  return prisma.contentItem.update({ where: { id }, data: { status: "PENDING_REVIEW" } });
}

export async function publishDirectly(id: string) {
  const item = await prisma.contentItem.findUnique({ where: { id } });
  if (!item) throw new AppError("Content not found", 404);
  return prisma.contentItem.update({ where: { id }, data: { status: "PUBLISHED", publishedAt: new Date() } });
}

export async function reviewContent(reviewerId: string, id: string, action: "APPROVE" | "REJECT", note?: string) {
  const item = await prisma.contentItem.findUnique({ where: { id } });
  if (!item) throw new AppError("Content not found", 404);
  if (item.status !== "PENDING_REVIEW") throw new AppError("This item isn't pending review", 400);

  return prisma.contentItem.update({
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

export async function deleteContent(id: string) {
  const item = await prisma.contentItem.findUnique({ where: { id } });
  if (!item) throw new AppError("Content not found", 404);
  await prisma.contentItem.delete({ where: { id } });
}

export async function listAllContent(type?: string, status?: string) {
  return prisma.contentItem.findMany({
    where: { ...(type && { type: type as any }), ...(status && { status: status as any }) },
    include: { author: { select: { name: true, email: true } } },
    orderBy: [{ type: "asc" }, { order: "asc" }, { createdAt: "desc" }],
  });
}

export async function listMyContent(userId: string) {
  return prisma.contentItem.findMany({ where: { authorId: userId }, orderBy: { updatedAt: "desc" } });
}

export async function getPublished(type: string) {
  return prisma.contentItem.findMany({
    where: { type: type as any, status: "PUBLISHED" },
    orderBy: [{ order: "asc" }, { publishedAt: "desc" }],
  });
}

export async function getPublishedBySlug(slug: string) {
  const item = await prisma.contentItem.findFirst({ where: { slug, status: "PUBLISHED" } });
  if (!item) throw new AppError("Not found", 404);
  return item;
}