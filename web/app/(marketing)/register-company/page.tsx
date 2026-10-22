import type { Metadata } from "next";
import Link from "next/link";
import { Check } from "lucide-react";
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
    <div className="relative min-h-[calc(100vh-140px)] flex items-center justify-center overflow-hidden py-12 sm:py-16 lg:py-20">
      {/* Decorative organic ambient shapes matching DESIGN (1) and DESIGN (2) */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 -left-28 w-[450px] h-[360px] rounded-full bg-[#dbe8df]/60 dark:bg-[#142d24]/50 blur-3xl -z-10 transition-colors duration-300"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-32 -left-20 w-[500px] h-[500px] rounded-full bg-[#dbe8df]/60 dark:bg-[#142d24]/40 blur-3xl -z-10 transition-colors duration-300"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-20 -right-24 w-[600px] h-[600px] rounded-full bg-[#dbe8df]/65 dark:bg-[#142d24]/50 blur-3xl -z-10 transition-colors duration-300"
      />

      <div className="relative w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          {/* Left Column: Trial Value Proposition */}
          <div className="lg:col-span-6 xl:col-span-6 space-y-8 lg:pr-4">
            <div className="space-y-5">
              {/* Pill badge */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-white/90 dark:bg-[#12211E] text-[#161e12] dark:text-[#E3F5EC] border border-black/10 dark:border-[#285A48] shadow-xs backdrop-blur-xs transition-colors">
                <span className="w-2 h-2 rounded-full bg-[#086948] dark:bg-[#8bd5b9] shrink-0" />
                <span>14-day free trial · No card required</span>
              </div>

              {/* Headline */}
              <h1 className="font-home-heading text-4xl sm:text-5xl lg:text-[54px] font-extrabold tracking-tight leading-[1.08]">
                <span className="text-[#161e12] dark:text-[#F3FDF8]">
                  Start your{" "}
                </span>
                <span className="text-[#086948] dark:text-[#8bd5b9]">
                  14-day<br className="hidden sm:inline" /> free trial
                </span>
              </h1>

              {/* Subtitle */}
              <p className="font-home-body text-[#4B5750] dark:text-[#86A99A] text-base sm:text-lg leading-relaxed max-w-xl">
                Experience the unified workspace with your team. Get full access to task boards, live time tracking, AI Copilot, and leave management.
              </p>
            </div>

            {/* Checklist items */}
            <div className="space-y-4">
              {CHECKLIST_ITEMS.map((item) => (
                <div key={item} className="flex items-center gap-3.5">
                  <div className="w-5 h-5 rounded-full bg-[#086948] dark:bg-[#8bd5b9] text-white dark:text-[#091413] flex items-center justify-center shrink-0 shadow-2xs">
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </div>
                  <span className="font-home-body text-sm font-semibold text-[#161e12] dark:text-[#E3F5EC]">
                    {item}
                  </span>
                </div>
              ))}
            </div>

            {/* Note for existing users */}
            <div className="pt-6 border-t border-black/10 dark:border-[#285A48]">
              <p className="font-home-body text-sm text-[#4B5750] dark:text-[#86A99A]">
                Already have an organization or workspace?{" "}
                <Link
                  href="/my-account"
                  className="text-[#161e12] dark:text-[#E3F5EC] font-semibold underline underline-offset-4 hover:text-[#086948] dark:hover:text-[#8bd5b9] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-xs"
                >
                  Go to account
                </Link>
                {" "}or{" "}
                <Link
                  href={siteConfig.cta.login.href}
                  className="text-[#161e12] dark:text-[#E3F5EC] font-semibold underline underline-offset-4 hover:text-[#086948] dark:hover:text-[#8bd5b9] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-xs"
                >
                  Log in
                </Link>
              </p>
            </div>
          </div>

          {/* Right Column: Register Company Form */}
          <div className="lg:col-span-6 xl:col-span-6 flex justify-center lg:justify-end">
            <div className="w-full max-w-xl">
              <RegisterCompanyForm />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
