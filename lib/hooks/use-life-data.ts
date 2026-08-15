"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, setAccessToken, streamPost } from "@/lib/api/client";
import type {
  Task, TaskStatus, Note, HealthSummary,
  StudyMaterial, FinanceSummary, Transaction, 
  Habit, HabitSummary,
  SmallBusinessSummary,
  VaultDocument,
  BizProduct,
  BizCustomer,
  BizSale,
  BizExpense,
  UserProfile, AccountOverview,
  UserRole,
} from "@/types/life";
import { useMemo, useState } from "react";
import { useAuthStore } from "../stores/auth-store";

export function useTodayOverview() {
  return useQuery({
    queryKey: ["todayOverview"],
    queryFn: () => api.get("/overview/today"),
    staleTime: 1000 * 30,
  });
}

export function usePlatformUsers(search?: string) {
  return useQuery({
    queryKey: ["platformUsers", search],
    queryFn: () => api.get(`/platform-admin/users${search ? `?search=${encodeURIComponent(search)}` : ""}`).then((d) => d.users),
  });
}

export function useToggleUserStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.patch(`/platform-admin/users/${id}/toggle-status`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["platformUsers"] }),
  });
}

function useUserSupportMutation<T>(mutationFn: (data: T) => Promise<unknown>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["platformUsers"] });
      qc.invalidateQueries({ queryKey: ["platformAuditLog"] });
      qc.invalidateQueries({ queryKey: ["securityOverview"] });
    },
  });
}

export function useSupportPasswordReset() {
  return useUserSupportMutation(({ id, reason }: { id: string; reason: string }) =>
    api.post(`/platform-admin/users/${id}/support/password-reset`, { reason })
  );
}

export function useSupportEmailChange() {
  return useUserSupportMutation(({ id, email, reason }: { id: string; email: string; reason: string }) =>
    api.post(`/platform-admin/users/${id}/support/email-change`, { email, reason })
  );
}

export function useSupportTwoFactorReset() {
  return useUserSupportMutation(({ id, reason }: { id: string; reason: string }) =>
    api.post(`/platform-admin/users/${id}/support/reset-two-factor`, { reason })
  );
}

export function useDeletePlatformUser() {
  return useUserSupportMutation(({ id, confirmationEmail, reason }: { id: string; confirmationEmail: string; reason: string }) =>
    api.delete(`/platform-admin/users/${id}`, { confirmationEmail, reason } as any)
  );
}

export function usePlatformTenants() {
  return useQuery({ queryKey: ["platformTenants"], queryFn: () => api.get("/platform-admin/tenants").then((d) => d.tenants) });
}

export function usePlatformBillingStats() {
  return useQuery({ queryKey: ["platformBillingStats"], queryFn: () => api.get("/platform-admin/billing") });
}

export function usePlatformAnalytics() {
  return useQuery({ queryKey: ["platformAnalytics"], queryFn: () => api.get("/platform-admin/analytics") });
}

export function useRandomQuote() {
  return useQuery({
    queryKey: ["randomQuote"],
    queryFn: () => api.get("/quote/random"),
    enabled: false, // only fetch when you click refresh
  });
}

function normalizeStatus(status: string): TaskStatus {
  const map: Record<string, TaskStatus> = {
    TODO: "todo",
    IN_PROGRESS: "in_progress",
    DONE: "done",
    todo: "todo",
    in_progress: "in_progress",
    done: "done",
  };
  return map[status] ?? "todo";
}

function normalizeTask(t: any): Task {
  return {
    ...t,
    status: normalizeStatus(t.status),
    subtasks: t.subtasks ?? [],
    tags: t.tags ?? [],
  };
}

// ─── Tasks ────────────────────────────────────────────────────────────────────

export function useTasks() {
  return useQuery<Task[]>({
    queryKey: ["tasks"],
    queryFn: () => api.get("/tasks").then((d) => (d.tasks as any[]).map(normalizeTask)),
  });
}

export function useTask(id: string) {
  return useQuery<Task>({
    queryKey: ["task", id],
    queryFn: () => api.get(`/tasks/${id}`).then((d) => normalizeTask(d.task)),
    enabled: !!id,
  });
}

// keep this near your Task hooks

function denormalizeStatus(status: TaskStatus): string {
  const map: Record<TaskStatus, string> = {
    todo: "TODO",
    in_progress: "IN_PROGRESS",
    done: "DONE",
  };
  return map[status];
}

export function useUpdateTaskStatus() {
  const qc = useQueryClient();
  return useMutation({
    // mutationFn receives payload { id, status } for consistency
    mutationFn: (payload: { id: string; status: TaskStatus }) =>
      api.patch(`/tasks/${payload.id}`, { status: denormalizeStatus(payload.status) }),
    onMutate: async (payload) => {
      await qc.cancelQueries({ queryKey: ["tasks"] });

      const prev = qc.getQueryData<Task[]>(["tasks"]);
      if (prev) {
        qc.setQueryData<Task[]>(["tasks"], (old) =>
          old?.map((t) =>
            t.id === payload.id ? { ...t, status: payload.status } : t
          ) ?? []
        );
      }

      return { prev };
    },
    onError: (err, payload, ctx) => {
      if (ctx?.prev) {
        qc.setQueryData<Task[]>(["tasks"], ctx.prev);
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      qc.invalidateQueries({ queryKey: ["todayOverview"] });
    },
  });
}

export function useCreateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Task>) =>
      api.post("/tasks", data).then((d) => normalizeTask(d.task)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      qc.invalidateQueries({ queryKey: ["todayOverview"] });
    },
  });
}

export function useUpdateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Task> }) =>
      api.patch(`/tasks/${id}`, {
        ...data,
        ...(data.status && { status: denormalizeStatus(data.status) }),
      }).then((d) => normalizeTask(d.task)),
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      qc.invalidateQueries({ queryKey: ["task", id] });
    },
  });
}

export function useDeleteTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/tasks/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
  });
}

export function useUpdateSubtask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, subtaskId, completed }: {
      taskId: string;
      subtaskId: string;
      completed: boolean;
    }) => api.patch(`/tasks/${taskId}/subtasks/${subtaskId}`, { completed }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
  });
}

export function useConvertTaskToNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (taskId: string) =>
      api.post(`/tasks/${taskId}/convert-to-note`).then((d) => d.note),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      qc.invalidateQueries({ queryKey: ["notes"] });
    },
  });
}

// ─── Notes ────────────────────────────────────────────────────────────────────

export function useNotes() {
  return useQuery<Note[]>({
    queryKey: ["notes"],
    queryFn: () => api.get("/notes").then((d) => d.notes),
  });
}

export function useNote(id: string) {
  return useQuery<Note>({
    queryKey: ["note", id],
    queryFn: () => api.get(`/notes/${id}`).then((d) => d.note),
    enabled: !!id,
  });
}

export function useCreateNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { title: string; content: string; folder: string }) =>
      api.post("/notes", data).then((d) => d.note as Note),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notes"] }),
  });
}

export function useUpdateNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Note> }) =>
      api.patch(`/notes/${id}`, data).then((d) => d.note as Note),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notes"] }),
  });
}

export function useDeleteNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/notes/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notes"] }),
  });
}

export function useConvertNoteToTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (noteId: string) =>
      api.post(`/notes/${noteId}/convert-to-task`).then((d) => normalizeTask(d.task)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notes"] });
      qc.invalidateQueries({ queryKey: ["tasks"] });
    },
  });
}

// ─── Health ───────────────────────────────────────────────────────────────────

export function useHealthSummary() {
  return useQuery<HealthSummary>({
    queryKey: ["health"],
    queryFn: () => api.get("/health/summary"),
    staleTime: 1000 * 60 * 2,
  });
}

export function useLogHealth() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      date?: string;
      sleepHours?: number;
      steps?: number;
      waterGlasses?: number;
      workoutDone?: boolean;
      notes?: string;
    }) => api.post("/health/log", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["health"] }),
  });
}

export function useHabits() {
  return useQuery({
    queryKey: ["habits-list"],
    queryFn: () => api.get("/health/habits").then((d) => d.habits),
  });
}

export function useCompleteHabit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (habitId: string) =>
      api.post(`/health/habits/${habitId}/complete`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["health"] }),
  });
}


// ─── Finance ──────────────────────────────────────────────────────────────────

export function useFinanceSummary() {
  return useQuery<{ summary: FinanceSummary; transactions: Transaction[] }>({
    queryKey: ["finance"],
    queryFn: () =>
      api.get("/finance/dashboard").then((d) => ({
        summary: d.summary as FinanceSummary,
        transactions: d.transactions as Transaction[],
      })),
    staleTime: 1000 * 60 * 2,
  });
}

export function useFinanceAccounts() {
  return useQuery({
    queryKey: ["financeAccounts"],
    queryFn: () => api.get("/finance/accounts").then((d) => d.accounts),
  });
}

export function useFinanceCategories() {
  return useQuery({
    queryKey: ["financeCategories"],
    queryFn: () => api.get("/finance/categories").then((d) => d.categories),
  });
}

export function useCreateFinanceTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      accountId?: string;
      categoryId?: string;
      type: "INCOME" | "EXPENSE" | "TRANSFER";
      amount: number;
      description: string;
      date?: string;
      isRecurring?: boolean;
      linkedTaskId?: string;
      linkedNoteId?: string;
    }) => api.post("/finance/transactions", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["finance"] });
      qc.invalidateQueries({ queryKey: ["financeAccounts"] });
    },
  });
}

export function useUpdateFinanceTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Transaction> }) =>
      api.patch(`/finance/transactions/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["finance"] });
    },
  });
}

export function useDeleteFinanceTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/finance/transactions/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["finance"] });
    },
  });
}

// ─── AI ASSISTANTS ────────────────────────────────────────────────────────────────

export function useAIContext() {
  return useQuery({ queryKey: ["aiContext"], queryFn: () => api.get("/ai-assistant/context") });
}

export function useAIAssistantChat() {
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function sendMessage(message: string, onDelta: (chunk: string) => void) {
    setIsStreaming(true);
    setError(null);
    try {
      const reader = await streamPost("/ai-assistant/chat", { message });
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        onDelta(decoder.decode(value, { stream: true }));
      }
    } catch (err: any) {
      setError(err.message ?? "Failed to reach the assistant");
    } finally {
      setIsStreaming(false);
    }
  }

  return { sendMessage, isStreaming, error };
}


// ─── DOCUMENTS ────────────────────────────────────────────────────────────────

export function useDocumentsDashboard() {
  return useQuery({
    queryKey: ["documentsDashboard"],
    queryFn: () =>
      api.get("/documents/dashboard").then((d) => d as {
        stats: {
          totalDocuments: number;
          activeDocuments: number;
          archivedDocuments: number;
          expiredDocuments: number;
          expiringSoon: number;
        };
        folders: any[];
        documents: VaultDocument[];
        insight: string;
      }),
    staleTime: 1000 * 60 * 2,
  });
}

export function useDocuments() {
  const { data, ...rest } = useDocumentsDashboard();
  return {
    documents: data?.documents ?? [],
    folders: data?.folders ?? [],
    stats: data?.stats,
    ...rest,
  };
}

export function useCreateDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      folderId?: string;
      title: string;
      category:
        | "IDENTITY"
        | "LEGAL"
        | "EDUCATION"
        | "FINANCE"
        | "HEALTH"
        | "WORK"
        | "PERSONAL"
        | "OTHER";
      fileUrl?: string;
      fileName?: string;
      fileType?: string;
      fileSize?: number;
      tags?: string[];
      summary?: string;
      expiresAt?: string;
      linkedNoteId?: string;
      linkedTaskId?: string;
    }) => api.post("/documents", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["documentsDashboard"] });
    },
  });
}

export function useUpdateDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      api.patch(`/documents/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["documentsDashboard"] });
    },
  });
}

export function useDeleteDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/documents/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["documentsDashboard"] });
    },
  });
}

export function useUploadDocumentFile() {
  return useMutation({
    mutationFn: (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      return api.upload("/documents/upload", formData) as Promise<{
        fileUrl: string;
        fileName: string;
        fileType: string;
        fileSize: number;
      }>;
    },
  });
}

// ─── Study ────────────────────────────────────────────────────────────────────

export function useStudyDashboard(range: "today" | "week" | "month" = "month") {
  return useQuery({
    queryKey: ["studyDashboard", range],
    queryFn: () =>
      api
        .get(`/study/dashboard?range=${range}`)
        .then((d) => d as {
          stats: any;
          subjects: any[];
          materials: StudyMaterial[];
          recentSessions: any[];
          insight: string;
        }),
    staleTime: 1000 * 60 * 2,
  });
}

export function useStudySubjects() {
  return useQuery({
    queryKey: ["studySubjects"],
    queryFn: () => api.get("/study/subjects").then((d) => d.subjects),
  });
}

export function useStudyMaterials() {
  return useQuery<StudyMaterial[]>({
    queryKey: ["studyMaterials"],
    queryFn: () => api.get("/study/materials").then((d) => d.materials as StudyMaterial[]),
    staleTime: 1000 * 60 * 5,
  });
}

export function useCreateStudySubject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; color?: string; description?: string }) =>
      api.post("/study/subjects", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["studySubjects"] });
      qc.invalidateQueries({ queryKey: ["studyDashboard"] });
    },
  });
}

export function useCreateStudyMaterial() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      subjectId?: string;
      title: string;
      type: string;
      url?: string;
      notes?: string;
      targetDate?: string;
    }) => api.post("/study/materials", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["studyMaterials"] });
      qc.invalidateQueries({ queryKey: ["studyDashboard"] });
    },
  });
}

export function useUpdateStudyMaterial() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: {
      id: string;
      data: {
        title?: string;
        type?: string;
        subjectId?: string;
        url?: string;
        fileName?: string;
        fileType?: string;
        fileSize?: number;
        notes?: string;
        status?: "PLANNED" | "IN_PROGRESS" | "COMPLETED" | "ON_HOLD";
        progress?: number;
      };
    }) => api.patch(`/study/materials/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["studyMaterials"] });
      qc.invalidateQueries({ queryKey: ["studyDashboard"] });
    },
  });
}

export function useCreateStudySession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      subjectId?: string;
      materialId?: string;
      title: string;
      startedAt?: string;
      notes?: string;
    }) => api.post("/study/sessions", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["studyDashboard"] });
    },
  });
}

export function useEndStudySession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { endedAt?: string; notes?: string } }) =>
      api.patch(`/study/sessions/${id}/end`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["studyDashboard"] });
    },
  });
}

export function useUploadStudyMaterialFile() {
  return useMutation({
    mutationFn: (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      return api.upload("/study/materials/upload", formData) as Promise<{
        url: string;
        fileName: string;
        fileType: string;
        fileSize: number;
      }>;
    },
  });
}

export function useDeleteStudyMaterial() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/study/materials/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["studyMaterials"] });
      qc.invalidateQueries({ queryKey: ["studyDashboard"] });
    },
  });
}

// ─── Career ───────────────────────────────────────────────────────────────────

export function useCareerDashboard() {
  return useQuery({ queryKey: ["careerDashboard"], queryFn: () => api.get("/career/dashboard"), staleTime: 1000 * 60 * 2 });
}

export function useCreateCareerGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { title: string; area: string; targetDate?: string; notes?: string }) => api.post("/career/goals", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["careerDashboard"] }),
  });
}

export function useUpdateCareerGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => api.patch(`/career/goals/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["careerDashboard"] }),
  });
}

export function useDeleteCareerGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/career/goals/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["careerDashboard"] }),
  });
}

export function useCreateSkill() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => api.post("/career/skills", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["careerDashboard"] }),
  });
}

export function useUpdateSkill() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => api.patch(`/career/skills/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["careerDashboard"] }),
  });
}

export function useDeleteSkill() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/career/skills/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["careerDashboard"] }),
  });
}

export function useCreateAchievement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => api.post("/career/achievements", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["careerDashboard"] }),
  });
}

export function useDeleteAchievement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/career/achievements/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["careerDashboard"] }),
  });
}

// ─── Password Vault ───────────────────────────────────────────────────────────

export function useVaultDashboard() {
  return useQuery({ queryKey: ["vaultDashboard"], queryFn: () => api.get("/vault/dashboard"), staleTime: 1000 * 60 });
}

export function useRevealVaultItem() {
  return useMutation({ mutationFn: (id: string) => api.get(`/vault/items/${id}/reveal`).then((d) => d.item) });
}

export function useCreateVaultItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => api.post("/vault/items", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["vaultDashboard"] }),
  });
}

export function useUpdateVaultItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => api.patch(`/vault/items/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["vaultDashboard"] }),
  });
}

export function useDeleteVaultItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/vault/items/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["vaultDashboard"] }),
  });
}

// ─── Family ───────────────────────────────────────────────────────────────────

export function useFamilyDashboard() {
  return useQuery({ queryKey: ["familyDashboard"], queryFn: () => api.get("/family/dashboard"), staleTime: 1000 * 60 });
}

export function useCreateFamilyMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => api.post("/family/members", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["familyDashboard"] }),
  });
}

export function useUpdateFamilyMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => api.patch(`/family/members/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["familyDashboard"] }),
  });
}

export function useDeleteFamilyMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/family/members/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["familyDashboard"] }),
  });
}

export function useCreateFamilyControl() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => api.post("/family/controls", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["familyDashboard"] }),
  });
}

export function useUpdateFamilyControl() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => api.patch(`/family/controls/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["familyDashboard"] }),
  });
}

export function useDeleteFamilyControl() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/family/controls/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["familyDashboard"] }),
  });
}

export function useCreateFamilyInvite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { email: string; role: string }) => api.post("/family/invites", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["familyDashboard"] }),
  });
}

export function useRevokeFamilyInvite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/family/invites/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["familyDashboard"] }),
  });
}

export function useFamilyInviteByToken(token: string | null) {
  return useQuery({
    queryKey: ["familyInvite", token],
    queryFn: () => api.get(`/family/invites/${token}`).then((d) => d.invite),
    enabled: !!token,
    retry: false,
  });
}

export function useAcceptFamilyInvite() {
  return useMutation({
    mutationFn: (data: { token: string; name: string }) => api.post("/family/invites/accept", data),
  });
}

export function useCalendarEvents(range?: "today" | "week" | "month") {
  return useQuery({
    queryKey: ["calendarEvents", range],
    queryFn: () => api.get(`/calendar${range ? `?range=${range}` : ""}`).then((d) => d.events),
  });
}
export function useCreateCalendarEvent() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (data: any) => api.post("/calendar", data), onSuccess: () => qc.invalidateQueries({ queryKey: ["calendarEvents"] }) });
}
export function useUpdateCalendarEvent() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: ({ id, data }: { id: string; data: any }) => api.patch(`/calendar/${id}`, data), onSuccess: () => qc.invalidateQueries({ queryKey: ["calendarEvents"] }) });
}
export function useDeleteCalendarEvent() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (id: string) => api.delete(`/calendar/${id}`), onSuccess: () => qc.invalidateQueries({ queryKey: ["calendarEvents"] }) });
}

export function useGoals() {
  return useQuery({ queryKey: ["goals"], queryFn: () => api.get("/goals").then((d) => d.goals) });
}
export function useCreateGoal() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (data: any) => api.post("/goals", data), onSuccess: () => qc.invalidateQueries({ queryKey: ["goals"] }) });
}
export function useUpdateGoal() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: ({ id, data }: { id: string; data: any }) => api.patch(`/goals/${id}`, data), onSuccess: () => qc.invalidateQueries({ queryKey: ["goals"] }) });
}
export function useDeleteGoal() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (id: string) => api.delete(`/goals/${id}`), onSuccess: () => qc.invalidateQueries({ queryKey: ["goals"] }) });
}

export function useFocusSuggestions() {
  return useQuery({ queryKey: ["focusSuggestions"], queryFn: () => api.get("/ai-assistant/focus-suggestions").then((d) => d.suggestions) });
}

export function useUser() {
  return useUserProfile();
}

export function useSearch(query: string) {
  const { data: tasks = [] } = useTasks();
  const { data: notes = [] } = useNotes();
  const q = query.trim().toLowerCase();

  const results = useMemo(() => {
    if (!q) return [];
    const out: any[] = [];
    const pages = [
      { title: "Dashboard", href: "/app/dashboard" }, { title: "Tasks", href: "/app/tasks" },
      { title: "Notes", href: "/app/notes" }, { title: "Finance", href: "/app/finance" },
      { title: "Calendar", href: "/app/calendar" }, { title: "Goals", href: "/app/goals" },
      { title: "AI Assistant", href: "/app/ai" }, { title: "Settings", href: "/app/settings" },
    ];
    pages.forEach((p) => { if (p.title.toLowerCase().includes(q)) out.push({ id: `page-${p.href}`, type: "page", title: p.title, href: p.href }); });
    (tasks as any[]).forEach((t) => { if (t.title.toLowerCase().includes(q)) out.push({ id: t.id, type: "task", title: t.title, subtitle: `${t.priority} · ${t.status}`, href: `/app/tasks?highlight=${t.id}` }); });
    (notes as any[]).forEach((n) => { if (n.title.toLowerCase().includes(q) || n.content?.toLowerCase().includes(q)) out.push({ id: n.id, type: "note", title: n.title, subtitle: n.folder, href: `/app/notes?highlight=${n.id}` }); });
    return out.slice(0, 10);
  }, [q, tasks, notes]);

  return { data: results, isLoading: false };
}

// ------ BUSINESS DATA--------------

type Range = "today" | "week" | "month";

// ─── Dashboard ────────────────────────────────────────────────────────────
 
export function useBusinessDashboard(range: Range = "today") {
  return useQuery<SmallBusinessSummary>({
    queryKey: ["businessDashboard", range],
    queryFn: () => api.get(`/business/dashboard?range=${range}`),
    staleTime: 1000 * 30,
  });
}
 
// ─── Products ─────────────────────────────────────────────────────────────
 
export function useBizProducts(activeOnly = true) {
  return useQuery<BizProduct[]>({
    queryKey: ["bizProducts", activeOnly],
    queryFn: () =>
      api.get(`/business/products?active=${activeOnly}`).then((d) => d.products as BizProduct[]),
  });
}
 
export function useCreateBizProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<BizProduct>) => api.post("/business/products", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bizProducts"] });
      qc.invalidateQueries({ queryKey: ["businessDashboard"] });
    },
  });
}
 
export function useUpdateBizProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<BizProduct> }) =>
      api.patch(`/business/products/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bizProducts"] });
      qc.invalidateQueries({ queryKey: ["businessDashboard"] });
    },
  });
}
 
export function useDeleteBizProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/business/products/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bizProducts"] });
      qc.invalidateQueries({ queryKey: ["businessDashboard"] });
    },
  });
}
 
// ─── Customers ────────────────────────────────────────────────────────────
 
export function useBizCustomers() {
  return useQuery<BizCustomer[]>({
    queryKey: ["bizCustomers"],
    queryFn: () => api.get("/business/customers").then((d) => d.customers as BizCustomer[]),
  });
}
 
export function useCreateBizCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; phone?: string; email?: string; notes?: string }) =>
      api.post("/business/customers", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bizCustomers"] }),
  });
}
 
// ─── Sales (POS checkout) ───────────────────────────────────────────────

export function useBizSales(range: Range = "month") {
  return useQuery<BizSale[]>({
    queryKey: ["bizSales", range],
    queryFn: () => api.get(`/business/sales?range=${range}`).then((d) => d.sales as BizSale[]),
  });
}
 
export function useCreateBizSale() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      customerId?: string;
      items: { productId?: string; name: string; quantity: number; unitPrice: number }[];
      discount?: number;
      paymentMethod?: string;
      status?: string;
      note?: string;
    }) => api.post("/business/sales", data).then((d) => d.sale as BizSale),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bizSales"] });
      qc.invalidateQueries({ queryKey: ["bizProducts"] });
      qc.invalidateQueries({ queryKey: ["bizCustomers"] });
      qc.invalidateQueries({ queryKey: ["businessDashboard"] });
    },
  });
}
 
export function useUpdateBizSaleStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.patch(`/business/sales/${id}/status`, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bizSales"] });
      qc.invalidateQueries({ queryKey: ["businessDashboard"] });
    },
  });
}
 
// ─── Expenses ─────────────────────────────────────────────────────────────
 
export function useBizExpenses(range: Range = "month") {
  return useQuery<BizExpense[]>({
    queryKey: ["bizExpenses", range],
    queryFn: () => api.get(`/business/expenses?range=${range}`).then((d) => d.expenses as BizExpense[]),
  });
}
 
export function useCreateBizExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { title: string; category?: string; amount: number; date?: string; note?: string }) =>
      api.post("/business/expenses", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bizExpenses"] });
      qc.invalidateQueries({ queryKey: ["businessDashboard"] });
    },
  });
}
 
export function useDeleteBizExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/business/expenses/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bizExpenses"] });
      qc.invalidateQueries({ queryKey: ["businessDashboard"] });
    },
  });
}
 
// ─── Profile ──────────────────────────────────────────────────────────────
 
export function useBizProfile() {
  return useQuery({
    queryKey: ["bizProfile"],
    queryFn: () => api.get("/business/profile").then((d) => d.profile),
  });
}
 
export function useUpdateBizProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { businessName?: string; currency?: string; logoUrl?: string }) =>
      api.patch("/business/profile", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bizProfile"] });
      qc.invalidateQueries({ queryKey: ["businessDashboard"] });
    },
  });
}

// -----------Biz Maerchant section------------------------
export function useMerchantStatus() {
  return useQuery({ queryKey: ["merchantStatus"], queryFn: () => api.get("/merchant/status") });
}

export function useApplyMerchant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => api.post("/merchant/apply", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["merchantStatus"] }),
  });
}

export function useMerchantApplications(status?: string) {
  return useQuery({
    queryKey: ["merchantApplications", status],
    queryFn: () => api.get(`/merchant/applications${status ? `?status=${status}` : ""}`).then((d) => d.applications),
  });
}

export function useMerchantApplicationDetail(id: string | null) {
  return useQuery({
    queryKey: ["merchantApplicationDetail", id],
    queryFn: () => api.get(`/merchant/applications/${id}`).then((d) => d.detail),
    enabled: !!id,
  });
}

export function useChangeMerchantStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, action, rejectionReason }: {
      id: string; action: "APPROVE" | "REJECT" | "SUSPEND" | "REACTIVATE"; rejectionReason?: string;
    }) => api.patch(`/merchant/applications/${id}`, { action, rejectionReason }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["merchantApplications"] }),
  });
}

export function useUploadMerchantId() {
  return useMutation({
    mutationFn: (file: File) => {
      const fd = new FormData();
      fd.append("file", file);
      return api.upload("/merchant/id-upload", fd) as Promise<{ url: string }>;
    },
  });
}

export function useMerchantCheckout() {
  return useMutation({
    mutationFn: ({ plan, interval }: { plan: "STARTER" | "GROWTH" | "PRO"; interval: "month" | "year" }) =>
      api.post("/merchant/checkout", { plan, interval }).then((d) => d.url as string),
  });
}

export function useMerchantBillingPortal() {
  return useMutation({ mutationFn: () => api.post("/merchant/billing-portal").then((d) => d.url as string) });
}

export function useVerifyMerchantId() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.patch(`/merchant/applications/${id}/verify-id`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["merchantApplicationDetail"] }),
  });
}

// ─── Staff ────────────────────────────────────────────────────────────────

export function useMerchantStaff() {
  return useQuery({ queryKey: ["merchantStaff"], queryFn: () => api.get("/merchant/staff").then((d) => d.staff) });
}

export function useCreateStaff() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => api.post("/merchant/staff", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["merchantStaff"] }),
  });
}

export function useUpdateStaff() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => api.patch(`/merchant/staff/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["merchantStaff"] }),
  });
}

export function useDeleteStaff() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/merchant/staff/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["merchantStaff"] }),
  });
}

export function useStaffClockIn() {
  return useMutation({
    mutationFn: (data: { staffId: string; pin: string }) => api.post("/merchant/staff/clock-in", data).then((d) => d.staff),
  });
}

export function useLogStaffActivity() {
  return useMutation({
    mutationFn: ({ staffId, ...data }: { staffId: string; action: string; description: string; metadata?: any }) =>
      api.post(`/merchant/staff/${staffId}/activity`, data),
  });
}

export function useStaffActivityLog(staffId?: string) {
  return useQuery({
    queryKey: ["staffActivity", staffId],
    queryFn: () => api.get(`/merchant/staff/activity${staffId ? `?staffId=${staffId}` : ""}`).then((d) => d.activity),
  });
}

export function useBusinessProfile() {
  return useQuery({ queryKey: ["businessProfile"], queryFn: () => api.get("/business/profile").then((d) => d.profile) });
}
export function useUpdateBusinessProfile() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (data: any) => api.patch("/business/profile", data), onSuccess: () => qc.invalidateQueries({ queryKey: ["businessProfile"] }) });
}
export function useBusinessProducts(active?: boolean) {
  return useQuery({ queryKey: ["businessProducts", active], queryFn: () => api.get(`/business/products${active !== undefined ? `?active=${active}` : ""}`).then((d) => d.products) });
}
export function useCreateProduct() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (data: any) => api.post("/business/products", data), onSuccess: () => qc.invalidateQueries({ queryKey: ["businessProducts"] }) });
}
export function useUpdateProduct() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: ({ id, data }: { id: string; data: any }) => api.patch(`/business/products/${id}`, data), onSuccess: () => qc.invalidateQueries({ queryKey: ["businessProducts"] }) });
}
export function useDeleteProduct() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (id: string) => api.delete(`/business/products/${id}`), onSuccess: () => qc.invalidateQueries({ queryKey: ["businessProducts"] }) });
}

export function useBusinessProductsPaged(page: number, pageSize = 20, search?: string) {
  const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
  if (search) params.set("search", search);
  return useQuery({
    queryKey: ["businessProductsPaged", page, pageSize, search],
    queryFn: () => api.get(`/business/products/paged?${params.toString()}`),
    placeholderData: (prev: any) => prev,
  });
}

export function useBusinessCustomers() {
  return useQuery({ queryKey: ["businessCustomers"], queryFn: () => api.get("/business/customers").then((d) => d.customers) });
}
export function useCreateCustomer() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (data: any) => api.post("/business/customers", data), onSuccess: () => qc.invalidateQueries({ queryKey: ["businessCustomers"] }) });
}
export function useBusinessSales(range: "today" | "week" | "month" = "month") {
  return useQuery({ queryKey: ["businessSales", range], queryFn: () => api.get(`/business/sales?range=${range}`).then((d) => d.sales) });
}
export function useCreateSale() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => api.post("/business/sales", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["businessSales"] });
      qc.invalidateQueries({ queryKey: ["businessProducts"] });
    },
  });
}
export function useBusinessExpenses(range: "today" | "week" | "month" = "month") {
  return useQuery({ queryKey: ["businessExpenses", range], queryFn: () => api.get(`/business/expenses?range=${range}`).then((d) => d.expenses) });
}
export function useCreateExpense() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (data: any) => api.post("/business/expenses", data), onSuccess: () => qc.invalidateQueries({ queryKey: ["businessExpenses"] }) });
}
export function useDeleteExpense() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (id: string) => api.delete(`/business/expenses/${id}`), onSuccess: () => qc.invalidateQueries({ queryKey: ["businessExpenses"] }) });
}
export function useMerchantStaffLoginCode() {
  return useQuery({ queryKey: ["merchantStaffLoginCode"], queryFn: () => api.get("/merchant/staff-login-code").then((d) => d.storeCode) });
}

export function useRegenerateStoreCode() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post("/merchant/staff-login-code/regenerate").then((d) => d.storeCode as string),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["merchantStaffLoginCode"] }),
  });
}
export function useForceStaffLogout() {
  return useMutation({ mutationFn: () => api.post("/merchant/staff/force-logout") });
}
export function useUpdateNotificationSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => api.patch("/merchant/notifications", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["businessProfile"] }),
  });
}
export function useSetStorePaused() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (paused: boolean) => api.patch("/merchant/pause", { paused }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["businessProfile"] }),
  });
}

export function useUploadAccountAvatar() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => {
      const fd = new FormData();
      fd.append("avatar", file); // must match multer's upload.single("avatar")
      return api.upload("/users/me/avatar", fd).then((d) => d.user);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["userProfile"] });
      qc.invalidateQueries({ queryKey: ["me"] });
    },
  });
}

export function useChangeAccountPassword() {
  return useMutation({
    mutationFn: (data: { currentPassword: string; newPassword: string }) =>
      api.post("/users/me/password", data),
  });
}


// ---------------- SETTINGS DATA --------------------------

export function useUserProfile() {
  return useQuery<UserProfile>({
    queryKey: ["userProfile"],
    queryFn: () => api.get("/settings/profile").then((d) => d.user as UserProfile),
    staleTime: 1000 * 60,
  });
}

export function useUpdateUserProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name?: string; avatarUrl?: string; timezone?: string; location?: string; currency?: string }) =>
      api.patch("/settings/profile", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["userProfile"] }),
  });
}

export function useUpdatePreferences() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { darkMode?: boolean; weekStartsOn?: number }) =>
      api.patch("/settings/preferences", data),
    // Optimistic update so the dark-mode toggle feels instant
    onMutate: async (data) => {
      await qc.cancelQueries({ queryKey: ["userProfile"] });
      const prev = qc.getQueryData<UserProfile>(["userProfile"]);
      if (prev) {
        qc.setQueryData<UserProfile>(["userProfile"], {
          ...prev,
          preferences: { ...prev.preferences, ...data },
        });
      }
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(["userProfile"], ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["userProfile"] }),
  });
}

export function useUpdateNotifications() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { notifyTasks?: boolean; notifyCalendar?: boolean; notifyFinance?: boolean }) =>
      api.patch("/settings/notifications", data),
    onMutate: async (data) => {
      await qc.cancelQueries({ queryKey: ["userProfile"] });
      const prev = qc.getQueryData<UserProfile>(["userProfile"]);
      if (prev) {
        qc.setQueryData<UserProfile>(["userProfile"], {
          ...prev,
          notifications: { ...prev.notifications, ...data },
        });
      }
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(["userProfile"], ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["userProfile"] }),
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: (data: { currentPassword: string; newPassword: string }) =>
      api.post("/settings/change-password", data),
  });
}

export function useAccountOverview() {
  return useQuery<AccountOverview>({
    queryKey: ["accountOverview"],
    queryFn: () => api.get("/settings/overview"),
    staleTime: 1000 * 60,
  });
}

export function useDeactivateAccount() {
  return useMutation({
    mutationFn: () => api.post("/settings/deactivate"),
  });
}

// --------------HABIT DATA ---------------------------
export function useHabitSummary() {
  return useQuery<HabitSummary>({
    queryKey: ["habitSummary"],
    queryFn: () => api.get("/health/habits/summary"),
    staleTime: 1000 * 30,
  });
}
 
export function useHabitsList(includeArchived = false) {
  return useQuery<Habit[]>({
    queryKey: ["habitsList", includeArchived],
    queryFn: () =>
      api.get(`/health/habits?archived=${includeArchived}`).then((d) => d.habits as Habit[]),
  });
}
 
export function useCreateHabit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      title: string;
      description?: string;
      frequency?: "daily" | "weekly";
      category?: string;
      colorHex?: string;
    }) => api.post("/health/habits", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["habitSummary"] });
      qc.invalidateQueries({ queryKey: ["habitsList"] });
    },
  });
}
 
export function useUpdateHabit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Habit> }) =>
      api.patch(`/health/habits/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["habitSummary"] });
      qc.invalidateQueries({ queryKey: ["habitsList"] });
    },
  });
}
 
export function useDeleteHabit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/health/habits/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["habitSummary"] });
      qc.invalidateQueries({ queryKey: ["habitsList"] });
    },
  });
}
 
export function useToggleHabitCompletion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (habitId: string) => api.post(`/health/habits/${habitId}/complete`),
    onMutate: async (habitId) => {
      await qc.cancelQueries({ queryKey: ["habitSummary"] });
      const prev = qc.getQueryData<HabitSummary>(["habitSummary"]);
      if (prev) {
        const habits = prev.habits.map((h) =>
          h.id === habitId
            ? {
                ...h,
                completedToday: !h.completedToday,
                streak: h.completedToday ? Math.max(0, h.streak - 1) : h.streak + 1,
              }
            : h
        );
        qc.setQueryData<HabitSummary>(["habitSummary"], {
          ...prev,
          habits,
          completionRateToday: Math.round(
            (habits.filter((h) => h.completedToday).length / Math.max(1, habits.length)) * 100
          ),
        });
      }
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(["habitSummary"], ctx.prev);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["habitSummary"] });
      qc.invalidateQueries({ queryKey: ["habitsList"] });
    },
  });
}

// ─── AI Writing ───────────────────────────────────────────────────────────

export function useStreamWriting() {
  const [output, setOutput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate(payload: { mode: string; input: string; tone?: string; targetLanguage?: string }) {
    setOutput(""); setError(null); setIsStreaming(true);
    try {
      const reader = await streamPost("/ai/writing/stream", payload);
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        setOutput((prev) => prev + decoder.decode(value, { stream: true }));
      }
    } catch (err: any) {
      setError(err.message ?? "Failed to generate");
    } finally {
      setIsStreaming(false);
    }
  }

  return { output, isStreaming, error, generate, reset: () => setOutput("") };
}

export function useWritingDocuments() {
  return useQuery({ queryKey: ["writingDocuments"], queryFn: () => api.get("/ai/writing/documents").then((d) => d.documents) });
}

export function useSaveWritingDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => api.post("/ai/writing/documents", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["writingDocuments"] }),
  });
}

export function useDeleteWritingDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/ai/writing/documents/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["writingDocuments"] }),
  });
}

export function useConvertWritingToNote() {
  return useMutation({ mutationFn: (id: string) => api.post(`/ai/writing/documents/${id}/convert-to-note`) });
}

// ─── AI Image Tools ───────────────────────────────────────────────────────

export function useUploadImageForTools() {
  return useMutation({
    mutationFn: (file: File) => {
      const fd = new FormData();
      fd.append("file", file);
      return api.upload("/image-tools/upload", fd) as Promise<{ publicId: string; url: string; width: number; height: number }>;
    },
  });
}

export function useApplyImageTool() {
  return useMutation({
    mutationFn: (data: { publicId: string; tool: string; format?: string }) =>
      api.post("/image-tools/apply", data) as Promise<{ url: string }>,
  });
}

export function useConvertImageFormat() {
  return useMutation({
    mutationFn: (data: { publicId: string; format: string; quality?: string }) =>
      api.post("/image-tools/convert", data) as Promise<{ url: string }>,
  });
}

export function useGenerativeImageEdit() {
  return useMutation({
    mutationFn: (data: { publicId: string; prompt: string; mode: "remove" | "fill" }) =>
      api.post("/image-tools/generative", data) as Promise<{ url: string }>,
  });
}

// ─── File Converter ───────────────────────────────────────────────────────

export function useConvertText() {
  return useMutation({
    mutationFn: (data: { content: string; from: string; to: string }) =>
      api.post("/converter/text", data).then((d) => d.result as string),
  });
}

export function useExtractPdfText() {
  return useMutation({
    mutationFn: (file: File) => {
      const fd = new FormData();
      fd.append("file", file);
      return api.upload("/converter/pdf-text", fd) as Promise<{ text: string; pages: number }>;
    },
  });
}

export function useExtractDocxText() {
  return useMutation({
    mutationFn: (file: File) => {
      const fd = new FormData();
      fd.append("file", file);
      return api.upload("/converter/docx-text", fd) as Promise<{ text: string }>;
    },
  });
}

export function useConvertGenericFile() {
  return useMutation({
    mutationFn: ({ file, targetFormat }: { file: File; targetFormat: string }) => {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("targetFormat", targetFormat);
      return api.upload("/converter/file", fd) as Promise<{ url: string; filename: string }>;
    },
  });
}

// ─── Global Utilities ─────────────────────────────────────────────────────

export function useExchangeRates(base: string) {
  return useQuery({
    queryKey: ["exchangeRates", base],
    queryFn: () => api.get(`/utilities/exchange-rates?base=${base}`),
    staleTime: 1000 * 60 * 30,
  });
}

export function useTranslateText() {
  return useMutation({
    mutationFn: (data: { text: string; targetLanguage: string }) =>
      api.post("/utilities/translate", data).then((d) => d.translated as string),
  });
}

// ─── Emergency Vault ──────────────────────────────────────────────────────

export function useEmergencyProfile() {
  return useQuery({ queryKey: ["emergencyProfile"], queryFn: () => api.get("/emergency/profile").then((d) => d.profile) });
}

export function useUpdateEmergencyProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => api.patch("/emergency/profile", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["emergencyProfile"] }),
  });
}

export function useAddEmergencyContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => api.post("/emergency/contacts", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["emergencyProfile"] }),
  });
}

export function useUpdateEmergencyContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => api.patch(`/emergency/contacts/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["emergencyProfile"] }),
  });
}

export function useDeleteEmergencyContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/emergency/contacts/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["emergencyProfile"] }),
  });
}

export function useEnableEmergencyShare() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (expiresInDays?: number) => api.post("/emergency/share/enable", { expiresInDays }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["emergencyProfile"] }),
  });
}

export function useDisableEmergencyShare() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post("/emergency/share/disable"),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["emergencyProfile"] }),
  });
}

export function useSetEmergencyPin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (pin: string | null) => api.post("/emergency/share/pin", { pin }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["emergencyProfile"] }),
  });
}

export function useReorderEmergencyContacts() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (orderedIds: string[]) => api.post("/emergency/contacts/reorder", { orderedIds }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["emergencyProfile"] }),
  });
}

export function useEmergencyAccessLog() {
  return useQuery({ queryKey: ["emergencyAccessLog"], queryFn: () => api.get("/emergency/access-log").then((d) => d.log) });
}

export function useEmergencyPublic(token: string | null, pin?: string) {
  return useQuery({
    queryKey: ["emergencyPublic", token, pin],
    queryFn: () => api.get(`/emergency/public/${token}${pin ? `?pin=${encodeURIComponent(pin)}` : ""}`).then((d) => d.emergency),
    enabled: !!token,
    retry: false,
  });
}

//-----------------BILLING DATA--------------------
export function useBillingSummary() {
  return useQuery({ queryKey: ["billing"], queryFn: () => api.get("/billing/summary"), staleTime: 1000 * 30 });
}

export function useCreateCheckout() {
  return useMutation({
    mutationFn: ({ plan, interval }: { plan: "STARTER" | "PRO" | "PREMIUM"; interval: "month" | "year" }) =>
      api.post("/billing/checkout", { plan, interval }).then((d) => d.url as string),
  });
}

export function useBillingPortal() {
  return useMutation({
    mutationFn: () => api.post("/billing/portal").then((d) => d.url as string),
  });
}

export function usePlatformOverview() {
  return useQuery({ queryKey: ["platformOverview"], queryFn: () => api.get("/platform-admin/overview") });
}
export function usePlatformAuditLog() {
  return useQuery({ queryKey: ["platformAuditLog"], queryFn: () => api.get("/platform-admin/audit-log").then((d) => d.logs) });
}

export function useChangeUserRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, role }: { id: string; role: "USER" | "ADMIN" | "SUPER_ADMIN" }) =>
      api.patch(`/admin-management/users/${id}/role`, { role }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["platformUsers"] }),
  });
}

export function useCreateAdmin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; email: string; password: string }) => api.post("/admin-management/create-admin", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admins"] }),
  });
}

export function useAdmins() {
  return useQuery({ queryKey: ["admins"], queryFn: () => api.get("/admin-management/admins").then((d) => d.admins) });
}

export function useGrantPermission() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, capability }: { id: string; capability: string }) => api.post(`/admin-management/users/${id}/permissions`, { capability }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admins"] }),
  });
}

export function useRevokePermission() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, capability }: { id: string; capability: string }) => api.delete(`/admin-management/users/${id}/permissions`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admins"] }),
  });
}

export function useSendBroadcast() {
  return useMutation({
    mutationFn: (data: { title: string; message: string; audience: "ALL" | "USERS" | "MERCHANTS" }) =>
      api.post("/broadcast", data),
  });
}

export function useSetupTwoFactor() {
  return useMutation({ mutationFn: () => api.post("/2fa/setup").then((d) => d.otpauth as string) });
}
export function useEnableTwoFactor() {
  return useMutation({ mutationFn: (code: string) => api.post("/2fa/enable", { code }) });
}
export function useDisableTwoFactor() {
  return useMutation({
    mutationFn: (data: { password: string; code: string }) => api.post("/2fa/disable", data),
  });
}

export function useTwoFactorStatus() {
  return useQuery({ queryKey: ["twoFactorStatus"], queryFn: () => api.get("/2fa/status") });
}

export function useSecurityOverview() {
  return useQuery({ queryKey: ["securityOverview"], queryFn: () => api.get("/security/overview") });
}

export function useFlaggedAccounts() {
  return useQuery({
    queryKey: ["flaggedAccounts"],
    queryFn: async () => {
      const response = await api.get("/security/flagged-accounts");
      return response.flagged;
    },
    refetchInterval: 30_000,
  });
}

export function useLoginAttempts() {
  return useQuery({
    queryKey: ["loginAttempts"],
    queryFn: async () => {
      const response = await api.get("/security/login-attempts");
      return response.attempts;
    },
    refetchInterval: 30_000,
  });
}

export function useForceLogoutUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: string) =>
      api.post(`/security/users/${userId}/force-logout`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["securityOverview"] });
      queryClient.invalidateQueries({ queryKey: ["flaggedAccounts"] });
      queryClient.invalidateQueries({ queryKey: ["loginAttempts"] });
    },
  });
}

export function useMyContent() {
  return useQuery({ queryKey: ["myContent"], queryFn: () => api.get("/cms/mine").then((d) => d.items) });
}
export function useAllContent(type?: string, status?: string) {
  const params = new URLSearchParams();
  if (type) params.set("type", type);
  if (status) params.set("status", status);
  const qs = params.toString();
  return useQuery({ queryKey: ["allContent", type, status], queryFn: () => api.get(`/cms/all${qs ? `?${qs}` : ""}`).then((d) => d.items) });
}
export function useCreateContent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => api.post("/cms", data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["myContent"] }); qc.invalidateQueries({ queryKey: ["allContent"] }); },
  });
}
export function useUpdateContent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => api.patch(`/cms/${id}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["myContent"] }); qc.invalidateQueries({ queryKey: ["allContent"] }); },
  });
}
export function useSubmitForReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post(`/cms/${id}/submit-review`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["myContent"] }); qc.invalidateQueries({ queryKey: ["allContent"] }); },
  });
}
export function usePublishDirectly() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post(`/cms/${id}/publish`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["myContent"] }); qc.invalidateQueries({ queryKey: ["allContent"] }); },
  });
}
export function useReviewContent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, action, note }: { id: string; action: "APPROVE" | "REJECT"; note?: string }) => api.post(`/cms/${id}/review`, { action, note }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["allContent"] }),
  });
}

export function useUploadContentImage() {
  return useMutation({
    mutationFn: (file: File) => {
      const fd = new FormData();
      fd.append("file", file);
      return api.upload("/cms/upload-image", fd) as Promise<{ url: string }>;
    },
  });
}

export function usePublishedContent(type: string) {
  return useQuery({ queryKey: ["publishedContent", type], queryFn: () => api.get(`/cms/public/${type}`).then((d) => d.items) });
}

export function usePublishedContentBySlug(slug: string) {
  return useQuery({
    queryKey: ["publishedContentSlug", slug],
    queryFn: () => api.get(`/cms/public/blog/${slug}`).then((d) => d.item),
    enabled: !!slug,
  });
}

export function useDeleteContent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/cms/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["myContent"] }); qc.invalidateQueries({ queryKey: ["allContent"] }); },
  });
}

export function useMyPermissions() {
  return useQuery({ queryKey: ["myPermissions"], queryFn: () => api.get("/platform-admin/my-permissions") });
}

export function useSubmitContactForm() {
  return useMutation({
    mutationFn: (data: { name: string; email: string; subject?: string; message: string }) =>
      api.post("/contact-submissions", data),
  });
}

export function useTeam() {
  return useQuery({ queryKey: ["team"], queryFn: () => api.get("/site-content/team").then((d) => d.team) });
}
export function useCreateTeamMember() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (data: any) => api.post("/site-content/team", data), onSuccess: () => qc.invalidateQueries({ queryKey: ["team"] }) });
}
export function useUpdateTeamMember() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: ({ id, data }: { id: string; data: any }) => api.patch(`/site-content/team/${id}`, data), onSuccess: () => qc.invalidateQueries({ queryKey: ["team"] }) });
}
export function useDeleteTeamMember() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (id: string) => api.delete(`/site-content/team/${id}`), onSuccess: () => qc.invalidateQueries({ queryKey: ["team"] }) });
}

export function useTestimonials() {
  return useQuery({ queryKey: ["testimonials"], queryFn: () => api.get("/site-content/testimonials").then((d) => d.testimonials) });
}
export function useCreateTestimonial() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (data: any) => api.post("/site-content/testimonials", data), onSuccess: () => qc.invalidateQueries({ queryKey: ["testimonials"] }) });
}

export function useDeleteTestimonial() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (id: string) => api.delete(`/site-content/testimonials/${id}`), onSuccess: () => qc.invalidateQueries({ queryKey: ["testimonials"] }) });
}
