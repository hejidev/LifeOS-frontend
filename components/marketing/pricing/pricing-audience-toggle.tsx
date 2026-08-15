import Link from "next/link";
import { cn } from "@/lib/utils";

export type PricingAudience = "users" | "merchants";

export function PricingAudienceToggle({ audience }: { audience: PricingAudience }) {
  return (
    <div className="inline-flex rounded-full border border-border bg-card p-1" role="tablist" aria-label="Pricing audience">
      <Link
        href="/pricing?audience=users"
        role="tab"
        aria-selected={audience === "users"}
        className={cn(
          "rounded-full px-4 py-2 text-sm font-semibold transition-colors",
          audience === "users" ? "gradient-bg text-white" : "text-muted-foreground hover:text-foreground"
        )}
      >
        For Individuals
      </Link>
      <Link
        href="/pricing?audience=merchants"
        role="tab"
        aria-selected={audience === "merchants"}
        className={cn(
          "rounded-full px-4 py-2 text-sm font-semibold transition-colors",
          audience === "merchants" ? "gradient-bg text-white" : "text-muted-foreground hover:text-foreground"
        )}
      >
        For Merchants
      </Link>
    </div>
  );
}