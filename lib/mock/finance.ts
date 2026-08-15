import type { FinanceSummary, Transaction } from "@/types/life";

export const mockTransactions: Transaction[] = [
  { id: "tx-1", amount: 4500, category: "Salary", description: "Monthly salary", date: "2026-07-01", type: "income" },
  { id: "tx-2", amount: 1200, category: "Rent", description: "Apartment rent", date: "2026-07-01", type: "expense" },
  { id: "tx-3", amount: 380, category: "Dining", description: "Restaurants & takeout", date: "2026-07-02", type: "expense" },
  { id: "tx-4", amount: 150, category: "Groceries", description: "Weekly groceries", date: "2026-07-01", type: "expense" },
  { id: "tx-5", amount: 89, category: "Transport", description: "Metro pass", date: "2026-07-01", type: "expense" },
  { id: "tx-6", amount: 45, category: "Dining", description: "Coffee shops", date: "2026-07-02", type: "expense" },
  { id: "tx-7", amount: 200, category: "Entertainment", description: "Streaming & events", date: "2026-06-28", type: "expense" },
  { id: "tx-8", amount: 500, category: "Savings", description: "Emergency fund transfer", date: "2026-07-01", type: "expense" },
];

export const mockFinanceSummary: FinanceSummary = {
  monthlyBudget: 3000,
  totalSpent: 2064,
  totalIncome: 4500,
  savings: 8500,
  savingsRate: 35,
  categoryBreakdown: [
    { category: "Rent", spent: 1200, budget: 1200 },
    { category: "Dining", spent: 425, budget: 300 },
    { category: "Groceries", spent: 150, budget: 400 },
    { category: "Transport", spent: 89, budget: 150 },
    { category: "Entertainment", spent: 200, budget: 200 },
  ],
  insight: "You spent 43% more on dining this month compared to your budget.",
  budgetRemaining: 0,
  recentTransactions: []
};
