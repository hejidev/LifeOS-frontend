"use client";

import { useEffect, useRef, useState } from "react";

export function usePersisted<T>(key: string, initial: T) {
  const fallback = useRef(initial);
  const [value, setValue] = useState<T>(initial);
  const [loadedKey, setLoadedKey] = useState<string | null>(null);

  useEffect(() => {
    let next = fallback.current;
    try {
      const raw = window.localStorage.getItem(key);
      if (raw) next = JSON.parse(raw) as T;
    } catch {
      next = fallback.current;
    }
    setValue(next);
    setLoadedKey(key);
  }, [key]);

  useEffect(() => {
    if (loadedKey !== key) return;
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {}
  }, [key, value, loadedKey]);

  return [value, setValue, loadedKey === key] as const;
}

export function useOnline() {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    setOnline(navigator.onLine);
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    window.addEventListener("online", up);
    window.addEventListener("offline", down);
    return () => {
      window.removeEventListener("online", up);
      window.removeEventListener("offline", down);
    };
  }, []);

  return online;
}