"use client";

import { Button } from "@/components/ui/button";

export default function EmergencyError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 px-6 text-center">
      <h1 className="text-xl font-semibold">We couldn't open this emergency profile</h1>
      <p className="max-w-sm text-sm text-muted-foreground">Check your connection and try again. If the problem continues, ask the owner to share the link again.</p>
      <p className="font-mono text-xs text-muted-foreground">{error.message}{error.digest ? ` (${error.digest})` : ""}</p>
      <Button onClick={reset}>Try again</Button>
    </div>
  );
}