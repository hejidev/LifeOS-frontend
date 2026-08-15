"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getProfile = getProfile;
exports.updateProfile = updateProfile;
exports.addContact = addContact;
exports.updateContact = updateContact;
exports.deleteContact = deleteContact;
exports.reorderContacts = reorderContacts;
exports.enableShare = enableShare;
exports.disableShare = disableShare;
exports.setSharePin = setSharePin;
exports.getAccessLog = getAccessLog;
exports.getPublicByToken = getPublicByToken;
const crypto_1 = __importDefault(require("crypto"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const prisma_1 = require("../config/prisma");
const errors_1 = require("../lib/errors");
const crypto_2 = require("../lib/crypto");
function calcCompleteness(profile) {
    const fields = [
        profile.bloodType, profile.dateOfBirth, profile.height, profile.weight,
        profile.physicianName, profile.physicianPhone, profile.insuranceProvider,
        profile.allergiesCipher, profile.conditionsCipher, profile.medicationsCipher,
    ];
    return Math.round((fields.filter(Boolean).length / fields.length) * 100);
}
function serialize(profile) {
    return {
        id: profile.id,
        dateOfBirth: profile.dateOfBirth?.toISOString(),
        bloodType: profile.bloodType,
        organDonor: profile.organDonor,
        pregnancyStatus: profile.pregnancyStatus,
        dnrStatus: profile.dnrStatus,
        height: profile.height,
        weight: profile.weight,
        preferredHospital: profile.preferredHospital,
        physicianName: profile.physicianName,
        physicianPhone: profile.physicianPhone,
        insuranceProvider: profile.insuranceProvider,
        insurancePhone: profile.insurancePhone,
        allergies: profile.allergiesCipher ? (0, crypto_2.decryptSecret)(profile.allergiesCipher) : undefined,
        conditions: profile.conditionsCipher ? (0, crypto_2.decryptSecret)(profile.conditionsCipher) : undefined,
        medications: profile.medicationsCipher ? (0, crypto_2.decryptSecret)(profile.medicationsCipher) : undefined,
        insurancePolicy: profile.insurancePolicyCipher ? (0, crypto_2.decryptSecret)(profile.insurancePolicyCipher) : undefined,
        notes: profile.notesCipher ? (0, crypto_2.decryptSecret)(profile.notesCipher) : undefined,
        shareEnabled: profile.shareEnabled,
        shareToken: profile.shareToken,
        shareExpiresAt: profile.shareExpiresAt?.toISOString(),
        sharePinSet: Boolean(profile.sharePinHash),
        viewCount: profile.viewCount,
        lastViewedAt: profile.lastViewedAt?.toISOString(),
        completeness: calcCompleteness(profile),
        updatedAt: profile.updatedAt.toISOString(),
    };
}
async function ensureProfile(userId) {
    let profile = await prisma_1.prisma.emergencyProfile.findUnique({ where: { userId }, include: { contacts: true } });
    if (!profile)
        profile = await prisma_1.prisma.emergencyProfile.create({ data: { userId }, include: { contacts: true } });
    return profile;
}
async function getProfile(userId) {
    const profile = await ensureProfile(userId);
    return { ...serialize(profile), contacts: profile.contacts.sort((a, b) => a.priority - b.priority) };
}
async function updateProfile(userId, data) {
    await ensureProfile(userId);
    const profile = await prisma_1.prisma.emergencyProfile.update({
        where: { userId },
        data: {
            ...(data.dateOfBirth !== undefined && { dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null }),
            ...(data.bloodType !== undefined && { bloodType: data.bloodType }),
            ...(data.organDonor !== undefined && { organDonor: data.organDonor }),
            ...(data.pregnancyStatus !== undefined && { pregnancyStatus: data.pregnancyStatus }),
            ...(data.dnrStatus !== undefined && { dnrStatus: data.dnrStatus }),
            ...(data.height !== undefined && { height: data.height }),
            ...(data.weight !== undefined && { weight: data.weight }),
            ...(data.preferredHospital !== undefined && { preferredHospital: data.preferredHospital }),
            ...(data.physicianName !== undefined && { physicianName: data.physicianName }),
            ...(data.physicianPhone !== undefined && { physicianPhone: data.physicianPhone }),
            ...(data.insuranceProvider !== undefined && { insuranceProvider: data.insuranceProvider }),
            ...(data.insurancePhone !== undefined && { insurancePhone: data.insurancePhone }),
            ...(data.insurancePolicy !== undefined && { insurancePolicyCipher: data.insurancePolicy ? (0, crypto_2.encryptSecret)(data.insurancePolicy) : null }),
            ...(data.allergies !== undefined && { allergiesCipher: data.allergies ? (0, crypto_2.encryptSecret)(data.allergies) : null }),
            ...(data.conditions !== undefined && { conditionsCipher: data.conditions ? (0, crypto_2.encryptSecret)(data.conditions) : null }),
            ...(data.medications !== undefined && { medicationsCipher: data.medications ? (0, crypto_2.encryptSecret)(data.medications) : null }),
            ...(data.notes !== undefined && { notesCipher: data.notes ? (0, crypto_2.encryptSecret)(data.notes) : null }),
        },
        include: { contacts: true },
    });
    return { ...serialize(profile), contacts: profile.contacts.sort((a, b) => a.priority - b.priority) };
}
async function addContact(userId, data) {
    const profile = await ensureProfile(userId);
    const maxPriority = profile.contacts.reduce((max, c) => Math.max(max, c.priority), -1);
    return prisma_1.prisma.emergencyContact.create({ data: { profileId: profile.id, ...data, priority: maxPriority + 1 } });
}
async function updateContact(userId, id, data) {
    const profile = await ensureProfile(userId);
    const existing = await prisma_1.prisma.emergencyContact.findFirst({ where: { id, profileId: profile.id } });
    if (!existing)
        throw new errors_1.AppError("Contact not found", 404);
    return prisma_1.prisma.emergencyContact.update({ where: { id }, data });
}
async function deleteContact(userId, id) {
    const profile = await ensureProfile(userId);
    const existing = await prisma_1.prisma.emergencyContact.findFirst({ where: { id, profileId: profile.id } });
    if (!existing)
        throw new errors_1.AppError("Contact not found", 404);
    await prisma_1.prisma.emergencyContact.delete({ where: { id } });
}
async function reorderContacts(userId, orderedIds) {
    const profile = await ensureProfile(userId);
    await prisma_1.prisma.$transaction(orderedIds.map((id, index) => prisma_1.prisma.emergencyContact.updateMany({ where: { id, profileId: profile.id }, data: { priority: index } })));
}
async function enableShare(userId, expiresInDays) {
    await ensureProfile(userId);
    const token = crypto_1.default.randomBytes(20).toString("hex");
    const updated = await prisma_1.prisma.emergencyProfile.update({
        where: { userId },
        data: { shareToken: token, shareEnabled: true, shareExpiresAt: expiresInDays ? new Date(Date.now() + expiresInDays * 86400000) : null },
        include: { contacts: true },
    });
    return { ...serialize(updated), contacts: updated.contacts.sort((a, b) => a.priority - b.priority) };
}
async function disableShare(userId) {
    await ensureProfile(userId);
    const updated = await prisma_1.prisma.emergencyProfile.update({ where: { userId }, data: { shareEnabled: false }, include: { contacts: true } });
    return { ...serialize(updated), contacts: updated.contacts.sort((a, b) => a.priority - b.priority) };
}
async function setSharePin(userId, pin) {
    await ensureProfile(userId);
    const sharePinHash = pin ? await bcrypt_1.default.hash(pin, 10) : null;
    const updated = await prisma_1.prisma.emergencyProfile.update({ where: { userId }, data: { sharePinHash }, include: { contacts: true } });
    return { ...serialize(updated), contacts: updated.contacts.sort((a, b) => a.priority - b.priority) };
}
async function getAccessLog(userId) {
    const profile = await ensureProfile(userId);
    return prisma_1.prisma.emergencyAccessLog.findMany({ where: { profileId: profile.id }, orderBy: { accessedAt: "desc" }, take: 20 });
}
async function getPublicByToken(token, pin, meta) {
    const profile = await prisma_1.prisma.emergencyProfile.findUnique({ where: { shareToken: token }, include: { contacts: true, user: true } });
    if (!profile || !profile.shareEnabled)
        throw new errors_1.AppError("Emergency info not found", 404);
    if (profile.shareExpiresAt && profile.shareExpiresAt < new Date())
        throw new errors_1.AppError("This emergency link has expired", 410);
    if (profile.sharePinHash) {
        if (!pin)
            throw new errors_1.AppError("PIN required", 428);
        const valid = await bcrypt_1.default.compare(pin, profile.sharePinHash);
        if (!valid)
            throw new errors_1.AppError("Incorrect PIN", 401);
    }
    await prisma_1.prisma.$transaction([
        prisma_1.prisma.emergencyProfile.update({ where: { id: profile.id }, data: { viewCount: { increment: 1 }, lastViewedAt: new Date() } }),
        prisma_1.prisma.emergencyAccessLog.create({ data: { profileId: profile.id, ipAddress: meta.ip, userAgent: meta.userAgent } }),
    ]);
    const { shareToken: _t, sharePinSet: _p, ...rest } = serialize(profile);
    return {
        name: profile.user.name,
        ...rest,
        contacts: profile.contacts.sort((a, b) => a.priority - b.priority).map((c) => ({
            name: c.name, relationship: c.relationship, phone: c.phone, canMakeMedicalDecisions: c.canMakeMedicalDecisions,
        })),
    };
}
