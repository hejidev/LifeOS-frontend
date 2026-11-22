"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.listStaff = listStaff;
exports.createStaff = createStaff;
exports.updateStaff = updateStaff;
exports.deleteStaff = deleteStaff;
exports.clockIn = clockIn;
exports.logActivity = logActivity;
exports.getStaffActivity = getStaffActivity;
exports.getStaffPerformance = getStaffPerformance;
const bcrypt_1 = __importDefault(require("bcrypt"));
const prisma_1 = require("../config/prisma");
const plan_1 = require("../config/plan");
const errors_1 = require("../lib/errors");
const time_1 = require("../lib/time");
const user_clock_1 = require("../lib/user-clock");
const notification_service_1 = require("./notification.service");
const email_service_1 = require("./email.service");
const num = (d) => (d == null ? 0 : Number(d));
async function rangeStart(userId, range) {
    const clock = await (0, user_clock_1.getUserClock)(userId);
    const { zone, dateKey } = (0, time_1.dayBounds)(clock.zone);
    if (range === "today")
        return (0, time_1.startOfLocalDay)(dateKey, zone);
    if (range === "week") {
        const weekday = ((0, time_1.dayNumber)(dateKey) + 4) % 7;
        const back = (weekday - clock.weekStartsOn + 7) % 7;
        return (0, time_1.startOfLocalDay)((0, time_1.shiftDateKey)(dateKey, -back), zone);
    }
    return (0, time_1.startOfLocalDay)(`${dateKey.slice(0, 8)}01`, zone);
}
async function getBizProfile(userId) {
    const profile = await prisma_1.prisma.bizProfile.findUnique({ where: { userId } });
    if (!profile)
        throw new errors_1.AppError("Merchant profile not found", 404);
    return profile;
}
const getBizProfileId = async (userId) => (await getBizProfile(userId)).id;
function serializeStaff(staff) {
    const { pinHash, ...rest } = staff;
    return rest;
}
function seatLimit(tier) {
    return tier in plan_1.MERCHANT_PLANS ? plan_1.MERCHANT_PLANS[tier].staffLimit : 1;
}
async function assertSeatAvailable(profile) {
    const limit = seatLimit(profile.planTier);
    const active = await prisma_1.prisma.bizStaff.count({ where: { bizProfileId: profile.id, status: "ACTIVE" } });
    if (active >= limit) {
        throw new errors_1.AppError(`Your plan includes ${limit} staff ${limit === 1 ? "seat" : "seats"} and ${limit === 1 ? "it is" : "all are"} in use. Upgrade your plan to add more.`, 403);
    }
}
async function assertStore(bizProfileId, storeId) {
    const store = await prisma_1.prisma.store.findFirst({ where: { id: storeId, bizProfileId, active: true }, select: { id: true } });
    if (!store)
        throw new errors_1.AppError("Location not found or inactive", 404);
}
async function listStaff(userId) {
    const bizProfileId = await getBizProfileId(userId);
    const staff = await prisma_1.prisma.bizStaff.findMany({
        where: { bizProfileId },
        include: { store: { select: { id: true, name: true } } },
        orderBy: { createdAt: "asc" },
    });
    return staff.map(serializeStaff);
}
async function createStaff(userId, data) {
    const profile = await getBizProfile(userId);
    await assertSeatAvailable(profile);
    let storeId = data.storeId;
    if (storeId) {
        await assertStore(profile.id, storeId);
    }
    else {
        const defaultStore = await prisma_1.prisma.store.findFirst({ where: { bizProfileId: profile.id, isDefault: true } });
        storeId = defaultStore?.id;
    }
    const pinHash = await bcrypt_1.default.hash(data.pin, 10);
    const staff = await prisma_1.prisma.bizStaff.create({
        data: {
            bizProfileId: profile.id,
            storeId,
            name: data.name,
            email: data.email,
            phone: data.phone,
            address: data.address,
            age: data.age,
            sex: data.sex,
            tribe: data.tribe,
            religion: data.religion,
            role: data.role,
            pinHash,
        },
    });
    const owner = await prisma_1.prisma.user.findUnique({ where: { id: userId }, select: { email: true, name: true } });
    if (owner)
        await (0, email_service_1.sendStaffAddedEmail)(owner.email, owner.name ?? "there", staff.name, profile.businessName);
    return serializeStaff(staff);
}
async function updateStaff(userId, staffId, data) {
    const profile = await getBizProfile(userId);
    const existing = await prisma_1.prisma.bizStaff.findFirst({ where: { id: staffId, bizProfileId: profile.id } });
    if (!existing)
        throw new errors_1.AppError("Staff member not found", 404);
    if (data.status === "ACTIVE" && existing.status !== "ACTIVE")
        await assertSeatAvailable(profile);
    if (data.storeId)
        await assertStore(profile.id, data.storeId);
    const pinHash = data.pin ? await bcrypt_1.default.hash(data.pin, 10) : undefined;
    const staff = await prisma_1.prisma.bizStaff.update({
        where: { id: staffId },
        data: {
            ...(data.name && { name: data.name }),
            ...(data.email !== undefined && { email: data.email }),
            ...(data.phone !== undefined && { phone: data.phone }),
            ...(data.address !== undefined && { address: data.address }),
            ...(data.age !== undefined && { age: data.age }),
            ...(data.sex !== undefined && { sex: data.sex }),
            ...(data.tribe !== undefined && { tribe: data.tribe }),
            ...(data.religion !== undefined && { religion: data.religion }),
            ...(data.role && { role: data.role }),
            ...(data.status && { status: data.status }),
            ...(data.storeId !== undefined && { storeId: data.storeId }),
            ...(pinHash && { pinHash }),
        },
    });
    return serializeStaff(staff);
}
async function deleteStaff(userId, staffId) {
    const bizProfileId = await getBizProfileId(userId);
    const existing = await prisma_1.prisma.bizStaff.findFirst({ where: { id: staffId, bizProfileId } });
    if (!existing)
        throw new errors_1.AppError("Staff member not found", 404);
    const [sales, activity] = await Promise.all([
        prisma_1.prisma.bizSale.count({ where: { userId, staffId } }),
        prisma_1.prisma.bizStaffActivity.count({ where: { staffId, action: { in: ["SALE_CREATED", "REFUND_ISSUED"] } } }),
    ]);
    if (sales > 0 || activity > 0) {
        throw new errors_1.AppError(`${existing.name} has sales history. Suspend them instead so your records stay intact.`, 409);
    }
    await prisma_1.prisma.bizStaff.delete({ where: { id: staffId } });
}
async function clockIn(userId, staffId, pin) {
    const bizProfileId = await getBizProfileId(userId);
    const staff = await prisma_1.prisma.bizStaff.findFirst({ where: { id: staffId, bizProfileId } });
    if (!staff)
        throw new errors_1.AppError("Staff member not found", 404);
    if (staff.status === "SUSPENDED")
        throw new errors_1.AppError("This staff account is suspended", 403);
    const valid = await bcrypt_1.default.compare(pin, staff.pinHash);
    if (!valid)
        throw new errors_1.AppError("Incorrect PIN", 401);
    const now = new Date();
    await prisma_1.prisma.bizStaff.update({ where: { id: staffId }, data: { lastActiveAt: now } });
    await prisma_1.prisma.bizStaffActivity.create({
        data: { staffId, bizProfileId, action: "LOGIN", description: `${staff.name} clocked in` },
    });
    await (0, notification_service_1.createNotification)(userId, {
        type: "STAFF",
        title: "Staff clocked in",
        message: `${staff.name} clocked in at ${now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`,
        actionUrl: "/merchant/staff/activity",
    });
    return serializeStaff(staff);
}
async function logActivity(userId, staffId, data) {
    const bizProfileId = await getBizProfileId(userId);
    const staff = await prisma_1.prisma.bizStaff.findFirst({ where: { id: staffId, bizProfileId } });
    if (!staff)
        throw new errors_1.AppError("Staff member not found", 404);
    await prisma_1.prisma.bizStaff.update({ where: { id: staffId }, data: { lastActiveAt: new Date() } });
    return prisma_1.prisma.bizStaffActivity.create({
        data: { staffId, bizProfileId, action: data.action, description: data.description, metadata: data.metadata },
    });
}
async function getStaffActivity(userId, staffId) {
    const bizProfileId = await getBizProfileId(userId);
    return prisma_1.prisma.bizStaffActivity.findMany({
        where: { bizProfileId, ...(staffId && { staffId }) },
        include: { staff: { select: { name: true, role: true } } },
        orderBy: { createdAt: "desc" },
        take: 100,
    });
}
async function getStaffPerformance(userId, range = "month") {
    const bizProfileId = await getBizProfileId(userId);
    const start = await rangeStart(userId, range);
    const [staffList, tagged, legacyActivity, otherActivity] = await Promise.all([
        prisma_1.prisma.bizStaff.findMany({ where: { bizProfileId } }),
        prisma_1.prisma.bizSale.groupBy({
            by: ["staffId"],
            where: { userId, status: "PAID", staffId: { not: null }, createdAt: { gte: start } },
            _count: { _all: true },
            _sum: { total: true },
        }),
        prisma_1.prisma.bizStaffActivity.findMany({
            where: { bizProfileId, action: "SALE_CREATED", createdAt: { gte: start } },
            select: { staffId: true, description: true },
        }),
        prisma_1.prisma.bizStaffActivity.groupBy({
            by: ["staffId", "action"],
            where: { bizProfileId, createdAt: { gte: start }, action: { in: ["CUSTOMER_ADDED", "REFUND_ISSUED"] } },
            _count: { _all: true },
        }),
    ]);
    const perStaff = new Map();
    const credit = (id, count, revenue) => {
        const current = perStaff.get(id) ?? { salesCount: 0, revenue: 0 };
        current.salesCount += count;
        current.revenue += revenue;
        perStaff.set(id, current);
    };
    for (const row of tagged)
        if (row.staffId)
            credit(row.staffId, row._count._all, num(row._sum.total));
    const receiptToStaff = new Map();
    for (const entry of legacyActivity) {
        const match = entry.description.match(/Rang up sale (\S+)/);
        if (match)
            receiptToStaff.set(match[1], entry.staffId);
    }
    if (receiptToStaff.size > 0) {
        const legacySales = await prisma_1.prisma.bizSale.findMany({
            where: { userId, staffId: null, status: "PAID", receiptNumber: { in: [...receiptToStaff.keys()] } },
            select: { receiptNumber: true, total: true },
        });
        for (const sale of legacySales) {
            const owner = receiptToStaff.get(sale.receiptNumber);
            if (owner)
                credit(owner, 1, num(sale.total));
        }
    }
    const extras = new Map();
    for (const row of otherActivity) {
        const current = extras.get(row.staffId) ?? { customersAdded: 0, refundsIssued: 0 };
        if (row.action === "CUSTOMER_ADDED")
            current.customersAdded = row._count._all;
        if (row.action === "REFUND_ISSUED")
            current.refundsIssued = row._count._all;
        extras.set(row.staffId, current);
    }
    return staffList
        .map((s) => {
        const perf = perStaff.get(s.id) ?? { salesCount: 0, revenue: 0 };
        const extra = extras.get(s.id) ?? { customersAdded: 0, refundsIssued: 0 };
        return {
            id: s.id,
            name: s.name,
            role: s.role,
            status: s.status,
            lastActiveAt: s.lastActiveAt?.toISOString(),
            salesCount: perf.salesCount,
            revenue: perf.revenue,
            avgSaleValue: perf.salesCount > 0 ? Math.round(perf.revenue / perf.salesCount) : 0,
            customersAdded: extra.customersAdded,
            refundsIssued: extra.refundsIssued,
        };
    })
        .sort((a, b) => b.revenue - a.revenue);
}
