import { MarketingFooter } from "./footer/page";
import MarketingNavbar from "./navbar/page";

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <MarketingNavbar />
      {children}
      <MarketingFooter />
    </>
  );
}