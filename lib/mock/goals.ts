import type { Goal } from "@/types/life";

export const mockGoals: Goal[] = [
  { id: "goal-1", title: "Complete 20 tasks", progress: 14, target: 20, module: "tasks" },
  { id: "goal-2", title: "Save $500", progress: 320, target: 500, module: "finance", unit: "$" },
  { id: "goal-3", title: "Study 10 hours", progress: 6, target: 10, module: "study", unit: "hrs" },
  { id: "goal-4", title: "Exercise 12 days", progress: 8, target: 12, module: "health", unit: "days" },
];
