"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";

export interface Store {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  isDefault: boolean;
  active: boolean;
  createdAt: string;
}

interface StoreContextValue {
  stores: Store[];
  currentStoreId: string | null;
  currentStore: Store | undefined;
  setCurrentStoreId: (id: string) => void;
  isLoading: boolean;
}

const StoreContext = createContext<StoreContextValue | null>(null);
const STORAGE_KEY = "lifeos_current_store";

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const { data: stores = [], isLoading } = useQuery<Store[]>({
    queryKey: ["stores"],
    queryFn: () => api.get("/stores").then((d) => d.stores),
  });

  const [currentStoreId, setCurrentStoreIdState] = useState<string | null>(null);

  useEffect(() => {
    if (stores.length === 0) return;
    const saved = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
    const validSaved = saved && stores.some((s) => s.id === saved);
    if (validSaved) {
      setCurrentStoreIdState(saved);
    } else {
      const defaultStore = stores.find((s) => s.isDefault) ?? stores[0];
      if (defaultStore) setCurrentStoreIdState(defaultStore.id);
    }
  }, [stores]);

  function setCurrentStoreId(id: string) {
    setCurrentStoreIdState(id);
    if (typeof window !== "undefined") localStorage.setItem(STORAGE_KEY, id);
  }

  const currentStore = stores.find((s) => s.id === currentStoreId);

  return (
    <StoreContext.Provider value={{ stores, currentStoreId, currentStore, setCurrentStoreId, isLoading }}>
      {children}
    </StoreContext.Provider>
  );
}

export function useStoreContext() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStoreContext must be used within a StoreProvider");
  return ctx;
}