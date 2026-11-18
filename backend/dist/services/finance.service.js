"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAccount = createAccount;
exports.updateAccount = updateAccount;
exports.deleteAccount = deleteAccount;
exports.getAccounts = getAccounts;
exports.createCategory = createCategory;
exports.deleteCategory = deleteCategory;
exports.getCategories = getCategories;
exports.createBudget = createBudget;
exports.createTransaction = createTransaction;
exports.updateTransaction = updateTransaction;
exports.deleteTransaction = deleteTransaction;
exports.createTransfer = createTransfer;
exports.getFinanceDashboard = getFinanceDashboard;
const prisma_1 = require("../config/prisma");
const errors_1 = require("../lib/errors");
const time_1 = require("../lib/time");
const DEFAULT_CATEGORIES = [
    ...["Food & groceries", "Transport", "Bills & utilities", "Airtime & data", "Rent", "Shopping", "Health", "Education", "Entertainment", "Family support", "Savings"].map((name) => ({ name, type: "EXPENSE" })),
    ...["Salary", "Business", "Gifts", "Other income"].map((name) => ({ name, type: "INCOME" })),
];
const effect = (type, amount) => (type === "INCOME" ? amount : type === "EXPENSE" ? -amount : 0);
const money = (value, currency) => {
    try {
        return new Intl.NumberFormat(currency === "NGN" ? "en-NG" : "en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(value);
    }
    catch {
        return `${currency} ${Math.round(value).toLocaleString()}`;
    }
};
const accountView = (a) => ({
    id: a.id,
    name: a.name,
    type: a.type,
    currency: a.currency,
    balance: Number(a.balance),
    isDefault: a.isDefault,
});
async function requireAccount(tx, userId, id) {
    const account = await tx.financeAccount.findFirst({ where: { id, userId } });
    if (!account)
        throw new errors_1.AppError("Account not found", 404);
    return account;
}
async function requireCategory(tx, userId, id) {
    const category = await tx.financeCategory.findFirst({ where: { id, userId } });
    if (!category)
        throw new errors_1.AppError("Category not found", 404);
    return category;
}
async function shiftBalance(tx, accountId, amount) {
    if (!accountId || amount === 0)
        return;
    await tx.financeAccount.update({ where: { id: accountId }, data: { balance: { increment: amount } } });
}
async function createAccount(userId, data) {
    const isDefault = (await prisma_1.prisma.financeAccount.count({ where: { userId } })) === 0;
    const account = await prisma_1.prisma.financeAccount.create({
        data: { userId, name: data.name, type: data.type, currency: data.currency, balance: data.initialBalance ?? 0, isDefault },
    });
    return accountView(account);
}
async function updateAccount(userId, id, data) {
    const existing = await prisma_1.prisma.financeAccount.findFirst({ where: { id, userId } });
    if (!existing)
        throw new errors_1.AppError("Account not found", 404);
    const account = await prisma_1.prisma.financeAccount.update({
        where: { id },
        data: {
            ...(data.name && { name: data.name }),
            ...(data.type && { type: data.type }),
            ...(data.currency && { currency: data.currency }),
            ...(data.balance !== undefined && { balance: data.balance }),
        },
    });
    return accountView(account);
}
async function deleteAccount(userId, id) {
    const existing = await prisma_1.prisma.financeAccount.findFirst({ where: { id, userId } });
    if (!existing)
        throw new errors_1.AppError("Account not found", 404);
    await prisma_1.prisma.$transaction([
        prisma_1.prisma.transaction.updateMany({ where: { userId, accountId: id }, data: { accountId: null } }),
        prisma_1.prisma.transaction.updateMany({ where: { userId, toAccountId: id }, data: { toAccountId: null } }),
        prisma_1.prisma.financeAccount.delete({ where: { id } }),
    ]);
}
async function getAccounts(userId) {
    const accounts = await prisma_1.prisma.financeAccount.findMany({ where: { userId }, orderBy: { createdAt: "asc" } });
    return accounts.map(accountView);
}
async function createCategory(userId, data) {
    return prisma_1.prisma.financeCategory.create({
        data: { userId, name: data.name, type: data.type, color: data.color, icon: data.icon },
    });
}
async function deleteCategory(userId, id) {
    const existing = await prisma_1.prisma.financeCategory.findFirst({ where: { id, userId } });
    if (!existing)
        throw new errors_1.AppError("Category not found", 404);
    await prisma_1.prisma.$transaction([
        prisma_1.prisma.transaction.updateMany({ where: { userId, categoryId: id }, data: { categoryId: null } }),
        prisma_1.prisma.budgetItem.deleteMany({ where: { categoryId: id } }),
        prisma_1.prisma.financeCategory.delete({ where: { id } }),
    ]);
}
async function getCategories(userId) {
    if ((await prisma_1.prisma.financeCategory.count({ where: { userId } })) === 0) {
        await prisma_1.prisma.$transaction(async (tx) => {
            await tx.$executeRaw `SELECT pg_advisory_xact_lock(hashtext(${`fincat:${userId}`}))`;
            if ((await tx.financeCategory.count({ where: { userId } })) === 0) {
                await tx.financeCategory.createMany({ data: DEFAULT_CATEGORIES.map((category) => ({ userId, ...category })) });
            }
        });
    }
    return prisma_1.prisma.financeCategory.findMany({ where: { userId }, orderBy: [{ type: "asc" }, { name: "asc" }] });
}
async function createBudget(userId, data) {
    const startDate = new Date(data.startDate);
    const endDate = new Date(data.endDate);
    const items = [...new Map(data.items.map((item) => [item.categoryId, item])).values()];
    const categoryIds = items.map((item) => item.categoryId);
    if (categoryIds.length > 0) {
        const found = await prisma_1.prisma.financeCategory.count({ where: { userId, id: { in: categoryIds } } });
        if (found !== categoryIds.length)
            throw new errors_1.AppError("Category not found", 404);
    }
    const totalLimit = data.totalLimit > 0 ? data.totalLimit : items.reduce((sum, item) => sum + item.limitAmount, 0);
    return prisma_1.prisma.$transaction(async (tx) => {
        const existing = await tx.financeBudget.findFirst({
            where: { userId, period: data.period, startDate: { lt: endDate }, endDate: { gt: startDate } },
        });
        const budget = existing
            ? await tx.financeBudget.update({
                where: { id: existing.id },
                data: { name: data.name, startDate, endDate, totalLimit },
            })
            : await tx.financeBudget.create({
                data: { userId, name: data.name, period: data.period, startDate, endDate, totalLimit },
            });
        await tx.budgetItem.deleteMany({ where: { budgetId: budget.id, categoryId: { notIn: categoryIds } } });
        for (const item of items) {
            await tx.budgetItem.upsert({
                where: { budgetId_categoryId: { budgetId: budget.id, categoryId: item.categoryId } },
                update: { limitAmount: item.limitAmount },
                create: { budgetId: budget.id, categoryId: item.categoryId, limitAmount: item.limitAmount },
            });
        }
        return tx.financeBudget.findUnique({ where: { id: budget.id }, include: { items: { include: { category: true } } } });
    });
}
async function createTransaction(userId, data) {
    return prisma_1.prisma.$transaction(async (tx) => {
        if (data.accountId)
            await requireAccount(tx, userId, data.accountId);
        if (data.categoryId)
            await requireCategory(tx, userId, data.categoryId);
        const created = await tx.transaction.create({
            data: {
                userId,
                accountId: data.accountId,
                categoryId: data.categoryId,
                type: data.type,
                amount: data.amount,
                description: data.description,
                date: data.date ? new Date(data.date) : new Date(),
                isRecurring: data.isRecurring ?? false,
                linkedTaskId: data.linkedTaskId,
                linkedNoteId: data.linkedNoteId,
            },
        });
        await shiftBalance(tx, data.accountId, effect(data.type, data.amount));
        return created;
    });
}
async function updateTransaction(userId, id, data) {
    return prisma_1.prisma.$transaction(async (tx) => {
        const existing = await tx.transaction.findFirst({ where: { id, userId } });
        if (!existing)
            throw new errors_1.AppError("Transaction not found", 404);
        if (existing.type === "TRANSFER")
            throw new errors_1.AppError("Transfers can't be edited. Delete it and create a new one.", 400);
        const accountId = data.accountId === undefined ? existing.accountId : data.accountId;
        const categoryId = data.categoryId === undefined ? existing.categoryId : data.categoryId;
        if (accountId && accountId !== existing.accountId)
            await requireAccount(tx, userId, accountId);
        if (categoryId && categoryId !== existing.categoryId)
            await requireCategory(tx, userId, categoryId);
        const type = (data.type ?? existing.type);
        const amount = data.amount ?? Number(existing.amount);
        await shiftBalance(tx, existing.accountId, -effect(existing.type, Number(existing.amount)));
        const updated = await tx.transaction.update({
            where: { id },
            data: {
                accountId,
                categoryId,
                type,
                amount,
                description: data.description ?? existing.description,
                date: data.date ? new Date(data.date) : existing.date,
                isRecurring: data.isRecurring ?? existing.isRecurring,
            },
        });
        await shiftBalance(tx, accountId, effect(type, amount));
        return updated;
    });
}
async function deleteTransaction(userId, id) {
    await prisma_1.prisma.$transaction(async (tx) => {
        const existing = await tx.transaction.findFirst({ where: { id, userId } });
        if (!existing)
            throw new errors_1.AppError("Transaction not found", 404);
        const amount = Number(existing.amount);
        if (existing.type === "TRANSFER") {
            await shiftBalance(tx, existing.accountId, amount);
            await shiftBalance(tx, existing.toAccountId, -amount);
        }
        else {
            await shiftBalance(tx, existing.accountId, -effect(existing.type, amount));
        }
        await tx.transaction.delete({ where: { id } });
    });
}
async function createTransfer(userId, data) {
    return prisma_1.prisma.$transaction(async (tx) => {
        const from = await requireAccount(tx, userId, data.fromAccountId);
        const to = await requireAccount(tx, userId, data.toAccountId);
        if (from.currency !== to.currency)
            throw new errors_1.AppError("Both accounts must use the same currency", 400);
        const created = await tx.transaction.create({
            data: {
                userId,
                accountId: from.id,
                toAccountId: to.id,
                type: "TRANSFER",
                amount: data.amount,
                description: data.note || `Transfer to ${to.name}`,
                date: data.date ? new Date(data.date) : new Date(),
            },
        });
        await shiftBalance(tx, from.id, -data.amount);
        await shiftBalance(tx, to.id, data.amount);
        return { id: created.id };
    });
}
function buildInsights(input) {
    const fmt = (value) => money(value, input.currency);
    if (input.count === 0)
        return [{ tone: "info", text: "No transactions this month yet. Add your first one to see insights." }];
    const out = [];
    const left = input.days - input.elapsed;
    if (input.budget > 0) {
        if (input.spent > input.budget) {
            out.push({ tone: "danger", text: `You're ${fmt(input.spent - input.budget)} over your ${fmt(input.budget)} budget.` });
        }
        else if (input.isCurrent && input.elapsed > 0) {
            const projected = (input.spent / input.elapsed) * input.days;
            out.push(projected > input.budget * 1.05
                ? { tone: "warning", text: `At this pace you'll spend about ${fmt(projected)}, above your ${fmt(input.budget)} budget.` }
                : { tone: "success", text: `You've used ${fmt(input.spent)} of ${fmt(input.budget)} with ${left} ${left === 1 ? "day" : "days"} left. You're on track.` });
        }
    }
    else if (input.spent > 0) {
        out.push({ tone: "info", text: "You haven't set a budget for this month. Set one to track your pace." });
    }
    const over = input.breakdown
        .filter((c) => c.budget > 0 && c.spent > c.budget)
        .sort((a, b) => b.spent - b.budget - (a.spent - a.budget))
        .slice(0, 2);
    if (over.length > 0)
        out.push({ tone: "warning", text: `Over budget in ${over.map((c) => c.category).join(" and ")}.` });
    const top = input.byCategory[0];
    if (top && input.spent > 0 && top.spent / input.spent >= 0.35) {
        out.push({ tone: "info", text: `${top.category} is ${Math.round((top.spent / input.spent) * 100)}% of your spending.` });
    }
    if (input.income > 0) {
        const rate = Math.round(((input.income - input.spent) / input.income) * 100);
        if (rate < 0)
            out.push({ tone: "danger", text: "You've spent more than you earned this month." });
        else if (rate >= 20)
            out.push({ tone: "success", text: `You're saving ${rate}% of your income.` });
    }
    if (!input.isCurrent && input.previousSpent > 0 && input.spent > 0) {
        const change = Math.round(((input.spent - input.previousSpent) / input.previousSpent) * 100);
        if (Math.abs(change) >= 15)
            out.push({ tone: "info", text: `Spending was ${Math.abs(change)}% ${change > 0 ? "higher" : "lower"} than the month before.` });
    }
    return out.slice(0, 4);
}
async function getFinanceDashboard(userId, month, year) {
    const user = await prisma_1.prisma.user.findUnique({ where: { id: userId }, select: { timezone: true, currency: true } });
    const currency = user?.currency || "NGN";
    const { zone, dateKey } = (0, time_1.dayBounds)(user?.timezone);
    const [nowYear, nowMonth, nowDay] = dateKey.split("-").map(Number);
    const y = year ?? nowYear;
    const m = month ?? nowMonth;
    if (m < 1 || m > 12)
        throw new errors_1.AppError("Invalid month", 400);
    const firstOf = (yy, mm) => `${yy}-${String(mm).padStart(2, "0")}-01`;
    const start = (0, time_1.startOfLocalDay)(firstOf(y, m), zone);
    const end = (0, time_1.startOfLocalDay)(m === 12 ? firstOf(y + 1, 1) : firstOf(y, m + 1), zone);
    const previousStart = (0, time_1.startOfLocalDay)(m === 1 ? firstOf(y - 1, 12) : firstOf(y, m - 1), zone);
    const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
    const isCurrent = y === nowYear && m === nowMonth;
    const isFuture = y > nowYear || (y === nowYear && m > nowMonth);
    const elapsed = isFuture ? 0 : isCurrent ? nowDay : days;
    const dayFormat = new Intl.DateTimeFormat("en-CA", { timeZone: zone, year: "numeric", month: "2-digit", day: "2-digit" });
    const [budget, transactions, accounts, previous] = await Promise.all([
        prisma_1.prisma.financeBudget.findFirst({
            where: { userId, startDate: { lt: end }, endDate: { gte: start } },
            orderBy: { updatedAt: "desc" },
            include: { items: { include: { category: true } } },
        }),
        prisma_1.prisma.transaction.findMany({
            where: { userId, date: { gte: start, lt: end } },
            orderBy: [{ date: "desc" }, { createdAt: "desc" }],
            include: { category: true },
        }),
        prisma_1.prisma.financeAccount.findMany({ where: { userId }, orderBy: { createdAt: "asc" } }),
        prisma_1.prisma.transaction.groupBy({
            by: ["type"],
            where: { userId, date: { gte: previousStart, lt: start }, type: { in: ["INCOME", "EXPENSE"] } },
            _sum: { amount: true },
        }),
    ]);
    const daily = Array.from({ length: days }, () => 0);
    const spentByCategory = new Map();
    let totalIncome = 0;
    let totalSpent = 0;
    for (const t of transactions) {
        const amount = Number(t.amount);
        if (t.type === "INCOME")
            totalIncome += amount;
        if (t.type !== "EXPENSE")
            continue;
        totalSpent += amount;
        const dayIndex = Number(dayFormat.format(t.date).slice(8)) - 1;
        if (dayIndex >= 0 && dayIndex < days)
            daily[dayIndex] += amount;
        const key = t.categoryId ?? "none";
        const row = spentByCategory.get(key) ?? { categoryId: t.categoryId, category: t.category?.name ?? "Uncategorized", color: t.category?.color ?? null, spent: 0 };
        row.spent += amount;
        spentByCategory.set(key, row);
    }
    const spendingByCategory = [...spentByCategory.values()].sort((a, b) => b.spent - a.spent);
    const categoryBreakdown = (budget?.items ?? []).map((item) => ({
        categoryId: item.categoryId,
        category: item.category?.name ?? "Uncategorized",
        budget: Number(item.limitAmount),
        spent: spentByCategory.get(item.categoryId)?.spent ?? 0,
    }));
    const monthlyBudget = budget ? Number(budget.totalLimit) : 0;
    const savings = totalIncome - totalSpent;
    const previousSpent = Number(previous.find((row) => row.type === "EXPENSE")?._sum.amount ?? 0);
    const previousIncome = Number(previous.find((row) => row.type === "INCOME")?._sum.amount ?? 0);
    const insights = buildInsights({
        currency,
        budget: monthlyBudget,
        spent: totalSpent,
        income: totalIncome,
        elapsed,
        days,
        isCurrent,
        breakdown: categoryBreakdown,
        byCategory: spendingByCategory,
        previousSpent,
        count: transactions.length,
    });
    return {
        summary: {
            month: m,
            year: y,
            daysInMonth: days,
            elapsedDays: elapsed,
            currency,
            budgetId: budget?.id ?? null,
            monthlyBudget,
            totalSpent,
            totalIncome,
            savings,
            budgetRemaining: monthlyBudget - totalSpent,
            savingsRate: totalIncome > 0 ? (savings / totalIncome) * 100 : 0,
            categoryBreakdown,
            spendingByCategory,
            daily,
            previous: { totalSpent: previousSpent, totalIncome: previousIncome },
            insights,
            insight: insights[0]?.text ?? "",
        },
        transactions: transactions.map((t) => ({
            id: t.id,
            type: t.type === "EXPENSE" ? "expense" : t.type === "INCOME" ? "income" : "transfer",
            amount: Number(t.amount),
            category: t.category?.name ?? (t.type === "TRANSFER" ? "Transfer" : "Uncategorized"),
            categoryId: t.categoryId,
            accountId: t.accountId,
            toAccountId: t.toAccountId,
            description: t.description,
            date: dayFormat.format(t.date),
        })),
        accounts: accounts.map(accountView),
    };
}
