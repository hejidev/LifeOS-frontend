// src/lib/mock/habits.ts
import type { Habit, HabitSummary } from "@/types/life";

export const mockHabits: Habit[] = [
  {
    id: "habit-morning-walk",
    title: "Morning walk",
    description: "10–15 minute walk after waking up",
    frequency: "daily",
    streak: 5,
    longestStreak: 12,
    completedToday: true,
    category: "health",
    archived: false,
    last30Days: [],
    createdAt: "2026-07-01",
  },
  {
    id: "habit-journal",
    title: "Daily journal",
    description: "Write 3–5 sentences reflecting on the day",
    frequency: "daily",
    streak: 3,
    longestStreak: 7,
    completedToday: false,
    category: "focus",
    archived: false,
    last30Days: [],
    createdAt: "2026-07-01",
  },
  {
    id: "habit-reading",
    title: "Read 10 pages",
    description: "Non‑fiction or course material",
    frequency: "daily",
    streak: 4,
    longestStreak: 9,
    completedToday: false,
    category: "learning",
    archived: false,
    last30Days: [],
    createdAt: "2026-07-01",
  },
  {
    id: "habit-water",
    title: "Drink 8 glasses of water",
    description: "Track hydration through the day",
    frequency: "daily",
    streak: 2,
    longestStreak: 5,
    completedToday: false,
    category: "health",
    archived: false,
    last30Days: [],
    createdAt: "2026-07-01",
  },
];

export const mockHabitSummary: HabitSummary = {
  habits: mockHabits,
  completionRateToday: Math.round(
    (mockHabits.filter((h) => h.completedToday).length / mockHabits.length) *
      100
  ),
  bestStreak: Math.max(...mockHabits.map((habit) => habit.longestStreak)),
  insight:
    "You’re consistent with movement and reflection. Hydration and reading are a bit behind today — small tweaks can close the gap.",
};
