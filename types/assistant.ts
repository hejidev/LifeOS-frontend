export interface AssistantTask {
    id: string;
    title: string;
    priority: string;
    dueDate: string | null;
    dueTime: string | null;
  }
  
  export interface AssistantContext {
    user: { name: string; timezone: string; currency: string };
    now: { date: string; weekday: string; time: string };
    tasks: { today: AssistantTask[]; overdue: AssistantTask[]; upcoming: AssistantTask[] };
    events: { today: { id: string; title: string }[]; upcoming: { id: string; title: string }[] };
    habits: { total: number; doneToday: number; atRisk: number };
    goals: { id: string; title: string }[];
    finance: { currency: string; monthlyBudget: number; totalSpent: number; totalIncome: number; overBudget: string[]; insight: string };
  }
  
  export interface ConversationSummary {
    id: string;
    title: string;
    updatedAt: string;
  }
  
  export interface StoredMessage {
    id: string;
    role: "user" | "assistant";
    content: string;
    createdAt: string;
  }
  
  export type AssistantAction =
    | { type: "create_task"; title: string; dueDate?: string; priority: "P1" | "P2" | "P3" | "P4" }
    | { type: "create_note"; title: string; content: string }
    | { type: "log_transaction"; kind: "expense" | "income"; amount: number; description: string }
    | { type: "create_event"; title: string; start: string; end: string; location?: string };