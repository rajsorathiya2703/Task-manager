"use client";

import Link from "next/link";
import {
  ArrowRight,
  Search,
  Share2,
  Code2,
  AppWindow,
  CheckCircle2,
} from "lucide-react";

export function AboutSection() {
  return (
    <section
      id="about"
      className="relative isolate overflow-hidden bg-[var(--home-bg)] text-[var(--home-text-body)] transition-colors duration-300 py-10 sm:py-14"
    >
      {/* Background Soft Organic Glow */}
      <div
        className="absolute -right-20 -top-24 w-[420px] sm:w-[520px] h-[420px] sm:h-[520px] rounded-full bg-[#086948]/10 dark:bg-[#8bd5b9]/10 pointer-events-none blur-3xl -z-10 transition-colors"
        aria-hidden="true"
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10 sm:space-y-12">
        {/* ========================================================================= */}
        {/* 1. TOP ROW: HERO CONTENT (LEFT) + HOW WE WORK GRAPHIC (RIGHT)              */}
        {/* ========================================================================= */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
          
          {/* LEFT COLUMN: Headings, Subtext, Paragraph & CTAs */}
          <div className="lg:col-span-7 flex flex-col justify-center text-left">
            {/* Pill Badge */}
            <div className="inline-flex items-center gap-2 rounded-full border border-[#DDE3DD] dark:border-[#285A48] bg-white dark:bg-[#12211E] px-4 py-1.5 text-xs sm:text-sm font-semibold text-[#34413A] dark:text-[#E3F5EC] shadow-2xs w-fit mb-5 sm:mb-6 transition-colors">
              <span className="w-2 h-2 rounded-full bg-[#086948] dark:bg-[#8bd5b9] shrink-0" />
              <span>About us</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-3xl sm:text-5xl lg:text-[54px] font-extrabold tracking-tight text-[#0C1511] dark:text-[#E3F5EC] leading-[1.06]">
              We are{" "}
              <span className="text-[#086948] dark:text-[#8bd5b9]">
                Own Technology
              </span>
              , the team behind your tech
            </h1>

            {/* Subtitle */}
            <p className="mt-5 text-lg sm:text-[19px] font-semibold text-[#0C1511] dark:text-[#E3F5EC] leading-snug max-w-xl">
              We make technology simple, connected and reliable for growing businesses.
            </p>

            {/* Body Description */}
            <p className="mt-4 text-sm sm:text-[17px] text-[#4B5750] dark:text-[#9bb7ab] leading-relaxed max-w-2xl font-normal">
              Own Technology brings your CRM, project management, website, search visibility, custom applications and AI tools together under one team. Instead of juggling separate vendors, you get one partner who understands the whole picture, builds what you need and keeps it running.
            </p>

            {/* CTA Buttons */}
            <div className="mt-7 sm:mt-8 flex flex-wrap items-center gap-3.5 sm:gap-4">
              <Link
                href="/contact"
                className="inline-flex items-center gap-2 rounded-full bg-[#0C1511] hover:bg-[#202c25] dark:bg-[#8bd5b9] dark:hover:bg-[#a6f2d4] text-white dark:text-[#091413] px-7 py-3.5 text-sm sm:text-base font-semibold transition-all duration-200 shadow-sm hover:scale-[1.02] active:scale-[0.98]"
              >
                <span>Talk to our team</span>
                <ArrowRight className="w-4 h-4" />
              </Link>

              <Link
                href="/services"
                className="inline-flex items-center justify-center rounded-full border-2 border-[#0C1511] dark:border-[#8bd5b9] text-[#0C1511] dark:text-[#E3F5EC] hover:bg-black/5 dark:hover:bg-[#8bd5b9]/10 px-7 py-3.5 text-sm sm:text-base font-semibold transition-all duration-200"
              >
                See our services
              </Link>
            </div>
          </div>

          {/* RIGHT COLUMN: Overlapping Cards Graphic (How We Work & One Connected Team) */}
          <div className="lg:col-span-5 flex items-center justify-center lg:justify-end">
            <div className="relative w-full max-w-[480px] sm:max-w-[520px] h-[370px] sm:h-[400px]">
              
              {/* Back Card: Emerald Base Accent Shape */}
              <div className="absolute inset-0 rounded-[32px] bg-[#086948] dark:bg-[#134e3a] shadow-lg shadow-[#086948]/20 transition-colors" />

              {/* Front White Card: How We Work */}
              <div className="absolute left-4 sm:left-8 top-4 sm:top-8 w-[84%] sm:w-[370px] bg-white dark:bg-[#12211E] rounded-[22px] p-5 sm:p-6 shadow-md border border-black/5 dark:border-[#285A48] z-10 transition-colors">
                <div className="text-xs font-bold tracking-wider uppercase text-[#086948] dark:text-[#8bd5b9] font-mono mb-3.5">
                  How we work
                </div>

                <div className="divide-y divide-[#E6ECE6] dark:divide-[#244238]">
                  {/* Step 1 */}
                  <div className="flex items-center gap-3.5 py-2.5">
                    <div className="w-8 h-8 rounded-full bg-[#086948]/10 dark:bg-[#8bd5b9]/15 text-[#086948] dark:text-[#8bd5b9] flex items-center justify-center font-bold text-xs shrink-0">
                      1
                    </div>
                    <div className="text-sm font-semibold text-[#0C1511] dark:text-[#E3F5EC]">
                      Listen to your goals
                    </div>
                  </div>

                  {/* Step 2 */}
                  <div className="flex items-center gap-3.5 py-2.5">
                    <div className="w-8 h-8 rounded-full bg-[#086948]/10 dark:bg-[#8bd5b9]/15 text-[#086948] dark:text-[#8bd5b9] flex items-center justify-center font-bold text-xs shrink-0">
                      2
                    </div>
                    <div className="text-sm font-semibold text-[#0C1511] dark:text-[#E3F5EC]">
                      Plan the right setup
                    </div>
                  </div>

                  {/* Step 3 */}
                  <div className="flex items-center gap-3.5 py-2.5">
                    <div className="w-8 h-8 rounded-full bg-[#086948]/10 dark:bg-[#8bd5b9]/15 text-[#086948] dark:text-[#8bd5b9] flex items-center justify-center font-bold text-xs shrink-0">
                      3
                    </div>
                    <div className="text-sm font-semibold text-[#0C1511] dark:text-[#E3F5EC]">
                      Build and connect
                    </div>
                  </div>

                  {/* Step 4 */}
                  <div className="flex items-center gap-3.5 pt-2.5">
                    <div className="w-8 h-8 rounded-full bg-[#086948] dark:bg-[#8bd5b9] text-white dark:text-[#091413] flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                      4
                    </div>
                    <div className="text-sm font-semibold text-[#0C1511] dark:text-[#E3F5EC]">
                      Support and improve
                    </div>
                  </div>
                </div>
              </div>

              {/* Floating Dark Card: One Connected Team */}
              <div className="absolute right-3 sm:right-6 bottom-3 sm:bottom-6 w-[210px] sm:w-[245px] bg-[#0C1511] dark:bg-[#06100f] text-white rounded-[22px] p-4 sm:p-5 shadow-2xl border border-white/10 dark:border-[#285A48] z-20">
                <div className="w-10 h-10 rounded-xl bg-[#1B2A22] text-[#6EE7B7] flex items-center justify-center mb-3">
                  <Share2 className="w-5 h-5" />
                </div>
                <div className="text-base font-bold text-white mb-1">
                  One connected team
                </div>
                <div className="text-xs text-[#A8B5AD] leading-relaxed">
                  CRM, web, apps and AI planned together.
                </div>
              </div>

            </div>
          </div>

        </div>

        {/* ========================================================================= */}
        {/* 2. 4 VALUE / PRINCIPLE CARDS                                              */}
        {/* ========================================================================= */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          
          {/* Card 1: Clarity first */}
          <div className="bg-white dark:bg-[#12211E] border border-[#DDE3DD] dark:border-[#285A48] rounded-[24px] p-6 sm:p-7 flex flex-col justify-between min-h-[200px] shadow-sm hover:shadow-md transition-all text-left">
            <div className="w-11 h-11 rounded-2xl bg-[#086948]/10 dark:bg-[#8bd5b9]/15 text-[#086948] dark:text-[#8bd5b9] flex items-center justify-center mb-6">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-[#0C1511] dark:text-[#E3F5EC] tracking-tight">
                Clarity first
              </h3>
              <p className="mt-1.5 text-xs sm:text-sm text-[#4B5750] dark:text-[#9bb7ab] leading-relaxed">
                Plain language, clear plans and no surprises.
              </p>
            </div>
          </div>

          {/* Card 2: Built to connect */}
          <div className="bg-white dark:bg-[#12211E] border border-[#DDE3DD] dark:border-[#285A48] rounded-[24px] p-6 sm:p-7 flex flex-col justify-between min-h-[200px] shadow-sm hover:shadow-md transition-all text-left">
            <div className="w-11 h-11 rounded-2xl bg-[#086948]/10 dark:bg-[#8bd5b9]/15 text-[#086948] dark:text-[#8bd5b9] flex items-center justify-center mb-6">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-[#0C1511] dark:text-[#E3F5EC] tracking-tight">
                Built to connect
              </h3>
              <p className="mt-1.5 text-xs sm:text-sm text-[#4B5750] dark:text-[#9bb7ab] leading-relaxed">
                Tools that share data instead of living in silos.
              </p>
            </div>
          </div>

          {/* Card 3: Quality craft */}
          <div className="bg-white dark:bg-[#12211E] border border-[#DDE3DD] dark:border-[#285A48] rounded-[24px] p-6 sm:p-7 flex flex-col justify-between min-h-[200px] shadow-sm hover:shadow-md transition-all text-left">
            <div className="w-11 h-11 rounded-2xl bg-[#086948]/10 dark:bg-[#8bd5b9]/15 text-[#086948] dark:text-[#8bd5b9] flex items-center justify-center mb-6">
              <Code2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-[#0C1511] dark:text-[#E3F5EC] tracking-tight">
                Quality craft
              </h3>
              <p className="mt-1.5 text-xs sm:text-sm text-[#4B5750] dark:text-[#9bb7ab] leading-relaxed">
                Clean, maintainable work we are proud to put our name on.
              </p>
            </div>
          </div>

          {/* Card 4: Long-term partner (Black Milestone Card) */}
          <div className="bg-[#0C1511] dark:bg-[#06100f] text-white border border-black/20 dark:border-[#285A48] rounded-[24px] p-6 sm:p-7 flex flex-col justify-between min-h-[200px] shadow-lg shadow-black/10 hover:shadow-xl transition-all text-left">
            <div className="w-11 h-11 rounded-2xl bg-[#1B2A22] text-[#6EE7B7] flex items-center justify-center mb-6">
              <AppWindow className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white tracking-tight">
                Long-term partner
              </h3>
              <p className="mt-1.5 text-xs sm:text-sm text-[#A8B5AD] leading-relaxed">
                We stay on to manage, maintain and improve.
              </p>
            </div>
          </div>

        </div>

        {/* ========================================================================= */}
        {/* 3. BOTTOM CTA BANNER                                                      */}
        {/* ========================================================================= */}
        <div className="rounded-[28px] bg-[#086948] dark:bg-[#134e3a] text-white p-7 sm:p-9 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-md transition-colors">
          <div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight leading-snug">
              Ready to put your technology in one place?
            </h2>
            <p className="mt-1.5 text-sm sm:text-base text-white/85 max-w-xl">
              Tell us what you are working on and we will suggest the first step.
            </p>
          </div>

          <Link
            href="/contact"
            className="inline-flex items-center justify-center shrink-0 rounded-full bg-white hover:bg-gray-100 text-[#0C1511] px-7 py-3.5 text-sm sm:text-base font-semibold transition-all duration-200 shadow-sm hover:scale-[1.02] active:scale-[0.98]"
          >
            Contact us
          </Link>
        </div>

      </div>
    </section>
  );
}
