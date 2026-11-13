"use client";

import { useEffect, useState } from "react";
import { fetchProtectedBlob } from "@/lib/api/client";

type State = { url: string; image: boolean } | "error" | null;

export function ProtectedImage({ path, alt, className }: { path: string; alt: string; className?: string }) {
  const [state, setState] = useState<State>(null);

  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;

    fetchProtectedBlob(path)
      .then((blob) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setState({ url: objectUrl, image: blob.type.startsWith("image/") });
      })
      .catch(() => {
        if (!cancelled) setState("error");
      });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [path]);

  if (state === null) return <div className="h-24 animate-pulse rounded-lg bg-muted" />;
  if (state === "error") return <p className="text-xs text-destructive">Couldn't load this document.</p>;

  return state.image ? (
    <a href={state.url} target="_blank" rel="noopener noreferrer">
      <img src={state.url} alt={alt} className={className} />
    </a>
  ) : (
    <a href={state.url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">
      Open {alt}
    </a>
  );
}