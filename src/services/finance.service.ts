import { prisma } from "../config/prisma";
import { AppError } from "../lib/errors";
import { Prisma } from "@prisma/client";
import type { AccountType, TransactionType, BudgetPeriod } from "@prisma/client";

export async function createAccount(userId: string, data: {
  name: string;
  type: AccountType | string;
  currency: string;
  initialBalance?: number;
}) {
  const account = await prisma.financeAccount.create({
    data: {
      userId,
      name: data.name,
      type: data.type as AccountType,
      currency: data.currency,
      balance: data.initialBalance ?? 0,
      isDefault: false,
    },
  });
  return account;
}

export async function updateAccount(userId: string, id: string, data: {
  name?: string;
  type?: string;
  currency?: string;
}) {
  const existing = await prisma.financeAccount.findFirst({ where: { id, userId } });
  if (!existing) throw new AppError("Account not found", 404);

  const account = await prisma.financeAccount.update({
    where: { id },
    data: {
      ...(data.name && { name: data.name }),
      ...(data.type && { type: data.type as AccountType }),
      ...(data.currency && { currency: data.currency }),
    },
  });
  return account;
}

export async function getAccounts(userId: string) {
  return prisma.financeAccount.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
  });
}

export async function createCategory(userId: string, data: {
  name: string;
  type: string;
  color?: string;
  icon?: string;
}) {
  const category = await prisma.financeCategory.create({
    data: {
      userId,
      name: data.name,
      type: data.type as TransactionType,
      color: data.color,
      icon: data.icon,
    },
  });
  return category;
}

export async function getCategories(userId: string) {
  return prisma.financeCategory.findMany({
    where: { userId },
    orderBy: { name: "asc" },
  });
}

export async function createBudget(userId: string, data: {
  name: string;
  period: string;
  startDate: string;
  endDate: string;
  totalLimit: number;
  items: { categoryId: string; limitAmount: number }[];
}) {
  const startDate = new Date(data.startDate);
  const endDate = new Date(data.endDate);

  // If a budget already overlaps this period, treat this as updating
  // that budget rather than creating a duplicate the dashboard will
  // never look at again.
  const existing = await prisma.financeBudget.findFirst({
    where: {
      userId,
      startDate: { lt: endDate },
      endDate: { gt: startDate },
    },
  });

  if (existing) {
    await prisma.$transaction(async (tx) => {
      await tx.financeBudget.update({
        where: { id: existing.id },
        data: {
          name: data.name,
          period: data.period as BudgetPeriod,
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

    return prisma.financeBudget.findUnique({
      where: { id: existing.id },
      include: { items: { include: { category: true } } },
    });
  }

  return prisma.financeBudget.create({
    data: {
      userId,
      name: data.name,
      period: data.period as BudgetPeriod,
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

export async function createTransaction(userId: string, data: {
  accountId?: string;
  categoryId?: string;
  type: string;
  amount: number;
  description: string;
  date?: string;
  isRecurring?: boolean;
  linkedTaskId?: string;
  linkedNoteId?: string;
}) {
  const tx = await prisma.transaction.create({
    data: {
      userId,
      accountId: data.accountId,
      categoryId: data.categoryId,
      type: data.type as TransactionType,
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

export async function updateTransaction(userId: string, id: string, data: {
  accountId?: string;
  categoryId?: string;
  type?: string;
  amount?: number;
  description?: string;
  date?: string;
  isRecurring?: boolean;
}) {
  const existing = await prisma.transaction.findFirst({ where: { id, userId } });
  if (!existing) throw new AppError("Transaction not found", 404);

  const tx = await prisma.transaction.update({
    where: { id },
    data: {
      ...(data.accountId && { accountId: data.accountId }),
      ...(data.categoryId && { categoryId: data.categoryId }),
      ...(data.type && { type: data.type as TransactionType }),
      ...(data.amount !== undefined && { amount: data.amount }),
      ...(data.description && { description: data.description }),
      ...(data.date && { date: new Date(data.date) }),
      ...(data.isRecurring !== undefined && { isRecurring: data.isRecurring }),
    },
  });
  return tx;
}

export async function deleteTransaction(userId: string, id: string) {
  const existing = await prisma.transaction.findFirst({ where: { id, userId } });
  if (!existing) throw new AppError("Transaction not found", 404);
  await prisma.transaction.delete({ where: { id } });
}

export async function getFinanceDashboard(userId: string, month?: number, year?: number) {
  const now = new Date();
  const m = month ?? now.getMonth() + 1;
  const y = year ?? now.getFullYear();

  const start = new Date(y, m - 1, 1);
  const end = new Date(y, m, 1);

  const [budget, transactions, accounts] = await Promise.all([
    prisma.financeBudget.findFirst({
      where: {
        userId,
        startDate: { lt: end },
        endDate: { gte: start },
      },
      orderBy: { updatedAt: "desc" },
      include: { items: { include: { category: true } } },
    }),
    prisma.transaction.findMany({
      where: {
        userId,
        date: { gte: start, lt: end },
      },
      orderBy: { date: "desc" },
      include: { category: true },
    }),
    prisma.financeAccount.findMany({
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

  const insight =
    budget && transactions.length
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