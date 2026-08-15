"use client";

import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function DashboardError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-[60vh] gap-3 text-center px-4">
      <AlertTriangle className="h-8 w-8 text-destructive" />
      <p className="text-sm font-medium">{error.message || "Something went wrong loading this page."}</p>
      <Button size="sm" onClick={() => reset()}>Try again</Button>
    </div>
  );
}