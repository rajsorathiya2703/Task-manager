import type { Metadata } from "next";
import { HelpSection } from "@/src/components/marketing/HelpSection";

export const metadata: Metadata = {
  title: "Help & Documentation | Own Technology",
  description:
    "Guides, walkthroughs, and answers to help your team get the most out of your workspace, CRM integrations, and AI tools.",
};

export default function HelpPage() {
  return <HelpSection />;
}
