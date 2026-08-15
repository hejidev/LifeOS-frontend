"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  HelpCircle, Search, Mail, Store, CreditCard, UserCog, ShieldCheck, ArrowRight,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } };
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

const QUICK_LINKS = [
  { label: "Business Settings", href: "/merchant/settings", icon: Store, desc: "Store code, notifications, danger zone" },
  { label: "Billing & Plans", href: "/merchant/billing", icon: CreditCard, desc: "Manage your subscription" },
  { label: "Staff", href: "/merchant/staff", icon: UserCog, desc: "Add or manage your team" },
  { label: "Profile & Security", href: "/merchant/profile", icon: ShieldCheck, desc: "Password, avatar, preferences" },
];

const FAQS = [
  {
    category: "Getting Started",
    items: [
      { q: "How do I get approved as a merchant?", a: "Submit your business details and a government ID (National ID, Passport, Driver's License, or Voter's Card) through the merchant application. Our team reviews applications and typically approves or rejects them within a short time — you'll see your status update automatically." },
      { q: "Why can't I access my dashboard after applying?", a: "Your dashboard unlocks once your application is approved AND you've chosen a paid plan. Approval alone verifies your business — the plan is what activates the actual tools." },
      { q: "My application was rejected — can I try again?", a: "Yes. Re-submitting a new application resets your status to pending review with the updated information." },
    ],
  },
  {
    category: "Billing & Plans",
    items: [
      { q: "What happens if I cancel my plan?", a: "Your dashboard becomes inaccessible until you choose a plan again, but your data — products, sales history, customers, staff — is preserved." },
      { q: "Can I change plans later?", a: "Yes, from the Billing page you can manage your subscription, including switching plans or updating payment details, through the secure billing portal." },
      { q: "How do refunds work?", a: "Billing is handled securely through our payment processor. Reach out via the contact option below for anything refund-related." },
    ],
  },
  {
    category: "Point of Sale & Staff",
    items: [
      { q: "How does staff login work?", a: "Staff sign in at /staff/login using your store code, their name, and a personal PIN you set when adding them. This keeps their access separate from your own merchant login." },
      { q: "How do I see what my staff are doing?", a: "The Staff Activity page shows a live log of actions your team logs during their shift — sales assisted, customers helped, returns processed, and notes." },
      { q: "A staff member left the team — how do I lock them out?", a: "Delete their profile from the Staff page, or use 'Force sign out all staff' in Business Settings to instantly end every active staff session at once." },
      { q: "I lost my store code or think it's been shared too widely.", a: "Go to Business Settings → Security and regenerate your store code. This immediately invalidates the old one." },
    ],
  },
  {
    category: "Account & Security",
    items: [
      { q: "How do I change my password?", a: "Go to Profile → Security. You'll need your current password to set a new one." },
      { q: "Can I change my email address?", a: "Not directly from the dashboard yet — contact support below and we'll help you update it." },
      { q: "Can I pause my store without canceling my subscription?", a: "Yes — Business Settings → Danger Zone has a Pause Store toggle. Your billing continues, but your dashboard becomes temporarily inaccessible to you and your staff." },
    ],
  },
];

export default function MerchantSupportPage() {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return FAQS;
    return FAQS.map((cat) => ({
      ...cat,
      items: cat.items.filter((f) => f.q.toLowerCase().includes(q) || f.a.toLowerCase().includes(q)),
    })).filter((cat) => cat.items.length > 0);
  }, [search]);

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="max-w-3xl space-y-6 sm:space-y-8 px-1">
      <motion.div variants={item} className="text-center">
        <div className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 mb-3">
          <HelpCircle className="h-5 w-5 text-primary" />
        </div>
        <h1 className="text-xl sm:text-2xl font-bold">Help Center</h1>
        <p className="text-muted-foreground text-xs sm:text-sm mt-1">Search common questions or reach out directly.</p>
      </motion.div>

      <motion.div variants={item} className="relative max-w-lg mx-auto">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search help articles..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10 h-11"
        />
      </motion.div>

      <motion.div variants={item} className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {QUICK_LINKS.map((l) => (
          <Link key={l.href} href={l.href}>
            <Card className="h-full hover:border-primary/30 transition-colors">
              <CardContent className="p-3 sm:p-4 space-y-1.5">
                <l.icon className="h-4 w-4 text-primary" />
                <p className="text-xs sm:text-sm font-medium">{l.label}</p>
                <p className="text-[10px] sm:text-[11px] text-muted-foreground leading-tight">{l.desc}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </motion.div>

      <motion.div variants={item} className="space-y-4">
        {filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No results for "{search}".</p>
        ) : (
          filtered.map((cat) => (
            <Card key={cat.category}>
              <CardContent className="pt-5 sm:pt-6">
                <p className="text-sm font-semibold mb-2">{cat.category}</p>
                <Accordion type="single" collapsible className="w-full">
                  {cat.items.map((f) => (
                    <AccordionItem key={f.q} value={f.q}>
                      <AccordionTrigger className="text-left text-sm">{f.q}</AccordionTrigger>
                      <AccordionContent className="text-sm text-muted-foreground">{f.a}</AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </CardContent>
            </Card>
          ))
        )}
      </motion.div>

      <motion.div variants={item}>
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="pt-5 sm:pt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <p className="text-sm font-medium">Still need help?</p>
              <p className="text-xs text-muted-foreground mt-0.5">Send us a message and we'll follow up by email.</p>
            </div>
            <Button asChild className="w-full sm:w-auto shrink-0">
              <a href="mailto:support@lifeos.app?subject=Merchant%20Support%20Request">
                <Mail className="mr-2 h-4 w-4" /> Contact support <ArrowRight className="ml-1 h-3 w-3" />
              </a>
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}