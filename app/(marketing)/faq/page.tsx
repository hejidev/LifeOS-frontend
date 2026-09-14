"use client";

import { HelpCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { usePublishedContent } from "@/lib/hooks/use-life-data";
import { MarketingPageHeader } from "@/components/marketing/page-header";

export default function FAQPage() {
  const { data: items = [], isLoading } = usePublishedContent("FAQ");

  return (
    <div className="max-w-8xl mx-auto px-4 py-14 sm:py-16">
      <MarketingPageHeader
        title="Frequently asked questions"
        description="Everything people usually ask before getting started with LifeOS — or reach out on our Contact page if yours isn't here."
        icon={<HelpCircle className="h-5 w-5" />}
      />

      {isLoading ? (
        <Skeleton className="h-64 rounded-xl" />
      ) : items.length === 0 ? (
        <p className="text-center text-muted-foreground text-sm">No questions posted yet — check back soon.</p>
      ) : (
        <Accordion type="single" collapsible className="w-full">
          {(items as any[]).map((f) => (
            <AccordionItem key={f.id} value={f.id}>
              <AccordionTrigger className="text-left">{f.title}</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">{f.body}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      )}
    </div>
  );
}