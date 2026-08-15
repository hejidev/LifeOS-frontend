"use client";

import { HelpCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { usePublishedContent } from "@/lib/hooks/use-life-data";

export default function FAQPage() {
  const { data: items = [], isLoading } = usePublishedContent("FAQ");

  return (
    <div className="max-w-8xl mx-auto px-4 py-14 sm:py-16">
      <div className="text-center mb-5 md:mb-10">
        <div className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 mb-3">
          <HelpCircle className="h-6 w-6 text-primary" />
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold">Frequently asked questions</h1>
        <p className="mt-3 text-sm sm:text-base text-muted-foreground">Everything people usually ask before getting started with LifeOS — or reach out on our Contact page if yours isn't here.</p>
      </div>

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