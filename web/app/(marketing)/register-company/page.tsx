import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, ShieldCheck } from "lucide-react";
import { siteConfig } from "@/src/content/site";
import { RegisterCompanyForm } from "@/src/components/marketing/RegisterCompanyForm";

export const metadata: Metadata = {
  title: "Start your free trial",
};

const CHECKLIST_ITEMS = [
  "Set up your company in a minute",
  "Invite your team",
  "Boards, time tracking and leave in one place",
];

export default function RegisterCompanyPage() {
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-start">
        {/* Left Column: Trial Value Proposition */}
        <div className="lg:col-span-5 space-y-8">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-muted text-foreground border border-border/80 shadow-2xs">
              <ShieldCheck className="w-3.5 h-3.5 text-primary" />
              <span>14-day free trial · No card required</span>
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-foreground leading-[1.1]">
              Start your 14-day free trial
            </h1>
            <p className="text-muted-foreground text-base sm:text-lg leading-relaxed">
              Experience the unified workspace with your team. Get full access to task boards, live time tracking, AI Copilot, and leave management.
            </p>
          </div>

          {/* Checklist */}
          <div className="space-y-4">
            {CHECKLIST_ITEMS.map((item) => (
              <div key={item} className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0 mt-0.5">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <span className="text-sm font-medium text-foreground">
                  {item}
                </span>
              </div>
            ))}
          </div>

          {/* Note for existing users */}
          <div className="pt-4 border-t border-border/60">
            <p className="text-sm text-muted-foreground">
              Already have an organization or workspace?{" "}
              <Link
                href={siteConfig.cta.login.href}
                className="text-foreground font-semibold underline underline-offset-4 hover:text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-xs"
              >
                Log in
              </Link>
            </p>
          </div>
        </div>

        {/* Right Column: Register Company Form */}
        <div className="lg:col-span-7">
          <RegisterCompanyForm />
        </div>
      </div>
    </div>
  );
}
