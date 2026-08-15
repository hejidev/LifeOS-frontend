import type { CareerSummary } from "@/types/life";

export const mockCareerSummary: CareerSummary = {
  goals: [
    {
      id: "career-goal-1",
      title: "Move towards Senior Frontend Engineer",
      area: "role",
      targetDate: "2026-12-31",
      progress: 40,
    },
    {
      id: "career-goal-2",
      title: "Ship a polished LifeOS MVP",
      area: "project",
      targetDate: "2026-09-30",
      progress: 55,
    },
    {
      id: "career-goal-3",
      title: "Complete advanced React & TypeScript course",
      area: "certification",
      targetDate: "2026-08-31",
      progress: 30,
    },
  ],
  skills: [
    {
      id: "skill-react",
      name: "React & Next.js",
      level: "advanced",
      progress: 80,
      relatedStudyMaterialId: "mat-ml",
    },
    {
      id: "skill-ui",
      name: "Design systems / shadcn UI",
      level: "intermediate",
      progress: 65,
    },
    {
      id: "skill-data",
      name: "Data & analytics",
      level: "beginner",
      progress: 35,
    },
  ],
  insight:
    "You’re strongest in React and UI systems. Completing your advanced course and shipping the LifeOS MVP will move you meaningfully toward your next role.",
};