import type { VaultItem } from "@prisma/client";
import { prisma } from "../config/prisma";
import { AppError } from "../lib/errors";
import { decryptSecret, encryptSecret, reuseFingerprint, scorePasswordStrength, strengthLabel } from "../lib/crypto";

const NOTES_PREFIX = "enc:v1:";
const MAX_ITEMS = 500;
const OLD_DAYS = 180;

function sealNotes(notes: string | null | undefined) {
  if (notes === undefined) return undefined;
  if (notes === null || notes.trim() === "") return null;
  return `${NOTES_PREFIX}${encryptSecret(notes)}`;
}

function openNotes(stored: string | null) {
  if (!stored) return null;
  return stored.startsWith(NOTES_PREFIX) ? decryptSecret(stored.slice(NOTES_PREFIX.length)) : stored;
}

const cleanTags = (tags?: string[]) => (tags ? [...new Set(tags.map((tag) => tag.trim()).filter(Boolean))].slice(0, 20) : undefined);

function view(item: VaultItem, reusedHashes: Set<string>) {
  const hasPassword = Boolean(item.passwordCipher);
  const ageDays = (Date.now() - item.lastChangedAt.getTime()) / 86_400_000;
  return {
    id: item.id,
    label: item.label,
    username: item.username,
    url: item.url,
    category: item.category,
    tags: item.tags,
    favorite: item.favorite,
    strength: hasPassword ? item.strength : 0,
    strengthLabel: hasPassword ? strengthLabel(item.strength) : null,
    lastChangedAt: item.lastChangedAt.toISOString(),
    createdAt: item.createdAt.toISOString(),
    hasPassword,
    hasNotes: Boolean(item.notes),
    reused: hasPassword && !!item.passwordHash && reusedHashes.has(item.passwordHash),
    old: hasPassword && ageDays > OLD_DAYS,
  };
}

export async function getVaultDashboard(userId: string) {
  const items = await prisma.vaultItem.findMany({ where: { userId }, orderBy: [{ favorite: "desc" }, { label: "asc" }] });

  const counts = new Map<string, number>();
  items.forEach((item) => item.passwordHash && counts.set(item.passwordHash, (counts.get(item.passwordHash) ?? 0) + 1));
  const reusedHashes = new Set([...counts].filter(([, count]) => count > 1).map(([hash]) => hash));

  const views = items.map((item) => view(item, reusedHashes));
  const withPassword = views.filter((item) => item.hasPassword);
  const weakCount = withPassword.filter((item) => item.strengthLabel === "weak").length;
  const reusedCount = views.filter((item) => item.reused).length;
  const oldPasswords = views.filter((item) => item.old).length;
  const healthy = withPassword.filter((item) => item.strengthLabel !== "weak" && !item.reused && !item.old).length;

  let insight = "Add your first login to see your security score.";
  if (items.length > 0) {
    if (weakCount > 0) insight = `${weakCount} ${weakCount === 1 ? "password is" : "passwords are"} weak. Replace ${weakCount === 1 ? "it" : "them"} with generated ones.`;
    else if (reusedCount > 0) insight = `${reusedCount} ${reusedCount === 1 ? "password is" : "passwords are"} reused across logins. Give each login its own password.`;
    else if (oldPasswords > 0) insight = `${oldPasswords} ${oldPasswords === 1 ? "password hasn't" : "passwords haven't"} changed in over 6 months.`;
    else insight = "Your vault looks healthy. No weak, reused or old passwords found.";
  }

  return {
    items: views,
    stats: {
      totalItems: items.length,
      withPassword: withPassword.length,
      weakCount,
      reusedCount,
      oldPasswords,
      healthScore: withPassword.length ? Math.round((healthy / withPassword.length) * 100) : null,
    },
    insight,
  };
}

export async function revealVaultItem(userId: string, id: string) {
  const item = await prisma.vaultItem.findFirst({ where: { id, userId } });
  if (!item) throw new AppError("Item not found", 404);
  return {
    id: item.id,
    password: item.passwordCipher ? decryptSecret(item.passwordCipher) : null,
    notes: openNotes(item.notes),
  };
}

interface ItemInput {
  label?: string;
  username?: string | null;
  password?: string;
  url?: string | null;
  category?: string;
  notes?: string | null;
  tags?: string[];
  favorite?: boolean;
}

export async function createVaultItem(userId: string, data: ItemInput & { label: string }) {
  if ((await prisma.vaultItem.count({ where: { userId } })) >= MAX_ITEMS) throw new AppError(`Your vault can hold up to ${MAX_ITEMS} items`, 400);

  const item = await prisma.vaultItem.create({
    data: {
      userId,
      label: data.label,
      username: data.username ?? undefined,
      passwordCipher: data.password ? encryptSecret(data.password) : undefined,
      passwordHash: data.password ? reuseFingerprint(userId, data.password) : undefined,
      strength: data.password ? scorePasswordStrength(data.password) : 0,
      url: data.url ?? undefined,
      category: (data.category as any) ?? "WEBSITE",
      notes: sealNotes(data.notes) ?? undefined,
      tags: cleanTags(data.tags) ?? [],
      favorite: data.favorite ?? false,
    },
  });
  return view(item, new Set());
}

export async function updateVaultItem(userId: string, id: string, data: ItemInput) {
  const existing = await prisma.vaultItem.findFirst({ where: { id, userId } });
  if (!existing) throw new AppError("Item not found", 404);

  const item = await prisma.vaultItem.update({
    where: { id },
    data: {
      ...(data.label && { label: data.label }),
      ...(data.username !== undefined && { username: data.username }),
      ...(data.password && {
        passwordCipher: encryptSecret(data.password),
        passwordHash: reuseFingerprint(userId, data.password),
        strength: scorePasswordStrength(data.password),
        lastChangedAt: new Date(),
      }),
      ...(data.url !== undefined && { url: data.url }),
      ...(data.category && { category: data.category as any }),
      ...(data.notes !== undefined && { notes: sealNotes(data.notes) }),
      ...(data.tags && { tags: cleanTags(data.tags) }),
      ...(data.favorite !== undefined && { favorite: data.favorite }),
    },
  });
  return view(item, new Set());
}

export async function deleteVaultItem(userId: string, id: string) {
  const result = await prisma.vaultItem.deleteMany({ where: { id, userId } });
  if (result.count === 0) throw new AppError("Item not found", 404);
}