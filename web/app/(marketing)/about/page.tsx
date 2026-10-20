import type { Metadata } from "next";
import { siteConfig } from "@/src/content/site";
import { AboutSection } from "@/src/components/marketing/AboutSection";

export const metadata: Metadata = {
  title: `About | ${siteConfig.brand.name}`,
  description:
    "We are Own Technology, the team behind your tech. We bring CRM, project management, websites, search visibility, custom applications and AI tools together under one team.",
};

export default function AboutPage() {
  return <AboutSection />;
}
