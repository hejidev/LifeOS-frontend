import { prisma } from "../config/prisma";
import { AppError } from "../lib/errors";
import { logAdminAction } from "./audit.service";
import * as merchantService from "./merchant.service";

const num = (value: unknown) => (value == null ? 0 : Number(value));
const DAY = 86_400_000;

export type MerchantAction = "FORCE_STAFF_LOGOUT" | "REGENERATE_STORE_CODE" | "PAUSE_STORE" | "RESUME_STORE";

const ACTIONS = {
  FORCE_STAFF_LOGOUT: { audit: "MERCHANT_STAFF_SIGNED_OUT", label: "Signed out all staff" },
  REGENERATE_STORE_CODE: { audit: "MERCHANT_STORE_CODE_REGENERATED", label: "Regenerated the staff sign-in code" },
  PAUSE_STORE: { audit: "MERCHANT_STORE_PAUSED", label: "Paused the store" },
  RESUME_STORE: { audit: "MERCHANT_STORE_RESUMED", label: "Resumed the store" },
} as const;

interface Check {
  label: string;
  ok: boolean;
  detail: string;
}

function merchantChecks(profile: any): Check[] {
  const checks: Check[] = [];
  const status = String(profile.status);
  const messages: Record<string, string> = {
    PENDING: "The merchant application is under review. They only see the personal dashboard.",
    REJECTED: `The application was rejected${profile.rejectionReason ? `: ${profile.rejectionReason}` : "."}`,
    SUSPENDED: `The merchant account is suspended${profile.rejectionReason ? `: ${profile.rejectionReason}` : "."}`,
    APPROVED: "Approved as a merchant.",
  };
  checks.push({ label: "Merchant application approved", ok: status === "APPROVED", detail: messages[status] ?? `Status is ${status}.` });
  if (status === "APPROVED") {
    const active = profile.planStatus === "ACTIVE";
    const tier = profile.planTier && String(profile.planTier) !== "NONE" ? String(profile.planTier) : "No";
    const until = profile.currentPeriodEnd ? ` Current period ends ${profile.currentPeriodEnd.toISOString().slice(0, 10)}.` : "";
    checks.push({
      label: "Plan is active",
      ok: active,
      detail: active ? `${tier} plan is active.${until}` : `Plan status is ${String(profile.planStatus).toLowerCase()}. They land on the personal dashboard or a billing prompt.`,
    });
    checks.push({
      label: "Store is open",
      ok: !profile.paused,
      detail: profile.paused ? "The store is paused. The dashboard and all staff access are switched off." : "Not paused.",
    });
  }
  return checks;
}

function diagnose(user: any, profile: any) {
  const role = String(user.role);
  const checks: Check[] = [
    { label: "Account is active", ok: !!user.isActive, detail: user.isActive ? "They can sign in." : "The account is suspended or deactivated, so sign-in is blocked." },
    { label: "Email verified", ok: !!user.emailVerified, detail: user.emailVerified ? "Verified." : "Not verified yet." },
  ];
  let landing = { label: "Personal dashboard", path: "/app/dashboard" };
  if (role === "SUPER_ADMIN") landing = { label: "Super admin dashboard", path: "/super-admin" };
  else if (role === "ADMIN") landing = { label: "Admin dashboard", path: "/admin" };
  else if (profile) {
    checks.push(...merchantChecks(profile));
    if (profile.status === "APPROVED" && profile.planStatus === "ACTIVE") landing = { label: "Merchant dashboard", path: "/merchant/dashboard" };
  }
  return { landing, checks };
}

export async function search(query: string) {
  const term = query.trim();
  if (term.length < 2) return [];
  const profiles = await prisma.bizProfile.findMany({
    where: {
      OR: [
        { businessName: { contains: term, mode: "insensitive" } },
        { contactEmail: { contains: term, mode: "insensitive" } },
        { contactPhone: { contains: term } },
      ],
    },
    select: { userId: true },
    take: 25,
  });
  const users = await prisma.user.findMany({
    where: {
      OR: [
        { name: { contains: term, mode: "insensitive" } },
        { email: { contains: term, mode: "insensitive" } },
        { id: term },
        { id: { in: profiles.map((profile) => profile.userId) } },
      ],
    },
    orderBy: { createdAt: "desc" },
    take: 25,
    select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
  });
  const merchants = await prisma.bizProfile.findMany({
    where: { userId: { in: users.map((user) => user.id) } },
    select: { userId: true, businessName: true, status: true, planTier: true, planStatus: true, paused: true },
  });
  const byUser = new Map(merchants.map((merchant) => [merchant.userId, merchant]));
  return users.map((user) => {
    const merchant = byUser.get(user.id);
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: String(user.role),
      isActive: user.isActive,
      createdAt: user.createdAt.toISOString(),
      merchant: merchant
        ? {
            businessName: merchant.businessName,
            status: String(merchant.status),
            planTier: String(merchant.planTier) === "NONE" ? null : String(merchant.planTier),
            planStatus: String(merchant.planStatus),
            paused: merchant.paused,
          }
        : null,
    };
  });
}

export async function queues() {
  const pick = { userId: true, businessName: true, appliedAt: true, planTier: true, rejectionReason: true } as const;
  const [pending, pastDue, suspended, paused] = await Promise.all([
    prisma.bizProfile.findMany({ where: { status: "PENDING" }, orderBy: { appliedAt: "asc" }, take: 20, select: pick }),
    prisma.bizProfile.findMany({ where: { status: "APPROVED", planStatus: "PAST_DUE" }, take: 20, select: pick }),
    prisma.bizProfile.findMany({ where: { status: "SUSPENDED" }, take: 20, select: pick }),
    prisma.bizProfile.findMany({ where: { status: "APPROVED", paused: true }, take: 20, select: pick }),
  ]);
  const row = (detail: (item: (typeof pending)[number]) => string) => (item: (typeof pending)[number]) => ({
    userId: item.userId,
    businessName: item.businessName,
    detail: detail(item),
  });
  return {
    pending: pending.map(row((item) => `Applied ${item.appliedAt.toISOString().slice(0, 10)}`)),
    pastDue: pastDue.map(row((item) => `${String(item.planTier)} payment failed`)),
    suspended: suspended.map(row((item) => item.rejectionReason ?? "Suspended")),
    paused: paused.map(row(() => "Store paused")),
  };
}

export async function getAccount(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError("Account not found", 404);
  const profile = await prisma.bizProfile.findUnique({ where: { userId } });
  const { landing, checks } = diagnose(user, profile);

  const targetIds = [userId, ...(profile ? [profile.id] : [])];
  const staffRoles: ("ADMIN" | "SUPER_ADMIN")[] = ["ADMIN", "SUPER_ADMIN"];
  const [notes, attempts, failures24h, audit, conversations] = await Promise.all([
    prisma.supportNote.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 50 }),
    prisma.loginAttempt.findMany({ where: { email: user.email }, orderBy: { createdAt: "desc" }, take: 15 }),
    prisma.loginAttempt.count({ where: { email: user.email, success: false, createdAt: { gte: new Date(Date.now() - DAY) } } }),
    prisma.adminAuditLog.findMany({
      where: { targetId: { in: targetIds } },
      orderBy: { createdAt: "desc" },
      take: 15,
      include: { admin: { select: { name: true } } },
    }),
    prisma.conversation.findMany({
      where: {
        OR: [
          { participantAId: userId, participantB: { role: { in: staffRoles } } },
          { participantBId: userId, participantA: { role: { in: staffRoles } } },
        ],
      },
      orderBy: { lastMessageAt: "desc" },
      take: 5,
      include: {
        participantA: { select: { name: true } },
        participantB: { select: { name: true } },
        messages: { orderBy: { createdAt: "desc" }, take: 8 },
      },
    }),
  ]);

  let merchant = null;
  if (profile) {
    const since = new Date(Date.now() - 30 * DAY);
    const [products, customers, staffRows, stores, recent, unpaid, needsReview, lastSale, openRegisters] = await Promise.all([
      prisma.bizProduct.count({ where: { userId, active: true } }),
      prisma.bizCustomer.count({ where: { userId } }),
      prisma.bizStaff.groupBy({ by: ["status"], where: { bizProfileId: profile.id }, _count: true }),
      prisma.store.count({ where: { bizProfileId: profile.id, active: true } }),
      prisma.bizSale.aggregate({ where: { userId, status: "PAID", createdAt: { gte: since } }, _count: true, _sum: { total: true } }),
      prisma.bizSale.aggregate({ where: { userId, status: "PENDING" }, _count: true, _sum: { total: true, amountPaid: true } }),
      prisma.bizSale.count({ where: { userId, needsReview: true } }),
      prisma.bizSale.findFirst({ where: { userId }, orderBy: { createdAt: "desc" }, select: { createdAt: true } }),
      prisma.cashSession.count({ where: { bizProfileId: profile.id, closedAt: null } }),
    ]);
    const staffActive = staffRows.find((row) => row.status === "ACTIVE")?._count ?? 0;

    if (profile.status === "APPROVED") {
      const blockers = [
        profile.paused ? "the store is paused" : null,
        !profile.staffLoginCode ? "no staff sign-in code has been created" : null,
        staffActive === 0 ? "there are no active staff" : null,
      ].filter(Boolean);
      checks.push({
        label: "Staff can sign in",
        ok: blockers.length === 0,
        detail: blockers.length === 0 ? `${staffActive} active staff can use the terminal with code ${profile.staffLoginCode}.` : `Staff can't sign in because ${blockers.join(" and ")}.`,
      });
    }

    merchant = {
      profileId: profile.id,
      businessName: profile.businessName,
      status: String(profile.status),
      planTier: String(profile.planTier) === "NONE" ? null : String(profile.planTier),
      planStatus: String(profile.planStatus),
      paused: profile.paused,
      currency: profile.currency,
      currentPeriodEnd: profile.currentPeriodEnd?.toISOString() ?? null,
      storeCode: profile.staffLoginCode ?? null,
      appliedAt: profile.appliedAt.toISOString(),
      stats: {
        products,
        customers,
        stores,
        staffActive,
        staffSuspended: staffRows.find((row) => row.status === "SUSPENDED")?._count ?? 0,
        sales30d: recent._count,
        revenue30d: num(recent._sum.total),
        owedCount: unpaid._count,
        owedTotal: Math.round((num(unpaid._sum.total) - num(unpaid._sum.amountPaid)) * 100) / 100,
        needsReview,
        openRegisters,
        lastSaleAt: lastSale?.createdAt.toISOString() ?? null,
      },
    };
  }

  return {
    identity: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: String(user.role),
      isActive: user.isActive,
      emailVerified: user.emailVerified,
      provider: String(user.provider),
      twoFactor: user.twoFactorEnabled,
      createdAt: user.createdAt.toISOString(),
    },
    landing,
    checks,
    merchant,
    notes: notes.map((note) => ({ id: note.id, body: note.body, authorName: note.authorName, createdAt: note.createdAt.toISOString() })),
    signIns: {
      failures24h,
      recent: attempts.map((attempt) => ({
        id: attempt.id,
        success: attempt.success,
        ipAddress: attempt.ipAddress,
        userAgent: attempt.userAgent ? attempt.userAgent.slice(0, 90) : null,
        createdAt: attempt.createdAt.toISOString(),
      })),
    },
    audit: audit.map((row) => ({
      id: row.id,
      action: String(row.action),
      description: row.description,
      adminName: row.admin.name,
      createdAt: row.createdAt.toISOString(),
    })),
    conversations: conversations.map((conversation) => {
      const other = conversation.participantAId === userId ? conversation.participantB : conversation.participantA;
      return {
        id: conversation.id,
        with: other.name,
        lastMessageAt: conversation.lastMessageAt.toISOString(),
        messages: [...conversation.messages].reverse().map((message) => ({
          id: message.id,
          fromUser: message.senderId === userId,
          body: message.body,
          createdAt: message.createdAt.toISOString(),
        })),
      };
    }),
  };
}

export async function addNote(admin: { id: string; name: string }, userId: string, body: string) {
  const exists = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
  if (!exists) throw new AppError("Account not found", 404);
  const note = await prisma.supportNote.create({ data: { userId, authorId: admin.id, authorName: admin.name, body } });
  return { id: note.id, body: note.body, authorName: note.authorName, createdAt: note.createdAt.toISOString() };
}

export async function deleteNote(id: string) {
  await prisma.supportNote.deleteMany({ where: { id } });
}

export async function merchantAction(admin: { id: string; name: string }, userId: string, action: MerchantAction, reason: string) {
  const profile = await prisma.bizProfile.findUnique({ where: { userId } });
  if (!profile) throw new AppError("This account has no merchant profile.", 404);
  const spec = ACTIONS[action];
  if (!spec) throw new AppError("Unknown action", 400);

  let result: Record<string, unknown> = {};
  if (action === "FORCE_STAFF_LOGOUT") await merchantService.forceStaffLogout(userId);
  else if (action === "REGENERATE_STORE_CODE") result = { storeCode: (await merchantService.regenerateStoreCode(userId)).staffLoginCode };
  else if (action === "PAUSE_STORE") await merchantService.setPaused(userId, true);
  else await merchantService.setPaused(userId, false);

  await logAdminAction(admin.id, spec.audit, "BizProfile", profile.id, `${spec.label} for ${profile.businessName}. Reason: ${reason}`);
  await prisma.supportNote.create({ data: { userId, authorId: admin.id, authorName: admin.name, body: `${spec.label}. Reason: ${reason}` } });
  return result;
}