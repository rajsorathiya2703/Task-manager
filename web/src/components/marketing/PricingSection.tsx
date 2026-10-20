"use client";

import Link from "next/link";
import {
  ArrowRight,
  MessageSquare,
  Sparkles,
  ShieldCheck,
  Zap,
  SlidersHorizontal,
  Check,
} from "lucide-react";
import { siteConfig } from "@/src/content/site";

export function PricingSection() {
  return (
    <div className="relative isolate overflow-hidden bg-[var(--home-bg)] text-[var(--home-text-body)] py-12 sm:py-20 transition-colors duration-300 min-h-[calc(100vh-80px)] flex items-center">
      
      {/* Soft Ambient Organic Curved Shape on Top Right */}
      <div
        className="absolute -right-24 -top-24 w-[500px] sm:w-[650px] h-[500px] sm:h-[650px] rounded-full bg-[#dbe8df]/60 dark:bg-[#142d24]/50 pointer-events-none -z-10 transition-colors duration-300"
        aria-hidden="true"
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="max-w-4xl mx-auto text-center">
          
          {/* Eyebrow Pill */}
          <div className="inline-flex items-center gap-2 rounded-full border border-black/10 dark:border-[#285A48] bg-white/80 dark:bg-[#12211E] px-3.5 py-1.5 text-xs font-semibold text-[#161e12] dark:text-[#E3F5EC] mb-6 shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-[#086948] dark:bg-[#8bd5b9] shrink-0" />
            <span>Tailored for your team</span>
          </div>

          {/* Main Title */}
          <h1 className="text-4xl sm:text-6xl lg:text-[62px] font-extrabold tracking-tight leading-[1.06]">
            <span className="text-[#161e12] dark:text-[#F3FDF8]">
              Pricing tailored to
            </span>
            <br />
            <span className="text-[#086948] dark:text-[#8bd5b9]">
              your exact setup
            </span>
          </h1>

          {/* Subtitle / Message */}
          <p className="mt-6 text-base sm:text-lg text-[#4B5750] dark:text-[#9bb7ab] max-w-2xl mx-auto leading-relaxed">
            We configure custom solutions around the way your company actually works — from CRM and project management to bespoke websites, web applications, and AI integrations. We tailor our pricing directly to your team size and operational scope.
          </p>

          {/* Primary CTA Box Card */}
          <div className="mt-10 sm:mt-12 rounded-[32px] sm:rounded-[36px] bg-white dark:bg-[#12211E] border border-black/8 dark:border-[#285A48] p-7 sm:p-10 shadow-xl text-left">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              
              {/* Left Side: Summary text & deliverables */}
              <div className="lg:col-span-7 space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono font-bold tracking-wider uppercase bg-[#e6f4ed] dark:bg-[#1b3b30] text-[#086948] dark:text-[#8bd5b9]">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Custom scope & rollout</span>
                </div>
                
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[#161e12] dark:text-[#E3F5EC]">
                  Have a project or team rollout in mind?
                </h2>
                
                <p className="text-sm text-[#555e58] dark:text-[#86A99A] leading-relaxed">
                  Tell us where your business is and what systems you need in place. We will review your requirements, walk you through the options, and provide a clear, transparent proposal with zero hidden costs.
                </p>

                {/* 4 Feature Badges */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
                  {[
                    "Odoo CRM & HubSpot CRM setup",
                    "Task pipelines & Gantt timelines",
                    "Bespoke web & internal applications",
                    "Model Context Protocol (MCP) AI tools",
                  ].map((feat) => (
                    <div key={feat} className="flex items-center gap-2 text-xs sm:text-sm text-[#161e12] dark:text-[#E3F5EC] font-medium">
                      <div className="w-4 h-4 rounded-full bg-[#086948] text-white flex items-center justify-center shrink-0">
                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                      </div>
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right Side: CTA Action Buttons */}
              <div className="lg:col-span-5 flex flex-col justify-center gap-3.5 sm:border-l sm:border-black/5 dark:sm:border-white/5 sm:pl-8">
                <Link
                  href="/contact?subject=Pricing"
                  className="w-full rounded-full bg-[#0C1511] hover:bg-[#202c25] dark:bg-[#8bd5b9] dark:hover:bg-[#a6f2d4] text-white dark:text-[#091413] py-4 px-6 text-sm sm:text-base font-semibold inline-flex items-center justify-center gap-2 transition-all duration-200 shadow-md hover:scale-[1.02] active:scale-[0.98]"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>Contact our team</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>

                <Link
                  href={siteConfig.cta.trial.href}
                  className="w-full rounded-full bg-white dark:bg-[#12211E] border border-black/10 dark:border-[#285A48] hover:border-black/25 text-[#161e12] dark:text-[#E3F5EC] py-3.5 px-6 text-sm font-semibold inline-flex items-center justify-center gap-2 transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] shadow-xs"
                >
                  <span>Start 14-day free trial</span>
                </Link>

                <p className="text-[11px] text-[#555e58] dark:text-[#86A99A] text-center mt-1">
                  No credit card required • Full feature access
                </p>
              </div>

            </div>
          </div>

          {/* 3 Value Pillars */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mt-10 text-left">
            
            {/* Card 1 */}
            <div className="rounded-[24px] bg-white dark:bg-[#12211E] border border-black/8 dark:border-[#285A48] p-6 shadow-xs">
              <div className="w-10 h-10 rounded-xl bg-[#e6f4ed] dark:bg-[#1b3b30] text-[#086948] dark:text-[#8bd5b9] flex items-center justify-center mb-4">
                <SlidersHorizontal className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-[#161e12] dark:text-[#E3F5EC] tracking-tight">
                Tailored Rollout
              </h3>
              <p className="mt-1.5 text-xs sm:text-sm text-[#555e58] dark:text-[#86A99A] leading-relaxed">
                Configured specifically for your team size, sales cycle, and operational workflows.
              </p>
            </div>

            {/* Card 2 */}
            <div className="rounded-[24px] bg-white dark:bg-[#12211E] border border-black/8 dark:border-[#285A48] p-6 shadow-xs">
              <div className="w-10 h-10 rounded-xl bg-[#e6f4ed] dark:bg-[#1b3b30] text-[#086948] dark:text-[#8bd5b9] flex items-center justify-center mb-4">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-[#161e12] dark:text-[#E3F5EC] tracking-tight">
                Predictable Terms
              </h3>
              <p className="mt-1.5 text-xs sm:text-sm text-[#555e58] dark:text-[#86A99A] leading-relaxed">
                Clear scope and timeline with transparent pricing and zero hidden subscription fees.
              </p>
            </div>

            {/* Card 3 */}
            <div className="rounded-[24px] bg-[#0c1612] text-white border border-white/10 p-6 shadow-md">
              <div className="w-10 h-10 rounded-xl bg-white/10 text-[#5eead4] flex items-center justify-center mb-4">
                <Zap className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white tracking-tight">
                One Connected Partner
              </h3>
              <p className="mt-1.5 text-xs sm:text-sm text-gray-300 leading-relaxed">
                Everything built, integrated, and looked after long after launch under one roof.
              </p>
            </div>

          </div>

        </div>
      </div>
    </div>
  );
}
