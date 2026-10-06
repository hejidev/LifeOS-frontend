"use client";

import { HelpCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { usePublishedContent } from "@/lib/hooks/use-life-data";
import { ConsoleHero } from "@/components/marketing/console-hero";

// Shown immediately while backend FAQ content loads, and as a fallback
// if none has been published yet — kept intentionally short.
const LOCAL_FAQS = [
  {
    id: "local-free",
    title: "Is LifeOS actually free?",
    body: "Yes. The core — tasks, notes, health, finance, study — is free forever, no card required. Paid tiers exist only for higher AI usage and the merchant/POS toolkit.",
  },
  {
    id: "local-merchant",
    title: "What's the merchant side for?",
    body: "If you run a real shop, LifeOS includes a full point-of-sale system: barcode scanning, inventory, staff logins, and a customer-facing display screen — on top of everything in the free plan.",
  },
  {
    id: "local-data",
    title: "Is my data secure?",
    body: "Sensitive data — like your Password Vault and Emergency Vault — is encrypted at rest, and passwords are never shown without an explicit reveal action from you.",
  },
  {
    id: "local-cancel",
    title: "Can I cancel anytime?",
    body: "Yes, any paid plan can be managed or cancelled from your Billing page at any time — no lock-in.",
  },
];

export default function FAQPage() {
  const { data: items = [], isLoading } = usePublishedContent("FAQ");

  const backendItems = items as any[];
  const displayItems = backendItems.length > 0 ? backendItems : LOCAL_FAQS;

  return (
    <div>
      <ConsoleHero
        icon={<HelpCircle className="h-3 w-3" />}
        prompt="query/faq"
        title="Frequently asked questions"
        description="Everything people usually ask before getting started with LifeOS — or reach out on our Contact page if yours isn't here."
        status={[{ label: "ENTRIES", value: `${displayItems.length}` }]}
      />

      <div className="max-w-3xl mx-auto px-4 py-14 sm:py-16">
        {isLoading ? (
          <Skeleton className="h-64 rounded-xl" />
        ) : (
          <Accordion type="single" collapsible className="w-full">
            {displayItems.map((f, i) => (
              <AccordionItem key={f.id} value={f.id}>
                <AccordionTrigger className="text-left">
                  <span className="flex items-start gap-3">
                    <span className="font-mono text-xs text-primary mt-0.5 shrink-0">{String(i + 1).padStart(2, "0")}</span>
                    <span>{f.title}</span>
                  </span>
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground pl-8">{f.body}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}
      </div>
    </div>
  );
}