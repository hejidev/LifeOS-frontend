// components/marketing/legal-page-header.tsx
import { ShieldCheck } from "lucide-react";

export function LegalPageHeader({ title }: { title: string }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-primary/10 via-card to-card px-6 py-10 sm:px-10 sm:py-14 mb-10">
      <div className="absolute -top-10 -right-10 h-40 w-40 bg-primary/20 blur-3xl rounded-full" />
      <div className="relative inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 mb-4">
        <ShieldCheck className="h-5 w-5 text-primary" />
      </div>
      <h1 className="relative text-3xl sm:text-4xl font-bold">{title}</h1>
      <p className="relative text-sm text-muted-foreground mt-2">Last updated {new Date().toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}</p>
    </div>
  );
}