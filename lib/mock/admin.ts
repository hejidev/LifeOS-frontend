import type { AdminUser, Tenant } from "@/types/life";

export const mockAdminUsers: AdminUser[] = [
  { id: "u1", name: "Alex Morgan", email: "alex@lifeos.app", role: "user", status: "active", lastActive: "2026-07-03T01:00:00Z", plan: "free" },
  { id: "u2", name: "Sarah Chen", email: "sarah@example.com", role: "user", status: "active", lastActive: "2026-07-02T22:00:00Z", plan: "premium" },
  { id: "u3", name: "James Wilson", email: "james@example.com", role: "admin", status: "active", lastActive: "2026-07-02T18:00:00Z", plan: "premium" },
  { id: "u4", name: "Maria Garcia", email: "maria@example.com", role: "user", status: "suspended", lastActive: "2026-06-15T10:00:00Z", plan: "free" },
  { id: "u5", name: "David Kim", email: "david@example.com", role: "user", status: "active", lastActive: "2026-07-03T00:30:00Z", plan: "free" },
  { id: "u6", name: "Emma Thompson", email: "emma@example.com", role: "user", status: "active", lastActive: "2026-07-02T20:00:00Z", plan: "premium" },
];

export const mockTenants: Tenant[] = [
  { id: "t1", name: "Acme Corp", plan: "enterprise", users: 45, status: "active", mrr: 899 },
  { id: "t2", name: "StartupXYZ", plan: "premium", users: 12, status: "active", mrr: 228 },
  { id: "t3", name: "Freelance Hub", plan: "premium", users: 8, status: "trial", mrr: 0 },
  { id: "t4", name: "Family Smith", plan: "free", users: 4, status: "active", mrr: 0 },
  { id: "t5", name: "DevTeam Inc", plan: "enterprise", users: 120, status: "active", mrr: 2399 },
];

export const mockAnalytics = {
  signups: [
    { month: "Jan", count: 120 },
    { month: "Feb", count: 180 },
    { month: "Mar", count: 250 },
    { month: "Apr", count: 310 },
    { month: "May", count: 420 },
    { month: "Jun", count: 580 },
  ],
  moduleUsage: [
    { module: "Dashboard", usage: 95 },
    { module: "Tasks", usage: 88 },
    { module: "Notes", usage: 72 },
    { module: "Finance", usage: 65 },
    { module: "AI Assistant", usage: 58 },
    { module: "Health", usage: 42 },
  ],
  retention: [
    { week: "W1", rate: 100 },
    { week: "W2", rate: 78 },
    { week: "W3", rate: 65 },
    { week: "W4", rate: 58 },
  ],
};

export const mockBillingStats = {
  stripe: { revenue: 12450, transactions: 342 },
  paystack: { revenue: 8320, transactions: 156 },
  paypal: { revenue: 5680, transactions: 98 },
  totalMRR: 3526,
  totalUsers: 2847,
  premiumUsers: 412,
};
