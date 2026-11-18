export type TxKind = "income" | "expense" | "transfer";

export interface FinanceTransaction {
  id: string;
  type: TxKind;
  amount: number;
  category: string;
  categoryId: string | null;
  accountId: string | null;
  toAccountId: string | null;
  description: string;
  date: string;
}

export interface FinanceAccount {
  id: string;
  name: string;
  type: string;
  currency: string;
  balance: number;
  isDefault: boolean;
}

export interface FinanceCategory {
  id: string;
  name: string;
  type: "INCOME" | "EXPENSE" | "TRANSFER";
  color?: string | null;
}

export interface FinanceInsight {
  tone: "success" | "warning" | "danger" | "info";
  text: string;
}

export interface FinanceDashboard {
  summary: {
    month: number;
    year: number;
    daysInMonth: number;
    elapsedDays: number;
    currency: string;
    budgetId: string | null;
    monthlyBudget: number;
    totalSpent: number;
    totalIncome: number;
    savings: number;
    budgetRemaining: number;
    savingsRate: number;
    categoryBreakdown: { categoryId: string; category: string; budget: number; spent: number }[];
    spendingByCategory: { categoryId: string | null; category: string; color: string | null; spent: number }[];
    daily: number[];
    previous: { totalSpent: number; totalIncome: number };
    insights: FinanceInsight[];
    insight: string;
  };
  transactions: FinanceTransaction[];
  accounts: FinanceAccount[];
}