"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getVaultDashboard = getVaultDashboard;
exports.getVaultItemWithPassword = getVaultItemWithPassword;
exports.createVaultItem = createVaultItem;
exports.updateVaultItem = updateVaultItem;
exports.deleteVaultItem = deleteVaultItem;
const prisma_1 = require("../config/prisma");
const errors_1 = require("../lib/errors");
const crypto_1 = require("../lib/crypto");
function serializeItem(item, includePassword = false) {
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
        strengthLabel: (0, crypto_1.strengthLabel)(item.strength),
        lastChangedAt: item.lastChangedAt.toISOString(),
        createdAt: item.createdAt.toISOString(),
        hasPassword: Boolean(item.passwordCipher),
        ...(includePassword && item.passwordCipher ? { password: (0, crypto_1.decryptSecret)(item.passwordCipher) } : {}),
    };
}
async function getVaultDashboard(userId) {
    const items = await prisma_1.prisma.vaultItem.findMany({ where: { userId }, orderBy: { updatedAt: "desc" } });
    const weakCount = items.filter((i) => (0, crypto_1.strengthLabel)(i.strength) === "weak").length;
    const hashCounts = new Map();
    items.forEach((i) => { if (i.passwordHash)
        hashCounts.set(i.passwordHash, (hashCounts.get(i.passwordHash) ?? 0) + 1); });
    const reusedCount = items.filter((i) => i.passwordHash && (hashCounts.get(i.passwordHash) ?? 0) > 1).length;
    const oldPasswords = items.filter((i) => (Date.now() - i.lastChangedAt.getTime()) / 86400000 > 180).length;
    let insight = "Add your first login to see your security score.";
    if (items.length > 0) {
        if (weakCount > 0)
            insight = `${weakCount} password${weakCount > 1 ? "s are" : " is"} weak — update them to reduce risk.`;
        else if (reusedCount > 0)
            insight = `${reusedCount} password${reusedCount > 1 ? "s are" : " is"} reused across accounts — give each login a unique password.`;
        else if (oldPasswords > 0)
            insight = `${oldPasswords} password${oldPasswords > 1 ? "s haven't" : " hasn't"} been changed in over 6 months.`;
        else
            insight = "Your vault looks healthy — no weak or reused passwords detected.";
    }
    return {
        items: items.map((i) => serializeItem(i)),
        stats: { totalItems: items.length, weakCount, reusedCount, oldPasswords },
        insight,
    };
}
async function getVaultItemWithPassword(userId, id) {
    const item = await prisma_1.prisma.vaultItem.findFirst({ where: { id, userId } });
    if (!item)
        throw new errors_1.AppError("Item not found", 404);
    return serializeItem(item, true);
}
async function createVaultItem(userId, data) {
    const item = await prisma_1.prisma.vaultItem.create({
        data: {
            userId, label: data.label, username: data.username,
            passwordCipher: data.password ? (0, crypto_1.encryptSecret)(data.password) : undefined,
            passwordHash: data.password ? (0, crypto_1.hashSecret)(data.password) : undefined,
            strength: data.password ? (0, crypto_1.scorePasswordStrength)(data.password) : 0,
            url: data.url, category: data.category ?? "WEBSITE",
            notes: data.notes, tags: data.tags ?? [], favorite: data.favorite ?? false,
        },
    });
    return serializeItem(item);
}
async function updateVaultItem(userId, id, data) {
    const existing = await prisma_1.prisma.vaultItem.findFirst({ where: { id, userId } });
    if (!existing)
        throw new errors_1.AppError("Item not found", 404);
    const passwordChanged = Boolean(data.password);
    const item = await prisma_1.prisma.vaultItem.update({
        where: { id },
        data: {
            ...(data.label && { label: data.label }),
            ...(data.username !== undefined && { username: data.username }),
            ...(passwordChanged && {
                passwordCipher: (0, crypto_1.encryptSecret)(data.password),
                passwordHash: (0, crypto_1.hashSecret)(data.password),
                strength: (0, crypto_1.scorePasswordStrength)(data.password),
                lastChangedAt: new Date(),
            }),
            ...(data.url !== undefined && { url: data.url }),
            ...(data.category && { category: data.category }),
            ...(data.notes !== undefined && { notes: data.notes }),
            ...(data.tags && { tags: data.tags }),
            ...(data.favorite !== undefined && { favorite: data.favorite }),
        },
    });
    return serializeItem(item);
}
async function deleteVaultItem(userId, id) {
    const existing = await prisma_1.prisma.vaultItem.findFirst({ where: { id, userId } });
    if (!existing)
        throw new errors_1.AppError("Item not found", 404);
    await prisma_1.prisma.vaultItem.delete({ where: { id } });
}
