import type { Metadata } from "next";
import { FaqList, JsonLd, type FaqItem } from "@/components/marketing/faq-list";
import { Features, FinalCta, Hero, HowItWorks, MerchantSection, PricingPreview, Security, Tour, TrustBar } from "@/components/marketing/home-sections";
import SiteFooter from "@/components/marketing/site-footer";
// import SiteHeader from "@/components/marketing/site-header";
import { getPublicPlans } from "@/lib/marketing/plans";

const SITE = process.env.NEXT_PUBLIC_APP_URL ?? "https://www.lifeos.com.ng";
const TITLE = "LifeOS: tasks, money, health, family and a point-of-sale in one place";
const DESCRIPTION = "Plan your day, track your money, build habits, protect your documents and run your shop with one free account, built for life in Nigeria.";

export const revalidate = 300;

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: "/" },
  openGraph: { title: TITLE, description: DESCRIPTION, url: "/", siteName: "LifeOS", type: "website", locale: "en_NG" },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

export default async function HomePage() {
  const plans = await getPublicPlans();
  const freeUses = plans?.freeUsesPerTool;

  const faq: FaqItem[] = [
    { q: "Is LifeOS really free?", a: `Yes. The core modules are free to use. The AI writing, image and file-conversion tools include ${freeUses ?? "a few"} free uses each, and paid plans unlock unlimited use.` },
    { q: "Is my data private?", a: "Documents, merchant ID and study files are stored privately, and your passwords and secure notes are encrypted before they're stored. You can download a copy of everything you've saved from Settings at any time." },
    { q: "Does the AI assistant see my data?", a: "To answer you, the assistant is given a summary of your tasks, calendar, habits, goals and spending, which our AI provider processes. It never saves anything without your confirmation." },
    { q: "Can my children use LifeOS?", a: "Parents create a sign-in for each child. Children can chat with the family and follow a bedtime that locks their LifeOS account. Parents can see family messages. To lock the device itself, the app includes a guide for Family Link, Screen Time and Microsoft Family Safety." },
    { q: "Do I need internet for the point-of-sale?", a: "No. Sales are saved on the device and upload automatically when you reconnect. You need a connection to sign in the first time, and for actions such as clocking out or redeeming loyalty points." },
    { q: "Which devices does it work on?", a: "The website works in any modern browser on phone, tablet and computer. The staff and owner app is available for Android. An iPhone app is planned." },
    { q: "How do I become a merchant?", a: "Create an account, apply with your business and ID details, and our team reviews it. Once approved you choose a plan to activate your dashboard." },
    { q: "How do I cancel a plan?", a: "Open Billing in your account and choose Manage subscription. Payments are handled securely by Paystack." },
  ];

  return (
    <>
      <JsonLd data={{ "@context": "https://schema.org", "@graph": [
        { "@type": "Organization", name: "LifeOS", url: SITE },
        { "@type": "WebSite", name: "LifeOS", url: SITE },
        { "@type": "FAQPage", mainEntity: faq.map((item) => ({ "@type": "Question", name: item.q, acceptedAnswer: { "@type": "Answer", text: item.a } })) },
      ] }} />
      
      <main>
        <Hero />
        <TrustBar />
        <Features />
        <Tour />
        <HowItWorks />
        <MerchantSection plans={plans} />
        <Security />
        <PricingPreview plans={plans} />
        <section className="mx-auto max-w-3xl space-y-8 px-4 py-20 sm:px-6">
          <h2 className="text-center text-3xl font-bold tracking-tight">Questions, answered</h2>
          <FaqList items={faq} />
        </section>
        <FinalCta />
      </main>
      {/* <SiteFooter /> */}
    </>
  );
}