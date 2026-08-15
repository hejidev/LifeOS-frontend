"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { UserRole, ChatMessage } from "@/types/life";

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  name?: string;
}

interface AuthState {
  isAuthenticated: boolean;
  user: AuthUser | null;
  authReady: boolean;
  login: (user: AuthUser | null) => void;
  logout: () => void;
  setRole: (role: UserRole) => void;
  setAuthReady: (ready: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      isAuthenticated: false,
      user: null,
      authReady: false,
      login: (user) =>
        set({
          isAuthenticated: !!user,
          user: user ?? null,
        }),
      logout: () =>
        set({
          isAuthenticated: false,
          user: null,
        }),
      setRole: (role) =>
        set((state) =>
          state.user ? { user: { ...state.user, role } } : { user: state.user }
        ),
      setAuthReady: (authReady) => set({ authReady }),
    }),
    {
      name: "lifeos-auth",
      partialize: (state) => ({
        isAuthenticated: state.isAuthenticated,
        user: state.user,
      }),
    }
  )
);

export const useChatStore = create<{
  messages: ChatMessage[];
  isStreaming: boolean;
  addMessage: (m: ChatMessage) => void;
  setStreaming: (s: boolean) => void;
  clearMessages: () => void;
}>((set) => ({
  messages: [],
  isStreaming: false,
  addMessage: (message) =>
    set((state) => ({ messages: [...state.messages, message] })),
  setStreaming: (isStreaming) => set({ isStreaming }),
  clearMessages: () => set({ messages: [] }),
}));

export const useUIStore = create<{
  sidebarCollapsed: boolean;
  commandPaletteOpen: boolean;
  shortcutsOpen: boolean;
  setCommandPaletteOpen: (open: boolean) => void;
  setShortcutsOpen: (open: boolean) => void;
  toggleSidebar: () => void;
}>((set) => ({
  sidebarCollapsed: false,
  commandPaletteOpen: false,
  shortcutsOpen: false,
  toggleSidebar: () =>
    set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
  setShortcutsOpen: (open) => set({ shortcutsOpen: open }),
}));
