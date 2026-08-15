export type UserRole = "user" | "admin" | "super_admin" | "marketting";

export type TaskPriority = "P1" | "P2" | "P3" | "P4";
export type TaskStatus = "todo" | "in_progress" | "done";
export type StudyStatus = "not_started" | "in_progress" | "completed";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  timezone: string;
  role: UserRole;
  location: string;
  preferences: {
    darkMode: boolean;
    weekStartsOn: number;
  };
}

export interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  type: "meeting" | "personal" | "deadline" | "reminder";
  location?: string;
}

// Used by the Settings page — superset of AuthUser with notification prefs.
export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  timezone: string;
  role: UserRole;
  location?: string;
  currency: string;
  preferences: {
    darkMode: boolean;
    weekStartsOn: number; // 0 = Sunday, 1 = Monday
  };
  notifications: {
    notifyTasks: boolean;
    notifyCalendar: boolean;
    notifyFinance: boolean;
  };
  provider?: string;
  emailVerified?: boolean;
  createdAt?: string;
}

export interface AccountOverviewModule {
  id: string;
  label: string;
  count: number;
  detail?: string;
}

export interface AccountOverview {
  modules: AccountOverviewModule[];
}

export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  priority: TaskPriority;
  status: TaskStatus;
  dueDate?: string;
  dueTime?: string;
  tags: string[];
  linkedGoalId?: string;
  linkedNoteId?: string;
  linkedBudgetItemId?: string;
  subtasks: Subtask[];
  recurring?: boolean;
  smartReminder?: boolean;
  suggestedSchedule?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  summary?: string;
  folder: string;
  tags: string[];
  linkedTaskIds: string[];
  pinned: boolean;
  attachments: { name: string; type: string }[];
  createdAt: string;
  updatedAt: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  type: "meeting" | "personal" | "deadline" | "reminder";
  location?: string;
}

export interface Transaction {
  id: string;
  amount: number;
  category: string;
  description: string;
  date: string;
  type: "income" | "expense";
}

export interface FinanceCategoryBreakdown {
  category: string;
  spent: number;
  budget: number;
}

export interface FinanceSummary {
  monthlyBudget: number;
  totalSpent: number;
  totalIncome: number;
  savings: number;
  budgetRemaining: number;
  savingsRate: number;
  categoryBreakdown: {
    category: string;
    budget: number;
    spent: number;
  }[];
  insight: string;
  recentTransactions?: Transaction[];
}

export interface Goal {
  id: string;
  title: string;
  progress: number;
  target: number;
  module: "tasks" | "finance" | "health" | "study";
  unit?: string;
}

export interface Weather {
  location: string;
  temp: number;
  condition: string;
  high: number;
  low: number;
  icon: "sun" | "cloud" | "rain" | "partly-cloudy";
}

export interface Quote {
  text: string;
  author: string;
}

export interface FocusSuggestion {
  id: string;
  title: string;
  reason: string;
  priority: number;
  actionType?: "task" | "finance" | "calendar" | "note";
  actionId?: string;
}

export interface AIContext {
  todayTasks: Task[];
  overdueTasks: Task[];
  todayEvents: CalendarEvent[];
  financeSummary: FinanceSummary;
  recentNotes: Note[];
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  actions?: { label: string; href: string; type: string }[];
  timestamp: string;
}

export interface SearchResult {
  id: string;
  type: "task" | "note" | "page" | "action";
  title: string;
  subtitle?: string;
  href: string;
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: "active" | "suspended";
  lastActive: string;
  plan: "free" | "premium";
}

export interface Tenant {
  id: string;
  name: string;
  plan: "free" | "premium" | "enterprise";
  users: number;
  status: "active" | "trial" | "suspended";
  mrr: number;
}

export interface TodayOverview {
  user: AuthUser;
  weather: Weather;
  events: CalendarEvent[];
  priorityTasks: Task[];
  goals: Goal[];
  recentNotes: Note[];
  quote: Quote;
  finance: FinanceSummary;
  suggestions: FocusSuggestion[];
}

export interface StudyMaterial {
  id: string;
  title: string;
  subjectId?: string;
  type: "BOOK" | "ARTICLE" | "VIDEO" | "COURSE" | "PODCAST" | "PDF" | "NOTE";
  url?: string;
  notes?: string;
  status: "PLANNED" | "IN_PROGRESS" | "COMPLETED" | "ON_HOLD";
  progress: number;
  targetDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface StudySubject {
  id: string;
  name: string;
  color?: string;
  description?: string;
  createdAt: string;
}

export interface StudySessionRecord {
  id: string;
  title: string;
  subjectId?: string;
  materialId?: string;
  startedAt: string;
  endedAt?: string;
  minutes?: number;
  notes?: string;
}

export interface HealthMetric {
  id: string;
  label: string;
  value: string;
  target?: string;
  trend?: "up" | "down" | "stable";
}

export interface HealthHabit {
  id: string;
  title: string;
  streak: number;
  completedToday: boolean;
}

export interface HealthSummary {
  sleepHours: number;
  steps: number;
  waterGlasses: number;
  workoutsThisWeek: number;
  insight: string;
  metrics: HealthMetric[];
  habits: HealthHabit[];
}

// ── Habits (premium tracker) ────────────────────────────────────────────

export type HabitCategory = "health" | "focus" | "learning" | "finance" | "other";
export type HabitFrequency = "daily" | "weekly";

export interface HabitDay {
  date: string; // ISO yyyy-mm-dd
  completed: boolean;
}

export interface Habit {
  id: string;
  title: string;
  description?: string;
  frequency: HabitFrequency;
  category: HabitCategory;
  colorHex?: string;
  streak: number;
  longestStreak: number;
  completedToday: boolean;
  archived: boolean;
  last30Days: HabitDay[];
  createdAt: string;
}

export interface HabitSummary {
  habits: Habit[];
  completionRateToday: number; // 0–100
  bestStreak: number;
  insight: string;
}

export interface CareerGoal {
  id: string;
  title: string;
  area: "skills" | "role" | "project" | "certification";
  targetDate?: string;
  progress: number;
}

export interface SkillProgress {
  id: string;
  name: string;
  level: "beginner" | "intermediate" | "advanced";
  progress: number;
  relatedStudyMaterialId?: string;
}

export interface CareerSummary {
  goals: CareerGoal[];
  skills: SkillProgress[];
  insight: string;
}

export interface FamilyMember {
  id: string;
  name: string;
  role: "parent" | "child" | "guardian";
  avatar?: string;
  device: string;
  locationSharing: boolean;
  screenTimeToday: string;
  status: "online" | "offline" | "away";
}

export interface FamilyControl {
  id: string;
  title: string;
  description?: string;
  enabled: boolean;
  value?: string;
}

export interface FamilySummary {
  familyName: string;
  members: FamilyMember[];
  controls: FamilyControl[];
  insight: string;
}

export interface VaultDocument {
  id: string;
  title: string;
  category: "identity" | "finance" | "education" | "legal" | "personal" | "other";
  status: "ACTIVE" | "ARCHIVED" | "EXPIRED";
  fileUrl?: string;
  fileName?: string;
  fileType?: string;
  fileSize?: number;
  tags: string[];
  summary?: string;
  expiresAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface VaultItem {
  id: string;
  label: string;
  username: string;
  url?: string;
  category: "website" | "app" | "bank" | "note";
  strength: "weak" | "medium" | "strong";
  lastChanged?: string;
  tags?: string[];
}

export interface PasswordVaultSummary {
  items: VaultItem[];
  totalItems: number;
  weakCount: number;
  reusedCount: number;
  insight: string;
}

// ── Small Business POS ──────────────────────────────────────────────────

export interface BusinessMetric {
  id: string;
  label: string;
  value: string;
  change?: string;
}

export interface BusinessActivity {
  id: string;
  title: string;
  type: "order" | "invoice" | "expense" | "customer";
  amount?: number;
  currency?: string;
  date: string;
  status?: string;
}

export interface BizTopProduct {
  name: string;
  units: number;
  revenue: number;
}

export interface SmallBusinessSummary {
  businessName: string;
  currency: string;
  metrics: BusinessMetric[];
  recentActivity: BusinessActivity[];
  topProducts: BizTopProduct[];
  lowStockCount: number;
  lowStockProducts: BizProduct[];
  totalExpenses: number;
  insight: string;
}

export interface BizProduct {
  id: string;
  name: string;
  sku?: string;
  category?: string;
  price: number;
  cost?: number;
  stock: number;
  lowStockAt: number;
  imageUrl?: string;
  active: boolean;
  margin?: number;
  createdAt: string;
  updatedAt: string;
}

export interface BizCustomer {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  notes?: string;
  totalSpent: number;
  orderCount: number;
  createdAt: string;
}

export type BizPaymentMethod = "CASH" | "CARD" | "TRANSFER" | "MOBILE_MONEY";
export type BizSaleStatus = "PAID" | "PENDING" | "REFUNDED" | "CANCELLED";

export interface BizSaleItem {
  id: string;
  productId?: string;
  name: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface BizSale {
  id: string;
  receiptNumber: string;
  customerId?: string;
  customerName?: string;
  items: BizSaleItem[];
  subtotal: number;
  discount: number;
  total: number;
  paymentMethod: BizPaymentMethod;
  status: BizSaleStatus;
  note?: string;
  createdAt: string;
}

export type BizExpenseCategory =
  | "INVENTORY"
  | "RENT"
  | "UTILITIES"
  | "SALARY"
  | "MARKETING"
  | "SUPPLIES"
  | "OTHER";

export interface BizExpense {
  id: string;
  title: string;
  category: BizExpenseCategory;
  amount: number;
  date: string;
  note?: string;
  createdAt: string;
}