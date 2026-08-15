import type { Metadata } from "next";
import { PricingAudienceToggle, type PricingAudience } from "@/components/marketing/pricing/pricing-audience-toggle";
import { UserPricingTiers } from "@/components/marketing/pricing/user-tiers";
import { MerchantPricingTiers } from "@/components/marketing/pricing/merchant-tiers";

export const metadata: Metadata = {
  title: "Pricing",
  description: "LifeOS pricing for individuals and merchants.",
};

type PricingPageProps = { searchParams: Promise<{ audience?: string }> };

function resolveAudience(value: string | undefined): PricingAudience {
  return value === "merchants" ? "merchants" : "users";
}

export default async function PricingPage({ searchParams }: PricingPageProps) {
  const params = await searchParams;
  const audience = resolveAudience(params.audience);

  return (
    <>
      <section className="pt-14 md:pt-20">
        <div className="mx-auto max-w-4xl px-4 text-center">
          <h1 className="text-3xl font-bold tracking-tight sm:text-5xl">Pricing that matches how you use LifeOS</h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
            Free plans for everyday life management. Paid plans for power users and real businesses.
          </p>
          <div className="mt-8 flex justify-center pb-4">
            <PricingAudienceToggle audience={audience} />
          </div>
        </div>
      </section>

      {audience === "users" ? <UserPricingTiers /> : <MerchantPricingTiers />}
    </>
  );
}