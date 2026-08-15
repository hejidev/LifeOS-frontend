// src/types/life.ts (or a new file like src/types/study.ts)

export type StudyStatus = "not_started" | "in_progress" | "completed";

export interface StudyMaterial {
  id: string;
  title: string;
  course?: string;
  type: "pdf" | "doc" | "slides";
  status: StudyStatus;
  tags: string[];
  lastStudiedAt?: string;
  totalPages?: number;
  progressPages?: number;
}