"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";

export type GoalModule = "TASKS" | "FINANCE" | "STUDY" | "HEALTH" | "CAREER" | "OTHER";
export type GoalStatus = "ACTIVE" | "COMPLETED" | "ABANDONED";

export interface LifeGoal {
  id: string;
  title: string;
  module: GoalModule;
  target: number;
  progress: number;
  unit: string | null;
  deadline: string | null;
  status: GoalStatus;
  overdue: boolean;
}

export function useGoals() {
  return useQuery<LifeGoal[]>({
    queryKey: ["goals"],
    queryFn: () => api.get("/goals").then((d) => d.goals),
    staleTime: 1000 * 30,
  });
}

function useGoalMutation<T>(run: (input: T) => Promise<unknown>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: run,
    onSuccess: () => Promise.all([qc.invalidateQueries({ queryKey: ["goals"] }), qc.invalidateQueries({ queryKey: ["todayOverview"] })]),
  });
}

type Body = Record<string, unknown>;

export const useCreateGoal = () => useGoalMutation((data: Body) => api.post("/goals", data));
export const useUpdateGoal = () => useGoalMutation(({ id, data }: { id: string; data: Body }) => api.patch(`/goals/${id}`, data));
export const useDeleteGoal = () => useGoalMutation((id: string) => api.delete(`/goals/${id}`));