import { ReactNode } from "react";
import { SiteHeader } from "@/src/components/marketing/SiteHeader";
import { SiteFooter } from "@/src/components/marketing/SiteFooter";

export default function MarketingLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}
