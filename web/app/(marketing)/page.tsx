import type { Metadata } from "next";
import { siteConfig } from "@/src/content/site";
import { AuthHomeRedirect } from "@/src/components/marketing/AuthHomeRedirect";
import { MarketingHomeClient } from "@/src/components/marketing/MarketingHomeClient";

export const metadata: Metadata = {
  title: {
    absolute: `${siteConfig.brand.name} | Task management for teams`,
  },
};

export default function MarketingHomePage() {
  const currentYear = new Date().getFullYear();
  const yearsInIndustry = Math.max(1, currentYear - siteConfig.stats.foundedYear);

  return (
    <>
      <AuthHomeRedirect />
      <MarketingHomeClient yearsInIndustry={yearsInIndustry} />
    </>
  );
}
