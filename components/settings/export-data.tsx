"use client";

import { useState } from "react";
import { Check, Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { downloadFile } from "@/lib/api/client";

export function ExportData() {
  const [state, setState] = useState<"idle" | "busy" | "done">("idle");
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setError(null);
    setState("busy");
    try {
      await downloadFile("/settings/export", "lifeos-data.json");
      setState("done");
    } catch (err) {
      setError((err as Error).message);
      setState("idle");
    }
  }

  return (
    <div className="space-y-2 border-t pt-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium">Download your data</p>
          <p className="text-xs text-muted-foreground">A copy of everything you've saved in LifeOS. Passwords and encrypted notes are left out.</p>
        </div>
        <Button variant="outline" onClick={run} disabled={state === "busy"}>
          {state === "busy" ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : state === "done" ? <Check className="mr-1.5 h-4 w-4" /> : <Download className="mr-1.5 h-4 w-4" />}
          {state === "busy" ? "Preparing..." : state === "done" ? "Downloaded" : "Download"}
        </Button>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}