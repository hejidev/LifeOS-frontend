"use client";

import { useEffect } from "react";

function loadedStaticUrls() {
  return performance
    .getEntriesByType("resource")
    .map((entry) => entry.name)
    .filter((name) => name.includes("/_next/static/"));
}

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    let cancelled = false;
    let followUp: ReturnType<typeof setTimeout> | null = null;

    const warm = async () => {
      const registration = await navigator.serviceWorker.ready;
      if (cancelled) return;
      registration.active?.postMessage({ type: "CACHE_URLS", urls: loadedStaticUrls() });
    };

    const start = () => {
      void warm();
      followUp = setTimeout(() => void warm(), 10000);
    };

    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then(() => {
        if (document.readyState === "complete") start();
        else window.addEventListener("load", start, { once: true });
      })
      .catch(() => {});

    void navigator.storage?.persist?.().catch(() => {});

    return () => {
      cancelled = true;
      if (followUp) clearTimeout(followUp);
    };
  }, []);

  return null;
}