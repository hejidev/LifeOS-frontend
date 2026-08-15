// app/(marketing)/terms/page.tsx
"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { LegalPageHeader } from "@/components/marketing/legal-page-header";

const SECTIONS = [
  { id: "acceptance", title: "Acceptance of terms", body: "By creating a LifeOS account or using the platform, you agree to these terms. If you don't agree, please don't use LifeOS." },
  { id: "your-account", title: "Your account", body: "You're responsible for keeping your login credentials secure and for all activity under your account. Let us know immediately if you suspect unauthorized access." },
  { id: "acceptable-use", title: "Acceptable use", body: "You agree not to misuse LifeOS — including attempting unauthorized access, disrupting the service, or using it for unlawful purposes." },
  { id: "merchant-accounts", title: "Merchant accounts", body: "Merchant accounts require identity verification and approval. Merchants are responsible for their staff's use of the platform under their store, and merchant access may be suspended for fraudulent activity, policy violations, or non-payment." },
  { id: "billing", title: "Subscriptions and billing", body: "Paid plans are billed on a recurring basis through our payment provider. You can manage or cancel your subscription at any time through the Billing page." },
  { id: "content", title: "Content ownership", body: "You retain ownership of the content you store in LifeOS — tasks, notes, documents, and everything else you create. We don't claim ownership of it." },
  { id: "termination", title: "Termination", body: "We may suspend or terminate accounts that violate these terms. You can close your account at any time." },
  { id: "changes", title: "Changes to these terms", body: "We may update these terms as LifeOS evolves. Continued use after changes means you accept the updated terms." },
];

export default function TermsPage() {
  const [active, setActive] = useState(SECTIONS[0].id);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) setActive(e.target.id); }),
      { rootMargin: "-20% 0px -70% 0px" }
    );
    SECTIONS.forEach((s) => { const el = document.getElementById(s.id); if (el) observer.observe(el); });
    return () => observer.disconnect();
  }, []);

  return (
    <div className="max-w-7xl flex flex-col mx-auto px-4 md:px-6 py-5 sm:py-20">
      <LegalPageHeader title="Terms of Service"/>
    <div className="mx-auto grid grid-cols-1 lg:grid-cols-4 gap-10">
      <aside className="hidden lg:block lg:col-span-1">
        <div className="sticky top-24 space-y-1">
          <p className="text-sm font-bold text-muted-foreground mb-3 px-3">On this page</p>
          {SECTIONS.map((s) => (
            <a key={s.id} href={`#${s.id}`} className={cn("block px-3 py-1.5 rounded-lg text-sm transition-colors", active === s.id ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:text-foreground")}>
              {s.title}
            </a>
          ))}
        </div>
      </aside>

      <div className="lg:col-span-3">
        <h1 className="text-3xl sm:text-4xl font-bold">Terms of Service</h1>
        <p className="text-sm text-muted-foreground mt-2">Last updated {new Date().toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}</p>
        <div className="mt-10 space-y-10">
          {SECTIONS.map((s, i) => (
            <div key={s.id} id={s.id} className="scroll-mt-24">
              <h2 className="text-lg font-semibold mb-2 flex items-center gap-2">
                <span className="text-primary text-sm font-mono">{String(i + 1).padStart(2, "0")}</span> {s.title}
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">{s.body}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
    </div>
  );
}