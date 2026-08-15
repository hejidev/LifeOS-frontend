// src/lib/mock/small-business.ts
import type { SmallBusinessSummary } from "@/types/life";

export const mockSmallBusinessSummary: SmallBusinessSummary = {
  businessName: "LifeOS Studio",
  currency: "NGN",
  topProducts: [],
  lowStockCount: 0,
  lowStockProducts: [],
  totalExpenses: 650000,
  metrics: [
    {
      id: "revenue",
      label: "Monthly revenue",
      value: "₦1,200,000",
      change: "+14% vs last month",
    },
    {
      id: "expenses",
      label: "Monthly expenses",
      value: "₦650,000",
      change: "+5% vs last month",
    },
    {
      id: "orders",
      label: "Orders this month",
      value: "43",
      change: "+9 new this week",
    },
    {
      id: "customers",
      label: "Active customers",
      value: "18",
      change: "+3 new this month",
    },
  ],
  recentActivity: [
    {
      id: "act-order-1",
      title: "Website redesign invoice",
      type: "invoice",
      amount: 250000,
      currency: "NGN",
      date: "2026-07-05",
      status: "paid",
    },
    {
      id: "act-order-2",
      title: "New client onboarding – ACME Ltd",
      type: "customer",
      date: "2026-07-04",
      status: "active",
    },
    {
      id: "act-exp-1",
      title: "Cloud hosting subscription",
      type: "expense",
      amount: 45000,
      currency: "NGN",
      date: "2026-07-03",
      status: "recurring",
    },
    {
      id: "act-order-3",
      title: "Landing page build",
      type: "order",
      amount: 180000,
      currency: "NGN",
      date: "2026-07-02",
      status: "in progress",
    },
  ],
  insight:
    "Revenue is trending up while expenses stay moderate. A few high‑value projects and new customers drive most of this month’s growth — doubling down on those services could be a strong move.",
};
