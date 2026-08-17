import { prisma } from "../config/prisma";
import { AppError } from "../lib/errors";
import { encryptSecret, decryptSecret, hashSecret, scorePasswordStrength, strengthLabel } from "../lib/crypto";

function serializeItem(item: any, includePassword = false) {
  return {
    id: item.id,
    label: item.label,
    username: item.username,
    url: item.url,
    category: item.category,
    notes: item.notes,
    tags: item.tags,
    favorite: item.favorite,
    strength: item.strength,
    strengthLabel: strengthLabel(item.strength),
    lastChangedAt: item.lastChangedAt.toISOString(),
    createdAt: item.createdAt.toISOString(),
    hasPassword: Boolean(item.passwordCipher),
    ...(includePassword && item.passwordCipher ? { password: decryptSecret(item.passwordCipher) } : {}),
  };
}

export async function getVaultDashboard(userId: string) {
  const items = await prisma.vaultItem.findMany({ where: { userId }, orderBy: { updatedAt: "desc" } });

  const weakCount = items.filter((i) => strengthLabel(i.strength) === "weak").length;

  const hashCounts = new Map<string, number>();
  items.forEach((i) => { if (i.passwordHash) hashCounts.set(i.passwordHash, (hashCounts.get(i.passwordHash) ?? 0) + 1); });
  const reusedCount = items.filter((i) => i.passwordHash && (hashCounts.get(i.passwordHash) ?? 0) > 1).length;

  const oldPasswords = items.filter((i) => (Date.now() - i.lastChangedAt.getTime()) / 86400000 > 180).length;

  let insight = "Add your first login to see your security score.";
  if (items.length > 0) {
    if (weakCount > 0) insight = `${weakCount} password${weakCount > 1 ? "s are" : " is"} weak — update them to reduce risk.`;
    else if (reusedCount > 0) insight = `${reusedCount} password${reusedCount > 1 ? "s are" : " is"} reused across accounts — give each login a unique password.`;
    else if (oldPasswords > 0) insight = `${oldPasswords} password${oldPasswords > 1 ? "s haven't" : " hasn't"} been changed in over 6 months.`;
    else insight = "Your vault looks healthy — no weak or reused passwords detected.";
  }

  return {
    items: items.map((i) => serializeItem(i)),
    stats: { totalItems: items.length, weakCount, reusedCount, oldPasswords },
    insight,
  };
}

export async function getVaultItemWithPassword(userId: string, id: string) {
  const item = await prisma.vaultItem.findFirst({ where: { id, userId } });
  if (!item) throw new AppError("Item not found", 404);
  return serializeItem(item, true);
}

export async function createVaultItem(userId: string, data: {
  label: string; username?: string; password?: string; url?: string; category?: string; notes?: string; tags?: string[]; favorite?: boolean;
}) {
  const item = await prisma.vaultItem.create({
    data: {
      userId, label: data.label, username: data.username,
      passwordCipher: data.password ? encryptSecret(data.password) : undefined,
      passwordHash: data.password ? hashSecret(data.password) : undefined,
      strength: data.password ? scorePasswordStrength(data.password) : 0,
      url: data.url, category: (data.category as any) ?? "WEBSITE",
      notes: data.notes, tags: data.tags ?? [], favorite: data.favorite ?? false,
    },
  });
  return serializeItem(item);
}

export async function updateVaultItem(userId: string, id: string, data: {
  label?: string; username?: string; password?: string; url?: string; category?: string; notes?: string; tags?: string[]; favorite?: boolean;
}) {
  const existing = await prisma.vaultItem.findFirst({ where: { id, userId } });
  if (!existing) throw new AppError("Item not found", 404);

  const passwordChanged = Boolean(data.password);

  const item = await prisma.vaultItem.update({
    where: { id },
    data: {
      ...(data.label && { label: data.label }),
      ...(data.username !== undefined && { username: data.username }),
      ...(passwordChanged && {
        passwordCipher: encryptSecret(data.password!),
        passwordHash: hashSecret(data.password!),
        strength: scorePasswordStrength(data.password!),
        lastChangedAt: new Date(),
      }),
      ...(data.url !== undefined && { url: data.url }),
      ...(data.category && { category: data.category as any }),
      ...(data.notes !== undefined && { notes: data.notes }),
      ...(data.tags && { tags: data.tags }),
      ...(data.favorite !== undefined && { favorite: data.favorite }),
    },
  });
  return serializeItem(item);
}

export async function deleteVaultItem(userId: string, id: string) {
  const existing = await prisma.vaultItem.findFirst({ where: { id, userId } });
  if (!existing) throw new AppError("Item not found", 404);
  await prisma.vaultItem.delete({ where: { id } });
}