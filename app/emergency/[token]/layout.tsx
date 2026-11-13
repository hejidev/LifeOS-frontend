import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Emergency medical information",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default function EmergencyLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}