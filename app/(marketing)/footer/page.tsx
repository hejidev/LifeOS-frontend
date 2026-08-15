import Link from "next/link";
import { Sparkles, ListChecks, Wallet, HeartPulse, Store } from "lucide-react";
import { FaXTwitter, FaLinkedin, FaGithub } from "react-icons/fa6";

const LINKS = {
  Product: [
    { label: "Pricing for Individuals", href: "/pricing?audience=users" },
    { label: "Pricing for Merchants", href: "/pricing?audience=merchants" },
  ],
  Company: [
    { label: "About", href: "/about" },
    { label: "Blog", href: "/blog" },
    { label: "Contact", href: "/contact" },
  ],
  Support: [
    { label: "FAQ", href: "/faq" },
    { label: "Contact Support", href: "/contact" },
  ],
  Account: [
    { label: "Sign in", href: "/login" },
    { label: "Create an account", href: "/signup" },
  ],
  Legal: [
    { label: "Privacy Policy", href: "/privacy" },
    { label: "Terms of Service", href: "/terms" },
  ],
};

const MODULES = [
  { label: "Tasks & Notes", icon: ListChecks },
  { label: "Finance & Budgeting", icon: Wallet },
  { label: "Health & Habits", icon: HeartPulse },
  { label: "Merchant & POS", icon: Store },
];

export function MarketingFooter() {
  return (
    <footer className="relative mt-24 overflow-hidden">
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-transparent to-primary/[0.04]" />
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-16 sm:py-24 border-t border-border">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8">
          <div className="lg:col-span-4 space-y-5">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl gradient-bg"><Sparkles className="h-5 w-5 text-white" /></div>
              <span className="font-bold text-lg gradient-text">LifeOS</span>
            </Link>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-sm">
              One operating system for your whole life — tasks, notes, health, finances, and study, free at its core, with a full merchant toolkit for when you're ready to sell.
            </p>
            <div className="flex flex-wrap gap-2">
              {MODULES.map((m) => (
                <span key={m.label} className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-card/40 px-3 py-1.5 text-xs text-muted-foreground">
                  <m.icon className="h-3.5 w-3.5 text-primary" /> {m.label}
                </span>
              ))}
            </div>
            <div className="flex gap-4 pt-1">
              <a href="#" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors"><FaXTwitter className="h-4 w-4" /></a>
              <a href="#" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors"><FaLinkedin className="h-4 w-4" /></a>
              <a href="#" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors"><FaGithub className="h-4 w-4" /></a>
            </div>
          </div>

          <div className="lg:col-span-8 grid grid-cols-2 sm:grid-cols-5 gap-8">
            {Object.entries(LINKS).map(([section, links]) => (
              <div key={section}>
                <p className="text-xs font-semibold mb-4 text-foreground uppercase tracking-wide">{section}</p>
                <ul className="space-y-3">
                  {links.map((l) => (
                    <li key={l.href}><Link href={l.href} className="text-sm text-muted-foreground hover:text-foreground transition-colors">{l.label}</Link></li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-14 pt-8 border-t border-border/50 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">© {new Date().getFullYear()} LifeOS. All rights reserved.</p>
          <p className="text-sm text-muted-foreground">Made for people who run everything from one place.</p>
        </div>
      </div>
    </footer>
  );
}

export default MarketingFooter;
