"use client";

import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";

export function MerchantSearch() {
  return (
    <Button
      variant="outline"
      className="w-full max-w-sm justify-between text-muted-foreground"
    >
      <div className="flex items-center gap-2">
        <Search className="h-4 w-4" />
        Search...
      </div>

      <kbd className="rounded bg-muted px-2 py-0.5 text-xs">
        ⌘K
      </kbd>
    </Button>
  );
}