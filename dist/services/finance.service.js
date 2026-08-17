"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAccount = createAccount;
exports.updateAccount = updateAccount;
exports.getAccounts = getAccounts;
exports.createCategory = createCategory;
exports.getCategories = getCategories;
exports.createBudget = createBudget;
exports.createTransaction = createTransaction;
exports.updateTransaction = updateTransaction;
exports.deleteTransaction = deleteTransaction;
exports.getFinanceDashboard = getFinanceDashboard;
const prisma_1 = require("../config/prisma");
const errors_1 = require("../lib/errors");
async function createAccount(userId, data) {
    const account = await prisma_1.prisma.financeAccount.create({
        data: {
            userId,
            name: data.name,
            type: data.type,
            currency: data.currency,
            balance: data.initialBalance ?? 0,
            isDefault: false,
        },
    });
    return account;
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
        },
    });
    return account;
}
async function getAccounts(userId) {
    return prisma_1.prisma.financeAccount.findMany({
        where: { userId },
        orderBy: { createdAt: "asc" },
    });
}
async function createCategory(userId, data) {
    const category = await prisma_1.prisma.financeCategory.create({
        data: {
            userId,
            name: data.name,
            type: data.type,
            color: data.color,
            icon: data.icon,
        },
    });
    return category;
}
async function getCategories(userId) {
    return prisma_1.prisma.financeCategory.findMany({
        where: { userId },
        orderBy: { name: "asc" },
    });
}
async function createBudget(userId, data) {
    const startDate = new Date(data.startDate);
    const endDate = new Date(data.endDate);
    // If a budget already overlaps this period, treat this as updating
    // that budget rather than creating a duplicate the dashboard will
    // never look at again.
    const existing = await prisma_1.prisma.financeBudget.findFirst({
        where: {
            userId,
            startDate: { lt: endDate },
            endDate: { gt: startDate },
        },
    });
    if (existing) {
        await prisma_1.prisma.$transaction(async (tx) => {
            await tx.financeBudget.update({
                where: { id: existing.id },
                data: {
                    name: data.name,
                    period: data.period,
                    startDate,
                    endDate,
                    totalLimit: data.totalLimit,
                },
            });
            for (const i of data.items) {
                await tx.budgetItem.upsert({
                    where: {
                        budgetId_categoryId: { budgetId: existing.id, categoryId: i.categoryId },
                    },
                    update: { limitAmount: i.limitAmount },
                    create: {
                        budgetId: existing.id,
                        categoryId: i.categoryId,
                        limitAmount: i.limitAmount,
                    },
                });
            }
        });
        return prisma_1.prisma.financeBudget.findUnique({
            where: { id: existing.id },
            include: { items: { include: { category: true } } },
        });
    }
    return prisma_1.prisma.financeBudget.create({
        data: {
            userId,
            name: data.name,
            period: data.period,
            startDate,
            endDate,
            totalLimit: data.totalLimit,
            items: {
                create: data.items.map((i) => ({
                    categoryId: i.categoryId,
                    limitAmount: i.limitAmount,
                })),
            },
        },
        include: { items: { include: { category: true } } },
    });
}
async function createTransaction(userId, data) {
    const tx = await prisma_1.prisma.transaction.create({
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
    return tx;
}
async function updateTransaction(userId, id, data) {
    const existing = await prisma_1.prisma.transaction.findFirst({ where: { id, userId } });
    if (!existing)
        throw new errors_1.AppError("Transaction not found", 404);
    const tx = await prisma_1.prisma.transaction.update({
        where: { id },
        data: {
            ...(data.accountId && { accountId: data.accountId }),
            ...(data.categoryId && { categoryId: data.categoryId }),
            ...(data.type && { type: data.type }),
            ...(data.amount !== undefined && { amount: data.amount }),
            ...(data.description && { description: data.description }),
            ...(data.date && { date: new Date(data.date) }),
            ...(data.isRecurring !== undefined && { isRecurring: data.isRecurring }),
        },
    });
    return tx;
}
async function deleteTransaction(userId, id) {
    const existing = await prisma_1.prisma.transaction.findFirst({ where: { id, userId } });
    if (!existing)
        throw new errors_1.AppError("Transaction not found", 404);
    await prisma_1.prisma.transaction.delete({ where: { id } });
}
async function getFinanceDashboard(userId, month, year) {
    const now = new Date();
    const m = month ?? now.getMonth() + 1;
    const y = year ?? now.getFullYear();
    const start = new Date(y, m - 1, 1);
    const end = new Date(y, m, 1);
    const [budget, transactions, accounts] = await Promise.all([
        prisma_1.prisma.financeBudget.findFirst({
            where: {
                userId,
                startDate: { lt: end },
                endDate: { gte: start },
            },
            orderBy: { updatedAt: "desc" },
            include: { items: { include: { category: true } } },
        }),
        prisma_1.prisma.transaction.findMany({
            where: {
                userId,
                date: { gte: start, lt: end },
            },
            orderBy: { date: "desc" },
            include: { category: true },
        }),
        prisma_1.prisma.financeAccount.findMany({
            where: { userId },
            orderBy: { createdAt: "asc" },
        }),
    ]);
    const totalIncome = transactions
        .filter((t) => t.type === "INCOME")
        .reduce((sum, t) => sum + Number(t.amount), 0);
    const totalSpent = transactions
        .filter((t) => t.type === "EXPENSE")
        .reduce((sum, t) => sum + Number(t.amount), 0);
    const savings = totalIncome - totalSpent;
    const categoryBreakdown = (budget?.items ?? []).map((item) => {
        const spent = transactions
            .filter((t) => t.categoryId === item.categoryId && t.type === "EXPENSE")
            .reduce((sum, t) => sum + Number(t.amount), 0);
        return {
            category: item.category?.name ?? "Uncategorized",
            budget: Number(item.limitAmount),
            spent,
        };
    });
    const monthlyBudget = budget ? Number(budget.totalLimit) : 0;
    const budgetRemaining = monthlyBudget - totalSpent;
    const savingsRate = totalIncome > 0 ? (savings / totalIncome) * 100 : 0;
    const insight = budget && transactions.length
        ? "Finance summary is based on your real budget and transactions."
        : "No finance data yet — create a budget and add transactions to see insights.";
    return {
        summary: {
            monthlyBudget,
            totalSpent,
            totalIncome,
            savings,
            budgetRemaining,
            savingsRate,
            categoryBreakdown,
            insight,
        },
        transactions: transactions.map((t) => ({
            id: t.id,
            type: t.type === "EXPENSE" ? "expense" : t.type === "INCOME" ? "income" : "transfer",
            amount: Number(t.amount),
            category: t.category?.name ?? "Uncategorized",
            description: t.description,
            date: t.date.toISOString().split("T")[0],
        })),
        accounts: accounts.map((a) => ({
            id: a.id,
            name: a.name,
            type: a.type,
            balance: Number(a.balance),
        })),
    };
}
