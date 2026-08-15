// src/lib/mock/password-vault.ts
import type { PasswordVaultSummary, VaultItem } from "@/types/life";

export const mockVaultItems: VaultItem[] = [
  {
    id: "vault-google",
    label: "Google Account",
    username: "blessing.afolabi",
    url: "https://accounts.google.com",
    category: "website",
    strength: "strong",
    lastChanged: "2026-06-10",
    tags: ["2FA", "personal"],
  },
  {
    id: "vault-github",
    label: "GitHub",
    username: "blesscode",
    url: "https://github.com/login",
    category: "website",
    strength: "medium",
    lastChanged: "2026-04-21",
    tags: ["dev", "personal"],
  },
  {
    id: "vault-bank",
    label: "Bank Mobile App",
    username: "blessing.afolabi",
    category: "bank",
    strength: "weak",
    lastChanged: "2025-12-02",
    tags: ["finance"],
  },
  {
    id: "vault-netflix",
    label: "Netflix",
    username: "family@example.com",
    url: "https://netflix.com/login",
    category: "app",
    strength: "medium",
    lastChanged: "2026-03-15",
    tags: ["family"],
  },
];

export const mockPasswordVaultSummary: PasswordVaultSummary = {
  items: mockVaultItems,
  totalItems: mockVaultItems.length,
  weakCount: mockVaultItems.filter((i) => i.strength === "weak").length,
  // Mock reused count (you can improve later)
  reusedCount: 2,
  insight:
    "Most of your important accounts use strong passwords. A few finance and streaming logins are weak or reused — updating them would significantly improve security.",
};