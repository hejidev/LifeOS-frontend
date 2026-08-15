// components/marketing/pricing-teaser.tsx — new file
import Link from "next/link";
import { Button } from "@/components/ui/button";

export function PricingTeaser() {
  return (
    <section className="py-14 text-center">
      <h2 className="text-2xl font-semibold">Simple pricing for individuals and merchants</h2>
      <p className="text-muted-foreground mt-2">Free to start. Upgrade when you need more.</p>
      <Button className="mt-6" asChild><Link href="/pricing">See pricing</Link></Button>
    </section>
  );
}