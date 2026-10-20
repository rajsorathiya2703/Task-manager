import type { Metadata } from "next";
import { siteConfig } from "@/src/content/site";
import { ServicesSection } from "@/src/components/marketing/ServicesSection";

export const metadata: Metadata = {
  title: `Services | ${siteConfig.brand.name}`,
  description:
    "Six services, one connected team. CRM setup, project management, website design & maintenance, SEO/AEO management, application development, and MCP tools for business applications.",
};

export default function ServicesPage() {
  return <ServicesSection />;
}
