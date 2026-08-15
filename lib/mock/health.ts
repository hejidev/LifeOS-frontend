// src/lib/mock/health.ts
import type { HealthSummary } from "@/types/life";

export const mockHealthSummary: HealthSummary = {
  sleepHours: 7.2,
  steps: 8450,
  waterGlasses: 6,
  workoutsThisWeek: 3,
  insight:
    "Solid week overall. Slightly under your water goal and one workout behind your target.",
  metrics: [
    {
      id: "sleep",
      label: "Sleep",
      value: "7.2 h",
      target: "8 h",
      trend: "stable",
    },
    {
      id: "steps",
      label: "Steps",
      value: "8,450",
      target: "10,000",
      trend: "up",
    },
    {
      id: "water",
      label: "Water",
      value: "6 glasses",
      target: "8 glasses",
      trend: "down",
    },
    {
      id: "workouts",
      label: "Workouts",
      value: "3 / week",
      target: "4 / week",
      trend: "stable",
    },
  ],
  habits: [
    {
      id: "habit-morning-walk",
      title: "Morning walk",
      streak: 5,
      completedToday: true,
    },
    {
      id: "habit-meditation",
      title: "Evening meditation",
      streak: 3,
      completedToday: false,
    },
    {
      id: "habit-water",
      title: "Drink 8 glasses of water",
      streak: 2,
      completedToday: false,
    },
  ],
};