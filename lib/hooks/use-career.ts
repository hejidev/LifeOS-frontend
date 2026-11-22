"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";

export type GoalArea = "SKILLS" | "ROLE" | "PROJECT" | "CERTIFICATION";
export type GoalStatus = "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED" | "ON_HOLD";
export type SkillLevel = "BEGINNER" | "INTERMEDIATE" | "ADVANCED" | "EXPERT";
export type AchievementType = "CERTIFICATION" | "AWARD" | "PROMOTION" | "PUBLICATION" | "OTHER";

export interface CareerGoal {
  id: string;
  title: string;
  area: GoalArea;
  status: GoalStatus;
  progress: number;
  targetDate: string | null;
  notes: string | null;
  overdue: boolean;
}

export interface CareerSkill {
  id: string;
  name: string;
  level: SkillLevel;
  progress: number;
  category: string | null;
  relatedGoalId: string | null;
  lastPracticedAt: string | null;
}

export interface CareerAchievement {
  id: string;
  title: string;
  type: AchievementType;
  issuer: string | null;
  date: string | null;
  description: string | null;
  credentialUrl: string | null;
}

export interface CareerDashboard {
  goals: CareerGoal[];
  skills: CareerSkill[];
  achievements: CareerAchievement[];
  stats: { totalGoals: number; activeGoals: number; completedGoals: number; overdueGoals: number; avgSkillProgress: number; totalSkills: number; totalAchievements: number };
  insight: string;
}

export function useCareerDashboard() {
  return useQuery<CareerDashboard>({
    queryKey: ["careerDashboard"],
    queryFn: () => api.get("/career/dashboard"),
    staleTime: 1000 * 30,
  });
}

function useCareerMutation<T>(run: (input: T) => Promise<unknown>) {
  const qc = useQueryClient();
  return useMutation({ mutationFn: run, onSuccess: () => qc.invalidateQueries({ queryKey: ["careerDashboard"] }) });
}

type Body = Record<string, unknown>;

export const useCreateCareerGoal = () => useCareerMutation((data: Body) => api.post("/career/goals", data));
export const useUpdateCareerGoal = () => useCareerMutation(({ id, data }: { id: string; data: Body }) => api.patch(`/career/goals/${id}`, data));
export const useDeleteCareerGoal = () => useCareerMutation((id: string) => api.delete(`/career/goals/${id}`));
export const useCreateSkill = () => useCareerMutation((data: Body) => api.post("/career/skills", data));
export const useUpdateSkill = () => useCareerMutation(({ id, data }: { id: string; data: Body }) => api.patch(`/career/skills/${id}`, data));
export const useDeleteSkill = () => useCareerMutation((id: string) => api.delete(`/career/skills/${id}`));
export const useCreateAchievement = () => useCareerMutation((data: Body) => api.post("/career/achievements", data));
export const useDeleteAchievement = () => useCareerMutation((id: string) => api.delete(`/career/achievements/${id}`));