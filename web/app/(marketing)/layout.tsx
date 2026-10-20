import { ReactNode } from "react";
import { SiteHeader } from "@/src/components/marketing/SiteHeader";
import { SiteFooter } from "@/src/components/marketing/SiteFooter";

export default function MarketingLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="marketing-theme-scope flex min-h-screen flex-col bg-[var(--home-bg)] text-[var(--home-text-body)] transition-colors duration-300">
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}
