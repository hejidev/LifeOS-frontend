import { Prisma } from "@prisma/client";
import type { AccountType, BudgetPeriod, TransactionType } from "@prisma/client";
import { prisma } from "../config/prisma";
import { AppError } from "../lib/errors";
import { dayBounds, startOfLocalDay } from "../lib/time";

type Tx = Pick<typeof prisma, "financeAccount" | "financeCategory">;

const DEFAULT_CATEGORIES = [
  ...["Food & groceries", "Transport", "Bills & utilities", "Airtime & data", "Rent", "Shopping", "Health", "Education", "Entertainment", "Family support", "Savings"].map(
    (name) => ({ name, type: "EXPENSE" as const })
  ),
  ...["Salary", "Business", "Gifts", "Other income"].map((name) => ({ name, type: "INCOME" as const })),
];

const effect = (type: string, amount: number) => (type === "INCOME" ? amount : type === "EXPENSE" ? -amount : 0);

const money = (value: number, currency: string) => {
  try {
    return new Intl.NumberFormat(currency === "NGN" ? "en-NG" : "en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(value);
  } catch {
    return `${currency} ${Math.round(value).toLocaleString()}`;
  }
};

const accountView = (a: { id: string; name: string; type: string; currency: string; balance: Prisma.Decimal | number; isDefault: boolean }) => ({
  id: a.id,
  name: a.name,
  type: a.type,
  currency: a.currency,
  balance: Number(a.balance),
  isDefault: a.isDefault,
});

async function requireAccount(tx: Tx, userId: string, id: string) {
  const account = await tx.financeAccount.findFirst({ where: { id, userId } });
  if (!account) throw new AppError("Account not found", 404);
  return account;
}

async function requireCategory(tx: Tx, userId: string, id: string) {
  const category = await tx.financeCategory.findFirst({ where: { id, userId } });
  if (!category) throw new AppError("Category not found", 404);
  return category;
}

async function shiftBalance(tx: Tx, accountId: string | null | undefined, amount: number) {
  if (!accountId || amount === 0) return;
  await tx.financeAccount.update({ where: { id: accountId }, data: { balance: { increment: amount } } });
}

export async function createAccount(userId: string, data: { name: string; type: AccountType | string; currency: string; initialBalance?: number }) {
  const isDefault = (await prisma.financeAccount.count({ where: { userId } })) === 0;
  const account = await prisma.financeAccount.create({
    data: { userId, name: data.name, type: data.type as AccountType, currency: data.currency, balance: data.initialBalance ?? 0, isDefault },
  });
  return accountView(account);
}

export async function updateAccount(userId: string, id: string, data: { name?: string; type?: string; currency?: string; balance?: number }) {
  const existing = await prisma.financeAccount.findFirst({ where: { id, userId } });
  if (!existing) throw new AppError("Account not found", 404);

  const account = await prisma.financeAccount.update({
    where: { id },
    data: {
      ...(data.name && { name: data.name }),
      ...(data.type && { type: data.type as AccountType }),
      ...(data.currency && { currency: data.currency }),
      ...(data.balance !== undefined && { balance: data.balance }),
    },
  });
  return accountView(account);
}

export async function deleteAccount(userId: string, id: string) {
  const existing = await prisma.financeAccount.findFirst({ where: { id, userId } });
  if (!existing) throw new AppError("Account not found", 404);

  await prisma.$transaction([
    prisma.transaction.updateMany({ where: { userId, accountId: id }, data: { accountId: null } }),
    prisma.transaction.updateMany({ where: { userId, toAccountId: id }, data: { toAccountId: null } }),
    prisma.financeAccount.delete({ where: { id } }),
  ]);
}

export async function getAccounts(userId: string) {
  const accounts = await prisma.financeAccount.findMany({ where: { userId }, orderBy: { createdAt: "asc" } });
  return accounts.map(accountView);
}

export async function createCategory(userId: string, data: { name: string; type: string; color?: string; icon?: string }) {
  return prisma.financeCategory.create({
    data: { userId, name: data.name, type: data.type as TransactionType, color: data.color, icon: data.icon },
  });
}

export async function deleteCategory(userId: string, id: string) {
  const existing = await prisma.financeCategory.findFirst({ where: { id, userId } });
  if (!existing) throw new AppError("Category not found", 404);

  await prisma.$transaction([
    prisma.transaction.updateMany({ where: { userId, categoryId: id }, data: { categoryId: null } }),
    prisma.budgetItem.deleteMany({ where: { categoryId: id } }),
    prisma.financeCategory.delete({ where: { id } }),
  ]);
}

export async function getCategories(userId: string) {
  if ((await prisma.financeCategory.count({ where: { userId } })) === 0) {
    await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`fincat:${userId}`}))`;
      if ((await tx.financeCategory.count({ where: { userId } })) === 0) {
        await tx.financeCategory.createMany({ data: DEFAULT_CATEGORIES.map((category) => ({ userId, ...category })) });
      }
    });
  }
  return prisma.financeCategory.findMany({ where: { userId }, orderBy: [{ type: "asc" }, { name: "asc" }] });
}

export async function createBudget(
  userId: string,
  data: {
    name: string;
    period: string;
    startDate: string;
    endDate: string;
    totalLimit: number;
    items: { categoryId: string; limitAmount: number }[];
  }
) {
  const startDate = new Date(data.startDate);
  const endDate = new Date(data.endDate);
  const items = [...new Map(data.items.map((item) => [item.categoryId, item])).values()];
  const categoryIds = items.map((item) => item.categoryId);

  if (categoryIds.length > 0) {
    const found = await prisma.financeCategory.count({ where: { userId, id: { in: categoryIds } } });
    if (found !== categoryIds.length) throw new AppError("Category not found", 404);
  }

  const totalLimit = data.totalLimit > 0 ? data.totalLimit : items.reduce((sum, item) => sum + item.limitAmount, 0);

  return prisma.$transaction(async (tx) => {
    const existing = await tx.financeBudget.findFirst({
      where: { userId, period: data.period as BudgetPeriod, startDate: { lt: endDate }, endDate: { gt: startDate } },
    });

    const budget = existing
      ? await tx.financeBudget.update({
          where: { id: existing.id },
          data: { name: data.name, startDate, endDate, totalLimit },
        })
      : await tx.financeBudget.create({
          data: { userId, name: data.name, period: data.period as BudgetPeriod, startDate, endDate, totalLimit },
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

export async function createTransaction(
  userId: string,
  data: {
    accountId?: string;
    categoryId?: string;
    type: string;
    amount: number;
    description: string;
    date?: string;
    isRecurring?: boolean;
    linkedTaskId?: string;
    linkedNoteId?: string;
  }
) {
  return prisma.$transaction(async (tx) => {
    if (data.accountId) await requireAccount(tx, userId, data.accountId);
    if (data.categoryId) await requireCategory(tx, userId, data.categoryId);

    const created = await tx.transaction.create({
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
    await shiftBalance(tx, data.accountId, effect(data.type, data.amount));
    return created;
  });
}

export async function updateTransaction(
  userId: string,
  id: string,
  data: {
    accountId?: string | null;
    categoryId?: string | null;
    type?: string;
    amount?: number;
    description?: string;
    date?: string;
    isRecurring?: boolean;
  }
) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.transaction.findFirst({ where: { id, userId } });
    if (!existing) throw new AppError("Transaction not found", 404);
    if (existing.type === "TRANSFER") throw new AppError("Transfers can't be edited. Delete it and create a new one.", 400);

    const accountId = data.accountId === undefined ? existing.accountId : data.accountId;
    const categoryId = data.categoryId === undefined ? existing.categoryId : data.categoryId;
    if (accountId && accountId !== existing.accountId) await requireAccount(tx, userId, accountId);
    if (categoryId && categoryId !== existing.categoryId) await requireCategory(tx, userId, categoryId);

    const type = (data.type ?? existing.type) as TransactionType;
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

export async function deleteTransaction(userId: string, id: string) {
  await prisma.$transaction(async (tx) => {
    const existing = await tx.transaction.findFirst({ where: { id, userId } });
    if (!existing) throw new AppError("Transaction not found", 404);

    const amount = Number(existing.amount);
    if (existing.type === "TRANSFER") {
      await shiftBalance(tx, existing.accountId, amount);
      await shiftBalance(tx, existing.toAccountId, -amount);
    } else {
      await shiftBalance(tx, existing.accountId, -effect(existing.type, amount));
    }
    await tx.transaction.delete({ where: { id } });
  });
}

export async function createTransfer(
  userId: string,
  data: { fromAccountId: string; toAccountId: string; amount: number; note?: string; date?: string }
) {
  return prisma.$transaction(async (tx) => {
    const from = await requireAccount(tx, userId, data.fromAccountId);
    const to = await requireAccount(tx, userId, data.toAccountId);
    if (from.currency !== to.currency) throw new AppError("Both accounts must use the same currency", 400);

    const created = await tx.transaction.create({
      data: {
        userId,
        accountId: from.id,
        toAccountId: to.id,
        type: "TRANSFER" as TransactionType,
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

interface Insight {
  tone: "success" | "warning" | "danger" | "info";
  text: string;
}

function buildInsights(input: {
  currency: string;
  budget: number;
  spent: number;
  income: number;
  elapsed: number;
  days: number;
  isCurrent: boolean;
  breakdown: { category: string; budget: number; spent: number }[];
  byCategory: { category: string; spent: number }[];
  previousSpent: number;
  count: number;
}): Insight[] {
  const fmt = (value: number) => money(value, input.currency);
  if (input.count === 0) return [{ tone: "info", text: "No transactions this month yet. Add your first one to see insights." }];

  const out: Insight[] = [];
  const left = input.days - input.elapsed;

  if (input.budget > 0) {
    if (input.spent > input.budget) {
      out.push({ tone: "danger", text: `You're ${fmt(input.spent - input.budget)} over your ${fmt(input.budget)} budget.` });
    } else if (input.isCurrent && input.elapsed > 0) {
      const projected = (input.spent / input.elapsed) * input.days;
      out.push(
        projected > input.budget * 1.05
          ? { tone: "warning", text: `At this pace you'll spend about ${fmt(projected)}, above your ${fmt(input.budget)} budget.` }
          : { tone: "success", text: `You've used ${fmt(input.spent)} of ${fmt(input.budget)} with ${left} ${left === 1 ? "day" : "days"} left. You're on track.` }
      );
    }
  } else if (input.spent > 0) {
    out.push({ tone: "info", text: "You haven't set a budget for this month. Set one to track your pace." });
  }

  const over = input.breakdown
    .filter((c) => c.budget > 0 && c.spent > c.budget)
    .sort((a, b) => b.spent - b.budget - (a.spent - a.budget))
    .slice(0, 2);
  if (over.length > 0) out.push({ tone: "warning", text: `Over budget in ${over.map((c) => c.category).join(" and ")}.` });

  const top = input.byCategory[0];
  if (top && input.spent > 0 && top.spent / input.spent >= 0.35) {
    out.push({ tone: "info", text: `${top.category} is ${Math.round((top.spent / input.spent) * 100)}% of your spending.` });
  }

  if (input.income > 0) {
    const rate = Math.round(((input.income - input.spent) / input.income) * 100);
    if (rate < 0) out.push({ tone: "danger", text: "You've spent more than you earned this month." });
    else if (rate >= 20) out.push({ tone: "success", text: `You're saving ${rate}% of your income.` });
  }

  if (!input.isCurrent && input.previousSpent > 0 && input.spent > 0) {
    const change = Math.round(((input.spent - input.previousSpent) / input.previousSpent) * 100);
    if (Math.abs(change) >= 15) out.push({ tone: "info", text: `Spending was ${Math.abs(change)}% ${change > 0 ? "higher" : "lower"} than the month before.` });
  }

  return out.slice(0, 4);
}

export async function getFinanceDashboard(userId: string, month?: number, year?: number) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { timezone: true, currency: true } });
  const currency = user?.currency || "NGN";
  const { zone, dateKey } = dayBounds(user?.timezone);
  const [nowYear, nowMonth, nowDay] = dateKey.split("-").map(Number);

  const y = year ?? nowYear;
  const m = month ?? nowMonth;
  if (m < 1 || m > 12) throw new AppError("Invalid month", 400);

  const firstOf = (yy: number, mm: number) => `${yy}-${String(mm).padStart(2, "0")}-01`;
  const start = startOfLocalDay(firstOf(y, m), zone);
  const end = startOfLocalDay(m === 12 ? firstOf(y + 1, 1) : firstOf(y, m + 1), zone);
  const previousStart = startOfLocalDay(m === 1 ? firstOf(y - 1, 12) : firstOf(y, m - 1), zone);

  const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const isCurrent = y === nowYear && m === nowMonth;
  const isFuture = y > nowYear || (y === nowYear && m > nowMonth);
  const elapsed = isFuture ? 0 : isCurrent ? nowDay : days;
  const dayFormat = new Intl.DateTimeFormat("en-CA", { timeZone: zone, year: "numeric", month: "2-digit", day: "2-digit" });

  const [budget, transactions, accounts, previous] = await Promise.all([
    prisma.financeBudget.findFirst({
      where: { userId, startDate: { lt: end }, endDate: { gte: start } },
      orderBy: { updatedAt: "desc" },
      include: { items: { include: { category: true } } },
    }),
    prisma.transaction.findMany({
      where: { userId, date: { gte: start, lt: end } },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      include: { category: true },
    }),
    prisma.financeAccount.findMany({ where: { userId }, orderBy: { createdAt: "asc" } }),
    prisma.transaction.groupBy({
      by: ["type"],
      where: { userId, date: { gte: previousStart, lt: start }, type: { in: ["INCOME", "EXPENSE"] as TransactionType[] } },
      _sum: { amount: true },
    }),
  ]);

  const daily = Array.from({ length: days }, () => 0);
  const spentByCategory = new Map<string, { categoryId: string | null; category: string; color: string | null; spent: number }>();
  let totalIncome = 0;
  let totalSpent = 0;

  for (const t of transactions) {
    const amount = Number(t.amount);
    if (t.type === "INCOME") totalIncome += amount;
    if (t.type !== "EXPENSE") continue;

    totalSpent += amount;
    const dayIndex = Number(dayFormat.format(t.date).slice(8)) - 1;
    if (dayIndex >= 0 && dayIndex < days) daily[dayIndex] += amount;

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