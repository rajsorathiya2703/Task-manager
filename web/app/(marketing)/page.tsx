import type { Metadata } from "next";
import { siteConfig } from "@/src/content/site";
import { AuthHomeRedirect } from "@/src/components/marketing/AuthHomeRedirect";
import { HomeHeroSection } from "@/src/components/marketing/HomeHeroSection";

export const metadata: Metadata = {
  title: {
    absolute: `${siteConfig.brand.name} | Technology Solutions & Project Management`,
  },
  description:
    "Welcome to Own Technology. We engineer enterprise CRM tools (Odoo & HubSpot), agile Project Management tools, custom web/mobile applications, website maintenance, SEO/AEO management, and Model Context Protocol (MCP) integrations.",
};

export default function MarketingHomePage() {
  return (
    <>
      <AuthHomeRedirect />
      <HomeHeroSection />
    </>
  );
}

