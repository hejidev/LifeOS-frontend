export type VaultCategory = "WEBSITE" | "APP" | "BANK" | "CARD" | "NOTE";
export type VaultStrength = "weak" | "medium" | "strong";

export interface VaultItem {
  id: string;
  label: string;
  username: string | null;
  url: string | null;
  category: VaultCategory;
  tags: string[];
  favorite: boolean;
  strength: number;
  strengthLabel: VaultStrength | null;
  lastChangedAt: string;
  createdAt: string;
  hasPassword: boolean;
  hasNotes: boolean;
  reused: boolean;
  old: boolean;
}

export interface VaultSecrets {
  id: string;
  password: string | null;
  notes: string | null;
}

export interface VaultDashboard {
  items: VaultItem[];
  stats: { totalItems: number; withPassword: number; weakCount: number; reusedCount: number; oldPasswords: number; healthScore: number | null };
  insight: string;
}