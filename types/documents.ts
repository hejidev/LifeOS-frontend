export type DocCategory = "IDENTITY" | "LEGAL" | "EDUCATION" | "FINANCE" | "HEALTH" | "WORK" | "PERSONAL" | "OTHER";

export interface DocFolder {
  id: string;
  name: string;
  description: string | null;
}

export interface DocItem {
  id: string;
  title: string;
  category: DocCategory;
  status: "ACTIVE" | "ARCHIVED" | "EXPIRED";
  folderId: string | null;
  fileUrl: string | null;
  hasFile: boolean;
  isPrivate: boolean;
  fileName: string | null;
  fileType: string | null;
  fileSize: number | null;
  tags: string[];
  summary: string | null;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DocsDashboard {
  stats: {
    totalDocuments: number;
    activeDocuments: number;
    archivedDocuments: number;
    expiredDocuments: number;
    expiringSoon: number;
    totalBytes: number;
  };
  folders: DocFolder[];
  documents: DocItem[];
  insight: string;
}