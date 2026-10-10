import type { Metadata } from "next";
import Link from "next/link";
import { Mail, MessageSquare } from "lucide-react";
import { siteConfig } from "@/src/content/site";

export const metadata: Metadata = {
  title: "Pricing",
};

export default function PricingPage() {
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24 flex items-center justify-center min-h-[60vh]">
      <div className="w-full max-w-2xl bg-card border border-border/70 rounded-3xl p-8 sm:p-12 text-center shadow-lg space-y-8">
        {/* Headline & Body */}
        <div className="space-y-4">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
            {siteConfig.pricing.headline}
          </h1>
          <p className="text-base sm:text-lg text-muted-foreground leading-relaxed max-w-xl mx-auto">
            {siteConfig.pricing.body}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
          <Link
            href="/contact?subject=Pricing"
            className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-full px-7 h-11 inline-flex items-center justify-center gap-2 text-sm font-medium shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <MessageSquare className="w-4 h-4" />
            <span>Contact sales team</span>
          </Link>
          <a
            href={`mailto:${siteConfig.pricing.salesEmail}`}
            className="border border-border bg-card hover:bg-muted text-foreground rounded-full px-7 h-11 inline-flex items-center justify-center gap-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Mail className="w-4 h-4" />
            <span>Email sales</span>
          </a>
        </div>

        {/* Muted Note with Trial Link */}
        <div className="pt-4 border-t border-border/40">
          <p className="text-xs text-muted-foreground">
            Every new company starts with a{" "}
            <Link
              href={siteConfig.cta.trial.href}
              className="text-foreground font-medium underline underline-offset-4 hover:text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-xs"
            >
              free 14-day trial
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
