import crypto from "crypto";
import bcrypt from "bcrypt";
import { prisma } from "../config/prisma";
import { AppError } from "../lib/errors";
import { encryptSecret, decryptSecret } from "../lib/crypto";

function calcCompleteness(profile: any) {
  const fields = [
    profile.bloodType, profile.dateOfBirth, profile.height, profile.weight,
    profile.physicianName, profile.physicianPhone, profile.insuranceProvider,
    profile.allergiesCipher, profile.conditionsCipher, profile.medicationsCipher,
  ];
  return Math.round((fields.filter(Boolean).length / fields.length) * 100);
}

function serialize(profile: any) {
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
    allergies: profile.allergiesCipher ? decryptSecret(profile.allergiesCipher) : undefined,
    conditions: profile.conditionsCipher ? decryptSecret(profile.conditionsCipher) : undefined,
    medications: profile.medicationsCipher ? decryptSecret(profile.medicationsCipher) : undefined,
    insurancePolicy: profile.insurancePolicyCipher ? decryptSecret(profile.insurancePolicyCipher) : undefined,
    notes: profile.notesCipher ? decryptSecret(profile.notesCipher) : undefined,
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

async function ensureProfile(userId: string) {
  let profile = await prisma.emergencyProfile.findUnique({ where: { userId }, include: { contacts: true } });
  if (!profile) profile = await prisma.emergencyProfile.create({ data: { userId }, include: { contacts: true } });
  return profile;
}

export async function getProfile(userId: string) {
  const profile = await ensureProfile(userId);
  return { ...serialize(profile), contacts: profile.contacts.sort((a, b) => a.priority - b.priority) };
}

export async function updateProfile(userId: string, data: {
  dateOfBirth?: string; bloodType?: string; organDonor?: boolean; pregnancyStatus?: boolean; dnrStatus?: boolean;
  height?: string; weight?: string; preferredHospital?: string;
  physicianName?: string; physicianPhone?: string;
  insuranceProvider?: string; insurancePhone?: string; insurancePolicy?: string;
  allergies?: string; conditions?: string; medications?: string; notes?: string;
}) {
  await ensureProfile(userId);
  const profile = await prisma.emergencyProfile.update({
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
      ...(data.insurancePolicy !== undefined && { insurancePolicyCipher: data.insurancePolicy ? encryptSecret(data.insurancePolicy) : null }),
      ...(data.allergies !== undefined && { allergiesCipher: data.allergies ? encryptSecret(data.allergies) : null }),
      ...(data.conditions !== undefined && { conditionsCipher: data.conditions ? encryptSecret(data.conditions) : null }),
      ...(data.medications !== undefined && { medicationsCipher: data.medications ? encryptSecret(data.medications) : null }),
      ...(data.notes !== undefined && { notesCipher: data.notes ? encryptSecret(data.notes) : null }),
    },
    include: { contacts: true },
  });
  return { ...serialize(profile), contacts: profile.contacts.sort((a, b) => a.priority - b.priority) };
}

export async function addContact(userId: string, data: {
  name: string; relationship?: string; phone: string; email?: string; canMakeMedicalDecisions?: boolean;
}) {
  const profile = await ensureProfile(userId);
  const maxPriority = profile.contacts.reduce((max, c) => Math.max(max, c.priority), -1);
  return prisma.emergencyContact.create({ data: { profileId: profile.id, ...data, priority: maxPriority + 1 } });
}

export async function updateContact(userId: string, id: string, data: any) {
  const profile = await ensureProfile(userId);
  const existing = await prisma.emergencyContact.findFirst({ where: { id, profileId: profile.id } });
  if (!existing) throw new AppError("Contact not found", 404);
  return prisma.emergencyContact.update({ where: { id }, data });
}

export async function deleteContact(userId: string, id: string) {
  const profile = await ensureProfile(userId);
  const existing = await prisma.emergencyContact.findFirst({ where: { id, profileId: profile.id } });
  if (!existing) throw new AppError("Contact not found", 404);
  await prisma.emergencyContact.delete({ where: { id } });
}

export async function reorderContacts(userId: string, orderedIds: string[]) {
  const profile = await ensureProfile(userId);
  await prisma.$transaction(
    orderedIds.map((id, index) =>
      prisma.emergencyContact.updateMany({ where: { id, profileId: profile.id }, data: { priority: index } })
    )
  );
}

export async function enableShare(userId: string, expiresInDays?: number) {
  await ensureProfile(userId);
  const token = crypto.randomBytes(20).toString("hex");
  const updated = await prisma.emergencyProfile.update({
    where: { userId },
    data: { shareToken: token, shareEnabled: true, shareExpiresAt: expiresInDays ? new Date(Date.now() + expiresInDays * 86400000) : null },
    include: { contacts: true },
  });
  return { ...serialize(updated), contacts: updated.contacts.sort((a, b) => a.priority - b.priority) };
}

export async function disableShare(userId: string) {
  await ensureProfile(userId);
  const updated = await prisma.emergencyProfile.update({ where: { userId }, data: { shareEnabled: false }, include: { contacts: true } });
  return { ...serialize(updated), contacts: updated.contacts.sort((a, b) => a.priority - b.priority) };
}

export async function setSharePin(userId: string, pin: string | null) {
  await ensureProfile(userId);
  const sharePinHash = pin ? await bcrypt.hash(pin, 10) : null;
  const updated = await prisma.emergencyProfile.update({ where: { userId }, data: { sharePinHash }, include: { contacts: true } });
  return { ...serialize(updated), contacts: updated.contacts.sort((a, b) => a.priority - b.priority) };
}

export async function getAccessLog(userId: string) {
  const profile = await ensureProfile(userId);
  return prisma.emergencyAccessLog.findMany({ where: { profileId: profile.id }, orderBy: { accessedAt: "desc" }, take: 20 });
}

export async function getPublicByToken(token: string, pin: string | undefined, meta: { ip?: string; userAgent?: string }) {
  const profile = await prisma.emergencyProfile.findUnique({ where: { shareToken: token }, include: { contacts: true, user: true } });
  if (!profile || !profile.shareEnabled) throw new AppError("Emergency info not found", 404);
  if (profile.shareExpiresAt && profile.shareExpiresAt < new Date()) throw new AppError("This emergency link has expired", 410);

  if (profile.sharePinHash) {
    if (!pin) throw new AppError("PIN required", 428);
    const valid = await bcrypt.compare(pin, profile.sharePinHash);
    if (!valid) throw new AppError("Incorrect PIN", 401);
  }

  await prisma.$transaction([
    prisma.emergencyProfile.update({ where: { id: profile.id }, data: { viewCount: { increment: 1 }, lastViewedAt: new Date() } }),
    prisma.emergencyAccessLog.create({ data: { profileId: profile.id, ipAddress: meta.ip, userAgent: meta.userAgent } }),
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