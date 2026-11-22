"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";

export type MaterialStatus = "PLANNED" | "IN_PROGRESS" | "COMPLETED" | "ON_HOLD";
export type MaterialType = "BOOK" | "ARTICLE" | "VIDEO" | "COURSE" | "PODCAST" | "PDF" | "NOTE" | "IMAGE" | "DOCUMENT";

export interface Material {
  id: string;
  title: string;
  type: MaterialType;
  status: MaterialStatus;
  progress: number;
  subjectId: string | null;
  url: string | null;
  hasFile: boolean;
  isPrivate: boolean;
  fileName: string | null;
  fileType: string | null;
  fileSize: number | null;
  notes: string | null;
  targetDate: string | null;
  createdAt: string;
}

export interface Subject {
  id: string;
  name: string;
  color: string | null;
  description: string | null;
  status: MaterialStatus;
  materialCount: number;
}

export interface SessionRow {
  id: string;
  title: string;
  minutes: number | null;
  startedAt: string;
  endedAt: string | null;
}

export interface ActiveSession {
  id: string;
  title: string;
  materialId: string | null;
  startedAt: string;
}

export interface StudyDashboard {
  stats: { totalSubjects: number; totalMaterials: number; completedMaterials: number; inProgressMaterials: number; totalStudyMinutes: number; streakDays: number; overdueMaterials: number };
  subjects: Subject[];
  materials: Material[];
  recentSessions: SessionRow[];
  activeSession: ActiveSession | null;
  insight: string;
}

export function useStudyDashboard() {
  return useQuery<StudyDashboard>({
    queryKey: ["studyDashboard"],
    queryFn: () => api.get("/study/dashboard?range=month"),
    staleTime: 1000 * 30,
  });
}

function useStudyMutation<T>(run: (input: T) => Promise<unknown>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: run,
    onSuccess: () => Promise.all([qc.invalidateQueries({ queryKey: ["studyDashboard"] }), qc.invalidateQueries({ queryKey: ["todayOverview"] })]),
  });
}

type Body = Record<string, unknown>;

export const useCreateMaterial = () => useStudyMutation((data: Body) => api.post("/study/materials", data));
export const useUpdateMaterial = () => useStudyMutation(({ id, data }: { id: string; data: Body }) => api.patch(`/study/materials/${id}`, data));
export const useDeleteMaterial = () => useStudyMutation((id: string) => api.delete(`/study/materials/${id}`));
export const useCreateSubject = () => useStudyMutation((data: Body) => api.post("/study/subjects", data));
export const useDeleteSubject = () => useStudyMutation((id: string) => api.delete(`/study/subjects/${id}`));
export const useStartSession = () => useStudyMutation((data: Body) => api.post("/study/sessions", data));
export const useEndSession = () => useStudyMutation(({ id }: { id: string }) => api.patch(`/study/sessions/${id}/end`, {}));

export function useUploadMaterialFile() {
  return useMutation({
    mutationFn: (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      return api.upload("/study/materials/upload", formData) as Promise<{ url: string; fileName: string; fileType: string; fileSize: number }>;
    },
  });
}