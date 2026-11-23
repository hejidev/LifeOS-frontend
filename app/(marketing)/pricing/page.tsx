import type { Metadata } from "next";
import { FaqList, type FaqItem } from "@/components/marketing/faq-list";
import { PricingView } from "@/components/marketing/pricing-view";
import { getPublicPlans } from "@/lib/marketing/plans";

const SITE = process.env.NEXT_PUBLIC_APP_URL ?? "https://www.lifeos.com.ng";
const TITLE = "Pricing | LifeOS";
const DESCRIPTION = "Start free. Upgrade for unlimited AI tools, or apply as a merchant to run your shop on LifeOS. Prices in Naira.";

export const revalidate = 300;

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: "/pricing" },
  openGraph: { title: TITLE, description: DESCRIPTION, url: "/pricing", siteName: "LifeOS", type: "website", locale: "en_NG" },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

export default async function PricingPage() {
  const plans = await getPublicPlans();

  const faq: FaqItem[] = [
    { q: "Can I use LifeOS for free?", a: `Yes. Every core module is free. The AI writing, image and file-conversion tools include ${plans?.freeUsesPerTool ?? "a few"} free uses each.` },
    { q: "How do I cancel?", a: "Open Billing in your account and choose Manage subscription. You can cancel there at any time." },
    { q: "What happens to my data if I cancel?", a: "Your data stays. You simply return to the free plan, so the free limits apply to the AI tools again." },
    { q: "How do I pay?", a: "Payments are handled securely by Paystack at checkout. LifeOS doesn't see or store your card details." },
    { q: "Do merchants need a personal plan too?", a: "No. Merchant plans are separate. You apply, our team reviews your application, and once approved you choose a merchant plan." },
    { q: "Is there a discount for paying yearly?", a: "Yes. Switch the toggle above to see yearly prices and the saving for each plan." },
  ];

  return (
    <>
      <main>
        <section className="relative overflow-hidden">
          <div className="pointer-events-none absolute -top-32 left-1/2 h-80 w-[32rem] -translate-x-1/2 rounded-full bg-primary/20 blur-3xl" />
          <div className="relative mx-auto max-w-6xl space-y-12 px-4 py-16 sm:px-6 sm:py-20">
            <div className="mx-auto max-w-2xl space-y-3 text-center">
              <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">Simple pricing, in <span className="gradient-text">Naira</span></h1>
              <p className="text-muted-foreground">Start free and upgrade only when you need more. No contracts.</p>
            </div>
            <PricingView plans={plans} />
          </div>
        </section>
        <section className="mx-auto max-w-3xl space-y-8 px-4 pb-24 sm:px-6">
          <h2 className="text-center text-2xl font-bold tracking-tight">Pricing questions</h2>
          <FaqList items={faq} />
        </section>
      </main>
    </>
  );
}