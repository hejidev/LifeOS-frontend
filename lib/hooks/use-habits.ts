"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import type { Habit, HabitSummary } from "@/types/life";

export function useHabitSummary() {
  return useQuery<HabitSummary>({
    queryKey: ["habitSummary"],
    queryFn: () => api.get("/health/habits/summary"),
    staleTime: 1000 * 30,
  });
}

export function useHabitsList(includeArchived = false, enabled = true) {
  return useQuery<Habit[]>({
    queryKey: ["habitsList", includeArchived],
    queryFn: () => api.get(`/health/habits?archived=${includeArchived}`).then((d) => d.habits as Habit[]),
    enabled,
  });
}

function useRefreshHabits() {
  const qc = useQueryClient();
  return () => Promise.all([["habitSummary"], ["habitsList"], ["health"]].map((queryKey) => qc.invalidateQueries({ queryKey })));
}

export function useCreateHabit() {
  const refresh = useRefreshHabits();
  return useMutation({ mutationFn: (data: Record<string, unknown>) => api.post("/health/habits", data), onSuccess: refresh });
}

export function useUpdateHabit() {
  const refresh = useRefreshHabits();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) => api.patch(`/health/habits/${id}`, data),
    onSuccess: refresh,
  });
}

export function useDeleteHabit() {
  const refresh = useRefreshHabits();
  return useMutation({ mutationFn: (id: string) => api.delete(`/health/habits/${id}`), onSuccess: refresh });
}

export function useToggleHabitCompletion() {
  const qc = useQueryClient();
  const refresh = useRefreshHabits();

  return useMutation({
    mutationFn: ({ id, date }: { id: string; date?: string }) => api.post(`/health/habits/${id}/complete`, date ? { date } : undefined),
    onMutate: async ({ id, date }) => {
      if (date) return { prev: undefined };
      await qc.cancelQueries({ queryKey: ["habitSummary"] });
      const prev = qc.getQueryData<HabitSummary>(["habitSummary"]);
      if (prev) {
        const habits = prev.habits.map((habit) =>
          habit.id === id
            ? { ...habit, completedToday: !habit.completedToday, streak: habit.completedToday ? Math.max(0, habit.streak - 1) : habit.streak + 1 }
            : habit
        );
        qc.setQueryData<HabitSummary>(["habitSummary"], {
          ...prev,
          habits,
          completionRateToday: Math.round((habits.filter((habit) => habit.completedToday).length / Math.max(1, habits.length)) * 100),
        });
      }
      return { prev };
    },
    onError: (_error, _vars, context) => {
      if (context?.prev) qc.setQueryData(["habitSummary"], context.prev);
    },
    onSettled: refresh,
  });
}