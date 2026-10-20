import type { Metadata } from "next";
import { PricingSection } from "@/src/components/marketing/PricingSection";

export const metadata: Metadata = {
  title: "Pricing | Own Technology",
  description:
    "Simple, transparent pricing for growing teams. Unrestricted 14-day free trial on all core workspaces, CRM synchronization, and AI tools.",
};

export default function PricingPage() {
  return <PricingSection />;
}
