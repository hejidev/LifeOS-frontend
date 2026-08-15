"use client";

import { Sparkles } from "lucide-react";

export function MerchantLogo() {
  return (
    <div className="flex items-center gap-3 px-2 py-3">

      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">

        <Sparkles className="h-5 w-5" />

      </div>

      <div className="group-data-[collapsible=icon]:hidden">

        <h2 className="font-bold">
          LifeOS
        </h2>

        <p className="text-xs text-muted-foreground">
          Merchant Portal
        </p>

      </div>

    </div>
  );
}