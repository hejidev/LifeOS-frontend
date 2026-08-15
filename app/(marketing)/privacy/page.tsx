// app/(marketing)/privacy/page.tsx
"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { LegalPageHeader } from "@/components/marketing/legal-page-header";

const SECTIONS = [
  { id: "info-we-collect", title: "Information we collect", body: "We collect information you provide directly — your name, email, and anything you choose to store in LifeOS, including tasks, notes, health logs, financial records, study materials, documents, and, for merchant accounts, business details and identity verification documents. We also collect information automatically, such as login timestamps and basic device information, to keep your account secure." },
  { id: "how-we-use", title: "How we use your information", body: "We use your information to operate LifeOS, provide the features you use, process payments through our billing provider, send account-related communications, and improve the platform. We do not sell your personal data to third parties." },
  { id: "sensitive-data", title: "Sensitive data", body: "Certain LifeOS features — the Password Vault and Emergency Vault — store especially sensitive information. These are encrypted at rest, and Password Vault contents are never displayed without an explicit reveal action from you." },
  { id: "data-sharing", title: "Data sharing", body: "We share data with service providers strictly to operate LifeOS: payment processing, file storage for uploads, and transactional email delivery. These providers are contractually limited to using your data only to provide their service to us." },
  { id: "your-rights", title: "Your rights", body: "You can access, correct, or request deletion of your personal data at any time. Contact us through the Contact page and we will respond as quickly as possible." },
  { id: "cookies", title: "Cookies", body: "We use cookies necessary for authentication and session management — to keep you signed in securely. We do not use third-party advertising or tracking cookies." },
  { id: "children", title: "Children's privacy", body: "LifeOS is not directed at children under 13, and we do not knowingly collect personal information from children under 13." },
  { id: "changes", title: "Changes to this policy", body: "We may update this policy as LifeOS evolves. Material changes will be reflected here with an updated date." },
];

export default function PrivacyPage() {
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
  <>
    <div className="max-w-7xl flex flex-col mx-auto px-4 md:px-6 py-5 sm:py-20">
      <LegalPageHeader title="Privacy Policy"/>
    <div className="max-w-full mx-auto grid grid-cols-1 lg:grid-cols-4 gap-10">
      <aside className="hidden lg:block lg:col-span-1">
        <div className="sticky top-24 space-y-1">
          <p className="text-sm font-bold text-muted-foreground mb-3 px-3">On this page</p>
          {SECTIONS.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              className={cn("block px-3 py-1.5 rounded-lg text-sm transition-colors", active === s.id ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:text-foreground")}
            >
              {s.title}
            </a>
          ))}
        </div>
      </aside>

      <div className="lg:col-span-3">
        <h1 className="text-3xl sm:text-4xl font-bold">Privacy Policy</h1>
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
  </>
  );
}