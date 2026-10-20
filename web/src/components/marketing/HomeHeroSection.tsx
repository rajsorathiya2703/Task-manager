"use client";

import Link from "next/link";
import {
  ArrowRight,
  UserCheck,
  AppWindow,
  Code2,
  Columns3,
  Search,
  Share2,
  Box,
} from "lucide-react";


export function HomeHeroSection() {
  const scrollToServices = () => {
    const el = document.getElementById("services-detail-section");
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="home-theme-scope relative isolate overflow-hidden bg-[var(--home-bg)] text-[var(--home-text-body)] transition-colors duration-300">
      {/* ========================================================================= */}
      {/* 1. EXACT HERO SECTION MATCHING DESIGN SPECIFICATION                       */}
      {/* ========================================================================= */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 sm:pt-12 pb-10 sm:pb-14">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8 items-center">

          {/* LEFT COLUMN: Welcome Message, Subtext, Paragraph & Buttons */}
          <div className="lg:col-span-6 xl:col-span-6 flex flex-col justify-center text-left">
            {/* Top Pill / Badge */}
            <div className="inline-flex items-center gap-2 rounded-full border border-black/15 dark:border-[#285A48] bg-white/90 dark:bg-[#12211E]/95 backdrop-blur-sm px-3.5 py-1.5 text-xs font-semibold text-[#161e12] dark:text-[#E3F5EC] shadow-xs w-fit mb-6 sm:mb-8 transition-colors">
              <span className="w-2 h-2 rounded-full bg-[#086948] dark:bg-[#8bd5b9] shrink-0" />
              <span>CRM · Websites · Applications · AI integrations</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-[4.25rem] font-extrabold tracking-tight leading-[1.08]">
              <span className="block text-[#161e12] dark:text-[#F3FDF8]">
                Welcome to
              </span>
              <span className="block text-[#086948] dark:text-[#8bd5b9] mt-0.5">
                Own Technology
              </span>
            </h1>

            {/* Subtext Line */}
            <p className="mt-5 sm:mt-6 text-lg sm:text-xl font-bold tracking-tight text-[#161e12] dark:text-[#E3F5EC] leading-snug max-w-xl">
              Your end-to-end technology partner for CRM, websites, applications and AI.
            </p>

            {/* Introduction Paragraph */}
            <p className="mt-4 sm:mt-5 text-sm sm:text-[15px] text-[#374151] dark:text-[#9bb7ab] leading-relaxed max-w-xl font-normal">
              We help growing businesses run smarter. From configuring Odoo and HubSpot CRM and managing your projects, to designing and maintaining your website, ranking it in search and AI answers, building custom applications and connecting your tools to AI through MCP — one team, one roadmap.
            </p>

            {/* Two Action Buttons */}
            <div className="mt-8 sm:mt-10 flex flex-wrap items-center gap-3 sm:gap-4">
              <Link
                href="/contact"
                className="inline-flex items-center gap-2 rounded-full bg-[#161e12] hover:bg-[#2b3325] dark:bg-[#8bd5b9] dark:hover:bg-[#a6f2d4] text-white dark:text-[#091413] px-7 py-3.5 text-sm font-semibold transition-all duration-200 shadow-sm hover:scale-[1.02] active:scale-[0.98]"
              >
                <span>Talk to our team</span>
                <ArrowRight className="w-4 h-4" />
              </Link>

              <button
                type="button"
                onClick={scrollToServices}
                className="inline-flex items-center justify-center rounded-full border-2 border-[#161e12] dark:border-[#8bd5b9] bg-transparent hover:bg-black/5 dark:hover:bg-[#8bd5b9]/10 text-[#161e12] dark:text-[#E3F5EC] px-7 py-3.5 text-sm font-semibold transition-all duration-200"
              >
                Explore our services
              </button>
            </div>
          </div>

          {/* RIGHT COLUMN: 6 Floating Service Cards with Organic Curved Backdrop */}
          <div className="lg:col-span-6 xl:col-span-6 relative flex items-center justify-center lg:justify-end mt-4 lg:mt-0">
            {/* Background Organic Curved Backdrop Shape */}
            <div
              className="absolute right-0 sm:right-2 top-1/2 -translate-y-1/2 w-[340px] sm:w-[440px] lg:w-[480px] h-[440px] sm:h-[520px] lg:h-[560px] rounded-[100px] sm:rounded-[140px] bg-[#d3e5d7] dark:bg-[#142d24] -z-10 pointer-events-none transition-colors duration-300"
              aria-hidden="true"
            />

            {/* 2-Column Grid of 6 Distinctive Cards */}
            <div className="grid grid-cols-2 gap-3.5 sm:gap-4 lg:gap-5 w-full max-w-[480px] sm:max-w-[520px]">

              {/* COLUMN 1: Cards 1, 2, 3 */}
              <div className="flex flex-col gap-3.5 sm:gap-4 lg:gap-5">
                {/* 1. CRM Setup Card (White in light, Elevation 1 in dark) */}
                <div className="group rounded-[22px] sm:rounded-[26px] bg-white dark:bg-[#12211E] border border-black/5 dark:border-[#285A48] p-4 sm:p-5 shadow-lg shadow-black/5 hover:shadow-xl transition-all duration-200 text-left">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#e6f4ed] dark:bg-[#1b3b30] flex items-center justify-center text-[#086948] dark:text-[#8bd5b9] mb-3 sm:mb-4">
                    <UserCheck className="w-5 h-5 sm:w-5 sm:h-5" />
                  </div>
                  <h3 className="text-sm sm:text-base font-bold text-[#161e12] dark:text-[#E3F5EC] tracking-tight leading-snug">
                    CRM Setup
                  </h3>
                  <p className="text-[11px] sm:text-xs text-[#555e58] dark:text-[#86A99A] font-medium mt-1">
                    Odoo · HubSpot
                  </p>
                </div>

                {/* 2. Websites Card (Dark Obsidian / Forest Black in both modes for striking contrast) */}
                <div className="group rounded-[22px] sm:rounded-[26px] bg-[#0e1916] dark:bg-[#06100f] border border-black/20 dark:border-[#285A48] p-4 sm:p-5 shadow-lg shadow-black/15 hover:shadow-xl transition-all duration-200 text-left">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#193327] dark:bg-[#142922] flex items-center justify-center text-[#5eead4] dark:text-[#8bd5b9] mb-3 sm:mb-4">
                    <AppWindow className="w-5 h-5 sm:w-5 sm:h-5" />
                  </div>
                  <h3 className="text-sm sm:text-base font-bold text-white tracking-tight leading-snug">
                    Websites
                  </h3>
                  <p className="text-[11px] sm:text-xs text-[#9ca3af] font-medium mt-1">
                    Design · Manage · Maintain
                  </p>
                </div>

                {/* 3. Applications Card (White in light, Elevation 1 in dark) */}
                <div className="group rounded-[22px] sm:rounded-[26px] bg-white dark:bg-[#12211E] border border-black/5 dark:border-[#285A48] p-4 sm:p-5 shadow-lg shadow-black/5 hover:shadow-xl transition-all duration-200 text-left">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#e6f4ed] dark:bg-[#1b3b30] flex items-center justify-center text-[#086948] dark:text-[#8bd5b9] mb-3 sm:mb-4">
                    <Code2 className="w-5 h-5 sm:w-5 sm:h-5" />
                  </div>
                  <h3 className="text-sm sm:text-base font-bold text-[#161e12] dark:text-[#E3F5EC] tracking-tight leading-snug">
                    Applications
                  </h3>
                  <p className="text-[11px] sm:text-xs text-[#555e58] dark:text-[#86A99A] font-medium mt-1">
                    Custom web &amp; business apps
                  </p>
                </div>
              </div>

              {/* COLUMN 2: Cards 4, 5, 6 (Offset Downward) */}
              <div className="flex flex-col gap-3.5 sm:gap-4 lg:gap-5 pt-6 sm:pt-8">
                {/* 4. Project Management Card (Frosted Tinted Sage in light, Tier 2 in dark) */}
                <div className="group rounded-[22px] sm:rounded-[26px] bg-[#dce9df] dark:bg-[#1B332B] border border-[#c8ded0] dark:border-[#285A48] p-4 sm:p-5 shadow-lg shadow-black/5 backdrop-blur-xs hover:shadow-xl transition-all duration-200 text-left">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white/95 dark:bg-[#12211E] flex items-center justify-center text-[#086948] dark:text-[#8bd5b9] mb-3 sm:mb-4 shadow-2xs">
                    <Columns3 className="w-5 h-5 sm:w-5 sm:h-5" />
                  </div>
                  <h3 className="text-sm sm:text-base font-bold text-[#161e12] dark:text-[#E3F5EC] tracking-tight leading-snug">
                    Project Management
                  </h3>
                  <p className="text-[11px] sm:text-xs text-[#425047] dark:text-[#86A99A] font-medium mt-1">
                    Boards · Timelines
                  </p>
                </div>

                {/* 5. SEO & AEO Card (White in light, Elevation 1 in dark) */}
                <div className="group rounded-[22px] sm:rounded-[26px] bg-white dark:bg-[#12211E] border border-black/5 dark:border-[#285A48] p-4 sm:p-5 shadow-lg shadow-black/5 hover:shadow-xl transition-all duration-200 text-left">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#e6f4ed] dark:bg-[#1b3b30] flex items-center justify-center text-[#086948] dark:text-[#8bd5b9] mb-3 sm:mb-4">
                    <Search className="w-5 h-5 sm:w-5 sm:h-5" />
                  </div>
                  <h3 className="text-sm sm:text-base font-bold text-[#161e12] dark:text-[#E3F5EC] tracking-tight leading-snug">
                    SEO &amp; AEO
                  </h3>
                  <p className="text-[11px] sm:text-xs text-[#555e58] dark:text-[#86A99A] font-medium mt-1">
                    Search + AI answers
                  </p>
                </div>

                {/* 6. MCP Integration Card (Deep Rich Forest Green) */}
                <div className="group rounded-[22px] sm:rounded-[26px] bg-[#086948] dark:bg-[#16543e] border border-[#06543a] dark:border-[#285A48] p-4 sm:p-5 shadow-lg shadow-black/15 hover:shadow-xl transition-all duration-200 text-left">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#127d58] dark:bg-[#1f634b] flex items-center justify-center text-white mb-3 sm:mb-4">
                    <Share2 className="w-5 h-5 sm:w-5 sm:h-5" />
                  </div>
                  <h3 className="text-sm sm:text-base font-bold text-white tracking-tight leading-snug">
                    MCP Integration
                  </h3>
                  <p className="text-[11px] sm:text-xs text-[#a7f3d0] font-medium mt-1">
                    Connect AI to your apps
                  </p>
                </div>
              </div>

            </div>
          </div>

        </div>
      </section>

      {/* ========================================================================= */}
      {/* 2. SIX SERVICES, ONE CONNECTED TEAM (EXACT MATCH TO REFERENCE IMAGE)      */}
      {/* ========================================================================= */}
      <section
        id="services-detail-section"
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 border-t border-[var(--home-border)]"
      >
        {/* Header Block */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-8 sm:pb-10">
          <div>
            <div className="text-xs sm:text-sm font-bold tracking-widest text-[#086948] dark:text-[#8bd5b9] uppercase font-mono mb-2.5">
              WHAT WE DO
            </div>
            <h2 className="text-3xl sm:text-5xl lg:text-[3.5rem] font-extrabold tracking-tight text-[#161e12] dark:text-[#E3F5EC] leading-[1.12]">
              Six services,
              <br />
              one connected team
            </h2>
          </div>
          <p className="text-sm sm:text-base text-[#374151] dark:text-[#9bb7ab] max-w-sm leading-relaxed pb-1">
            Pick one service or combine them. Everything we build is designed to work together.
          </p>
        </div>

        {/* Bento Grid: 2 Tier Layout */}
        <div className="space-y-6">
          {/* Top Row: Flex / 3-Column Layout */}
          <div className="flex flex-col lg:flex-row gap-6 items-stretch">

            {/* Card 1: CRM setup and configuration (Big Green Card with Pipeline) */}
            <div className="flex-1 lg:flex-[1.3] rounded-[32px] bg-[#086948] dark:bg-[#134e3a] p-7 sm:p-9 text-white flex flex-col justify-between shadow-lg shadow-black/5 relative overflow-hidden">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center text-white mb-6">
                  <UserCheck className="w-6 h-6" />
                </div>
                <h3 className="text-2xl sm:text-3xl font-bold text-white tracking-tight leading-snug">
                  CRM setup and configuration
                </h3>
                <p className="mt-3 text-sm sm:text-[15px] text-white/85 leading-relaxed max-w-md">
                  We install, configure and tailor Odoo CRM and HubSpot CRM to your sales process, so every lead, deal and follow-up lives in one place.
                </p>
              </div>

              {/* CRM Pipeline Graphic (New, Qualified, Proposal, Won) */}
              <div className="mt-8 pt-4 grid grid-cols-4 gap-2 sm:gap-2.5">
                {/* Stage 1: New */}
                <div className="rounded-xl bg-white/10 border border-white/10 p-2.5 flex flex-col justify-between h-20">
                  <span className="text-[10px] sm:text-xs font-semibold text-white/90">New</span>
                  <div className="space-y-1.5">
                    <div className="h-1.5 bg-white/40 rounded-full w-full" />
                    <div className="h-1.5 bg-white/25 rounded-full w-2/3" />
                  </div>
                </div>

                {/* Stage 2: Qualified */}
                <div className="rounded-xl bg-white/10 border border-white/10 p-2.5 flex flex-col justify-between h-20">
                  <span className="text-[10px] sm:text-xs font-semibold text-white/90">Qualified</span>
                  <div className="space-y-1.5">
                    <div className="h-1.5 bg-white/40 rounded-full w-full" />
                    <div className="h-1.5 bg-white/25 rounded-full w-1/2" />
                  </div>
                </div>

                {/* Stage 3: Proposal */}
                <div className="rounded-xl bg-white/10 border border-white/10 p-2.5 flex flex-col justify-between h-20">
                  <span className="text-[10px] sm:text-xs font-semibold text-white/90">Proposal</span>
                  <div className="space-y-1.5">
                    <div className="h-1.5 bg-white/40 rounded-full w-full" />
                    <div className="h-1.5 bg-white/25 rounded-full w-3/4" />
                  </div>
                </div>

                {/* Stage 4: Won (Active highlighted white card) */}
                <div className="rounded-xl bg-white text-[#086948] p-2.5 flex flex-col justify-between h-20 shadow-md">
                  <span className="text-[10px] sm:text-xs font-bold text-[#086948]">Won</span>
                  <div className="h-2 bg-[#086948] rounded-full w-full" />
                </div>
              </div>
            </div>

            {/* Middle Column: 2 Stacked Cards (Project management & SEO/AEO) */}
            <div className="flex-1 lg:flex-[0.85] flex flex-col gap-6 justify-between">
              {/* Card 2: Project management tool */}
              <div className="rounded-[32px] bg-white dark:bg-[#12211E] border border-black/5 dark:border-[#285A48] p-6 sm:p-7 shadow-sm flex flex-col justify-center flex-1 text-left">
                <div className="w-11 h-11 rounded-2xl bg-[#e6f4ed] dark:bg-[#1b3b30] flex items-center justify-center text-[#086948] dark:text-[#8bd5b9] mb-4">
                  <Columns3 className="w-5 h-5" />
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-[#161e12] dark:text-[#E3F5EC] tracking-tight">
                  Project management tool
                </h3>
                <p className="mt-2 text-xs sm:text-sm text-[#555e58] dark:text-[#86A99A] leading-relaxed">
                  Boards, tasks and timelines so your team always knows what is next.
                </p>
              </div>

              {/* Card 3: SEO and AEO */}
              <div className="rounded-[32px] bg-[#dce9df] dark:bg-[#1B332B] border border-[#c8ded0] dark:border-[#285A48] p-6 sm:p-7 shadow-sm flex flex-col justify-center flex-1 text-left">
                <div className="w-11 h-11 rounded-2xl bg-white dark:bg-[#12211E] flex items-center justify-center text-[#086948] dark:text-[#8bd5b9] mb-4 shadow-2xs">
                  <Search className="w-5 h-5" />
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-[#161e12] dark:text-[#E3F5EC] tracking-tight">
                  SEO and AEO
                </h3>
                <p className="mt-2 text-xs sm:text-sm text-[#425047] dark:text-[#86A99A] leading-relaxed">
                  Get found in search results and quoted in AI answers.
                </p>
              </div>
            </div>

            {/* Card 4: Website design, management and maintenance */}
            <div className="flex-1 lg:flex-[0.95] rounded-[32px] bg-[#0e1916] dark:bg-[#06100f] border border-black/20 dark:border-[#285A48] p-6 sm:p-8 text-white flex flex-col justify-between shadow-lg shadow-black/5 text-left">
              <div>
                <div className="w-11 h-11 rounded-2xl bg-[#193327] dark:bg-[#142922] flex items-center justify-center text-[#5eead4] dark:text-[#8bd5b9] mb-4">
                  <AppWindow className="w-5 h-5" />
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-white tracking-tight leading-snug">
                  Website design, management and maintenance
                </h3>
                <p className="mt-2 text-xs sm:text-sm text-[#9ca3af] leading-relaxed">
                  A site that looks sharp, loads fast and stays updated and secure.
                </p>
              </div>

              {/* Website / Browser Mockup Graphic */}
              <div className="mt-8 rounded-2xl bg-[#15231f] dark:bg-[#0c1613] border border-white/10 p-3.5">
                <div className="flex items-center gap-1.5 mb-3">
                  <div className="w-2 h-2 rounded-full bg-white/20" />
                  <div className="w-2 h-2 rounded-full bg-white/20" />
                  <div className="w-2 h-2 rounded-full bg-white/20" />
                </div>
                {/* Mint Hero Banner */}
                <div className="h-7 bg-[#5eead4] rounded-lg w-full mb-2.5 opacity-90" />
                {/* Two bottom content cards */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="h-6 bg-white/10 rounded-md" />
                  <div className="h-6 bg-white/10 rounded-md" />
                </div>
              </div>
            </div>

          </div>

          {/* Bottom Row: 2 Cards Side-by-Side (50% / 50%) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">

            {/* Card 5: Application development */}
            <div className="rounded-[32px] bg-white dark:bg-[#12211E] border border-black/5 dark:border-[#285A48] p-7 sm:p-8 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-6 text-left">
              <div className="flex-1">
                <div className="w-11 h-11 rounded-2xl bg-[#e6f4ed] dark:bg-[#1b3b30] flex items-center justify-center text-[#086948] dark:text-[#8bd5b9] mb-4">
                  <Code2 className="w-5 h-5" />
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-[#161e12] dark:text-[#E3F5EC] tracking-tight">
                  Application development
                </h3>
                <p className="mt-2 text-xs sm:text-sm text-[#555e58] dark:text-[#86A99A] leading-relaxed max-w-sm">
                  Custom web and business applications built around how you work.
                </p>
              </div>

              {/* Code Snippet Box */}
              <div className="rounded-2xl bg-[#0c1513] border border-black/20 p-4 font-mono text-xs w-full sm:w-56 shrink-0 shadow-md">
                <div className="text-gray-400">
                  <span className="text-[#38bdf8]">const</span> app = <span className="text-[#4ade80]">build</span>();
                </div>
                <div className="text-gray-400 mt-1.5">
                  app.<span className="text-[#38bdf8]">test</span>();
                </div>
                <div className="text-gray-400 mt-1.5">
                  app.<span className="text-[#38bdf8]">ship</span>();
                </div>
              </div>
            </div>

            {/* Card 6: MCP for your business apps */}
            <div className="rounded-[32px] bg-[#0c1b16] dark:bg-[#081612] border border-[#1b382d] p-7 sm:p-8 text-white shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-6 text-left">
              <div className="flex-1">
                <div className="w-11 h-11 rounded-2xl bg-[#193b2f] flex items-center justify-center text-[#5eead4] mb-4">
                  <Share2 className="w-5 h-5" />
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                  MCP for your business apps
                </h3>
                <p className="mt-2 text-xs sm:text-sm text-gray-300 leading-relaxed max-w-sm">
                  Connect AI assistants safely to your CRM, data and tools using Model Context Protocol.
                </p>
              </div>

              {/* MCP Network Graph Graphic */}
              <div className="relative w-36 h-28 sm:w-40 sm:h-32 shrink-0 flex items-center justify-center mx-auto sm:mx-0">
                {/* SVG connection lines */}
                <svg className="absolute inset-0 w-full h-full" viewBox="0 0 160 128" fill="none">
                  <line x1="80" y1="64" x2="28" y2="28" stroke="#34d399" strokeWidth="1.5" strokeOpacity="0.6" />
                  <line x1="80" y1="64" x2="132" y2="28" stroke="#34d399" strokeWidth="1.5" strokeOpacity="0.6" />
                  <line x1="80" y1="64" x2="28" y2="100" stroke="#34d399" strokeWidth="1.5" strokeOpacity="0.6" />
                  <line x1="80" y1="64" x2="132" y2="100" stroke="#34d399" strokeWidth="1.5" strokeOpacity="0.6" />
                </svg>
                {/* Satellite Nodes (4 corners) */}
                <div className="absolute top-4 left-4 w-5 h-5 rounded-full border-2 border-[#5eead4] bg-[#0c1b16]" />
                <div className="absolute top-4 right-4 w-5 h-5 rounded-full border-2 border-[#5eead4] bg-[#0c1b16]" />
                <div className="absolute bottom-4 left-4 w-5 h-5 rounded-full border-2 border-[#5eead4] bg-[#0c1b16]" />
                <div className="absolute bottom-4 right-4 w-5 h-5 rounded-full border-2 border-[#5eead4] bg-[#0c1b16]" />
                {/* Central MCP Hub Node */}
                <div className="relative z-10 w-9 h-9 rounded-full bg-[#059669] border-2 border-[#5eead4] shadow-lg shadow-[#059669]/50 flex items-center justify-center" />
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 3. STEPPER PROGRESSION: FROM FIRST CUSTOMER TO AI-READY (EXACT MATCH)     */}
      {/* ========================================================================= */}
      <section
        id="growth-journey-section"
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 sm:pt-14 pb-10 sm:pb-14 lg:pb-50 border-t border-[var(--home-border)] overflow-hidden"
      >
        {/* Header Block */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-8 sm:pb-10">
          <div>
            <div className="text-xs sm:text-sm font-bold tracking-widest text-[#086948] dark:text-[#8bd5b9] uppercase font-mono mb-2.5">
              HOW WE HELP YOU GROW
            </div>
            <h2 className="text-3xl sm:text-5xl lg:text-[3.5rem] font-extrabold tracking-tight text-[#161e12] dark:text-[#E3F5EC] leading-[1.12]">
              From first customer to AI-ready
            </h2>
          </div>
          <p className="text-sm sm:text-base text-[#374151] dark:text-[#9bb7ab] max-w-sm leading-relaxed pb-1">
            Start where you are. Each service builds on the one before it.
          </p>
        </div>

        {/* Stepper / Staircase 6 Cards Container */}
        <div className="relative pt-1">
          {/* Stepped Row of 6 Cards with per-step connector lines */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 sm:gap-5 relative z-10">

            {/* Step 1: CRM setup */}
            <div className="flex flex-col lg:translate-y-0 transition-transform">
              <div className="flex items-center mb-3.5 w-full">
                <span className="w-8 h-8 rounded-full bg-[#086948] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-sm z-10">
                  1
                </span>
                <div className="flex-1 h-[2px] bg-[#9ecdbd] dark:bg-[#285A48] ml-2" />
              </div>

              <div className="rounded-[24px] bg-white dark:bg-[#12211E] border border-black/5 dark:border-[#285A48] p-5 shadow-sm hover:shadow-md transition-all text-left flex-1 flex flex-col justify-between min-h-[220px]">
                <div>
                  <div className="w-9 h-9 rounded-xl bg-[#e6f4ed] dark:bg-[#1b3b30] flex items-center justify-center text-[#086948] dark:text-[#8bd5b9] mb-4">
                    <UserCheck className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-bold text-[#161e12] dark:text-[#E3F5EC] tracking-tight">
                    CRM setup
                  </h3>
                  <p className="mt-2 text-xs text-[#555e58] dark:text-[#86A99A] leading-relaxed">
                    Odoo CRM and HubSpot CRM configured around your sales process.
                  </p>
                </div>
              </div>
            </div>

            {/* Step 2: Project management */}
            <div className="flex flex-col lg:translate-y-6 sm:lg:translate-y-8 transition-transform">
              <div className="flex items-center mb-3.5 w-full">
                <span className="w-8 h-8 rounded-full bg-[#086948] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-sm z-10">
                  2
                </span>
                <div className="flex-1 h-[2px] bg-[#9ecdbd] dark:bg-[#285A48] ml-2" />
              </div>

              <div className="rounded-[24px] bg-white dark:bg-[#12211E] border border-black/5 dark:border-[#285A48] p-5 shadow-sm hover:shadow-md transition-all text-left flex-1 flex flex-col justify-between min-h-[220px]">
                <div>
                  <div className="w-9 h-9 rounded-xl bg-[#e6f4ed] dark:bg-[#1b3b30] flex items-center justify-center text-[#086948] dark:text-[#8bd5b9] mb-4">
                    <Columns3 className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-bold text-[#161e12] dark:text-[#E3F5EC] tracking-tight">
                    Project management
                  </h3>
                  <p className="mt-2 text-xs text-[#555e58] dark:text-[#86A99A] leading-relaxed">
                    A project management tool to organise tasks, owners and deadlines.
                  </p>
                </div>
              </div>
            </div>

            {/* Step 3: Website */}
            <div className="flex flex-col lg:translate-y-12 sm:lg:translate-y-16 transition-transform">
              <div className="flex items-center mb-3.5 w-full">
                <span className="w-8 h-8 rounded-full bg-[#086948] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-sm z-10">
                  3
                </span>
                <div className="flex-1 h-[2px] bg-[#9ecdbd] dark:bg-[#285A48] ml-2" />
              </div>

              <div className="rounded-[24px] bg-white dark:bg-[#12211E] border border-black/5 dark:border-[#285A48] p-5 shadow-sm hover:shadow-md transition-all text-left flex-1 flex flex-col justify-between min-h-[220px]">
                <div>
                  <div className="w-9 h-9 rounded-xl bg-[#e6f4ed] dark:bg-[#1b3b30] flex items-center justify-center text-[#086948] dark:text-[#8bd5b9] mb-4">
                    <AppWindow className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-bold text-[#161e12] dark:text-[#E3F5EC] tracking-tight">
                    Website
                  </h3>
                  <p className="mt-2 text-xs text-[#555e58] dark:text-[#86A99A] leading-relaxed">
                    Design, management and maintenance for a site that stays sharp.
                  </p>
                </div>
              </div>
            </div>

            {/* Step 4: SEO and AEO */}
            <div className="flex flex-col lg:translate-y-18 sm:lg:translate-y-24 transition-transform">
              <div className="flex items-center mb-3.5 w-full">
                <span className="w-8 h-8 rounded-full bg-[#086948] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-sm z-10">
                  4
                </span>
                <div className="flex-1 h-[2px] bg-[#9ecdbd] dark:bg-[#285A48] ml-2" />
              </div>

              <div className="rounded-[24px] bg-white dark:bg-[#12211E] border border-black/5 dark:border-[#285A48] p-5 shadow-sm hover:shadow-md transition-all text-left flex-1 flex flex-col justify-between min-h-[220px]">
                <div>
                  <div className="w-9 h-9 rounded-xl bg-[#e6f4ed] dark:bg-[#1b3b30] flex items-center justify-center text-[#086948] dark:text-[#8bd5b9] mb-4">
                    <Search className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-bold text-[#161e12] dark:text-[#E3F5EC] tracking-tight">
                    SEO and AEO
                  </h3>
                  <p className="mt-2 text-xs text-[#555e58] dark:text-[#86A99A] leading-relaxed">
                    Managed optimisation so customers find you in search and AI answers.
                  </p>
                </div>
              </div>
            </div>

            {/* Step 5: Applications */}
            <div className="flex flex-col lg:translate-y-24 sm:lg:translate-y-32 transition-transform">
              <div className="flex items-center mb-3.5 w-full">
                <span className="w-8 h-8 rounded-full bg-[#086948] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-sm z-10">
                  5
                </span>
                <div className="flex-1 h-[2px] bg-[#9ecdbd] dark:bg-[#285A48] ml-2" />
              </div>

              <div className="rounded-[24px] bg-white dark:bg-[#12211E] border border-black/5 dark:border-[#285A48] p-5 shadow-sm hover:shadow-md transition-all text-left flex-1 flex flex-col justify-between min-h-[220px]">
                <div>
                  <div className="w-9 h-9 rounded-xl bg-[#e6f4ed] dark:bg-[#1b3b30] flex items-center justify-center text-[#086948] dark:text-[#8bd5b9] mb-4">
                    <Code2 className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-bold text-[#161e12] dark:text-[#E3F5EC] tracking-tight">
                    Applications
                  </h3>
                  <p className="mt-2 text-xs text-[#555e58] dark:text-[#86A99A] leading-relaxed">
                    Custom application development for the work only you do.
                  </p>
                </div>
              </div>
            </div>

            {/* Step 6: MCP tools (Black Highlight Milestone Card) */}
            <div className="flex flex-col lg:translate-y-30 sm:lg:translate-y-40 transition-transform">
              <div className="flex items-center mb-3.5">
                <span className="w-8 h-8 rounded-full bg-[#0e1916] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-sm border border-white/20">
                  6
                </span>
              </div>

              <div className="rounded-[24px] bg-[#0e1916] dark:bg-[#06100f] border border-black/20 dark:border-[#285A48] p-5 text-white shadow-lg shadow-black/15 hover:shadow-xl transition-all text-left flex-1 flex flex-col justify-between min-h-[220px]">
                <div>
                  <div className="w-9 h-9 rounded-xl bg-[#193327] dark:bg-[#142922] flex items-center justify-center text-[#5eead4] dark:text-[#8bd5b9] mb-4">
                    <Share2 className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-bold text-white tracking-tight">
                    MCP tools
                  </h3>
                  <p className="mt-2 text-xs text-[#9ca3af] dark:text-gray-400 leading-relaxed">
                    Implement MCP so AI can work with your business applications.
                  </p>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 4. CONNECTED SERVICES: ONE PARTNER AT THE CENTRE OF YOUR TECH (EXACT)     */}
      {/* ========================================================================= */}
      <section
        id="connected-services-section"
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 border-t border-[var(--home-border)] overflow-hidden"
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-8 items-center">

          {/* LEFT COLUMN: Headings, Paragraph & Button */}
          <div className="lg:col-span-5 flex flex-col justify-center text-left">
            <div className="text-xs sm:text-sm font-bold tracking-widest text-[#086948] dark:text-[#8bd5b9] uppercase font-mono mb-2.5">
              CONNECTED SERVICES
            </div>
            <h2 className="text-3xl sm:text-5xl lg:text-[3.5rem] font-extrabold tracking-tight text-[#161e12] dark:text-[#E3F5EC] leading-[1.12]">
              One partner at
              <br />
              the centre of
              <br />
              your tech
            </h2>
            <p className="mt-5 sm:mt-6 text-sm sm:text-base text-[#374151] dark:text-[#9bb7ab] max-w-sm leading-relaxed">
              Your CRM, projects, website, search presence, applications and AI tools all work together, because one team looks after them.
            </p>
            <div className="mt-8 sm:mt-10">
              <Link
                href="/contact"
                className="inline-flex items-center justify-center rounded-full bg-[#161e12] hover:bg-[#2b3325] dark:bg-[#8bd5b9] dark:hover:bg-[#a6f2d4] text-white dark:text-[#091413] px-7 py-3.5 text-sm font-semibold transition-all duration-200 shadow-sm hover:scale-[1.02] active:scale-[0.98]"
              >
                Plan your setup
              </Link>
            </div>
          </div>

          {/* RIGHT COLUMN: Radial Hub & Spoke Diagram */}
          <div className="lg:col-span-7 flex items-center justify-center w-full overflow-x-auto scrollbar-none py-0 -my-3 sm:-my-4">
            <div className="relative w-[540px] sm:w-[600px] h-[540px] sm:h-[600px] shrink-0 flex items-center justify-center">

              {/* SVG Radial Graph Layer */}
              <svg
                className="absolute inset-0 w-full h-full pointer-events-none z-0"
                viewBox="0 0 640 640"
                fill="none"
              >
                {/* Outer Dotted Orbit Ring - passes directly through center of all 6 cards */}
                <circle
                  cx="320"
                  cy="320"
                  r="220"
                  stroke="#9ecdbd"
                  strokeWidth="1.5"
                  strokeDasharray="4 6"
                  strokeOpacity="0.8"
                  className="dark:stroke-[#285A48]"
                />

                {/* 6 Radial Spoke Lines connecting Central Hub to Card Centers (Exact 60° increments) */}
                {/* Spoke 1: to CRM setup (90° - straight up) */}
                <line x1="320" y1="320" x2="320" y2="100" stroke="#9ecdbd" strokeWidth="1.5" className="dark:stroke-[#285A48]" />
                {/* Spoke 2: to Project management (30° - top right) */}
                <line x1="320" y1="320" x2="510.5" y2="210" stroke="#9ecdbd" strokeWidth="1.5" className="dark:stroke-[#285A48]" />
                {/* Spoke 3: to Website (-30° - bottom right) */}
                <line x1="320" y1="320" x2="510.5" y2="430" stroke="#9ecdbd" strokeWidth="1.5" className="dark:stroke-[#285A48]" />
                {/* Spoke 4: to SEO and AEO (270° - straight down) */}
                <line x1="320" y1="320" x2="320" y2="540" stroke="#9ecdbd" strokeWidth="1.5" className="dark:stroke-[#285A48]" />
                {/* Spoke 5: to Applications (210° - bottom left) */}
                <line x1="320" y1="320" x2="129.5" y2="430" stroke="#9ecdbd" strokeWidth="1.5" className="dark:stroke-[#285A48]" />
                {/* Spoke 6: to MCP tools (150° - top left) */}
                <line x1="320" y1="320" x2="129.5" y2="210" stroke="#9ecdbd" strokeWidth="1.5" className="dark:stroke-[#285A48]" />
              </svg>

              {/* CENTRAL HUB: Own Technology */}
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20 flex items-center justify-center">
                <div className="rounded-full p-2.5 sm:p-3 bg-[#086948]/10 dark:bg-[#8bd5b9]/15">
                  <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-full bg-[#086948] dark:bg-[#134e3a] text-white flex flex-col items-center justify-center text-center shadow-lg shadow-[#086948]/25 border-2 border-white/20">
                    <Box className="w-6 h-6 mb-1 text-white" />
                    <div className="text-xs sm:text-sm font-bold leading-tight">
                      Own
                      <br />
                      Technology
                    </div>
                  </div>
                </div>
              </div>

              {/* CARD 1: CRM setup (Top - 90°, exact distance R=220) */}
              <div
                className="absolute -translate-x-1/2 -translate-y-1/2 z-10"
                style={{ left: "50%", top: "15.625%" }}
              >
                <div className="rounded-[22px] bg-white dark:bg-[#12211E] border border-black/10 dark:border-[#285A48] px-3.5 py-3 sm:px-4 sm:py-3.5 shadow-sm text-left flex items-center gap-3 whitespace-nowrap min-w-[160px] sm:min-w-[180px]">
                  <div className="w-8 h-8 rounded-xl bg-[#e6f4ed] dark:bg-[#1b3b30] flex items-center justify-center text-[#086948] dark:text-[#8bd5b9] shrink-0">
                    <UserCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-[#161e12] dark:text-[#E3F5EC] tracking-tight">
                      CRM setup
                    </h4>
                    <p className="text-[10px] sm:text-[11px] text-[#555e58] dark:text-[#86A99A]">
                      Odoo CRM · HubSpot CRM
                    </p>
                  </div>
                </div>
              </div>

              {/* CARD 2: Project management (Top Right - 30°, exact distance R=220) */}
              <div
                className="absolute -translate-x-1/2 -translate-y-1/2 z-10"
                style={{ left: "79.77%", top: "32.8125%" }}
              >
                <div className="rounded-[22px] bg-white dark:bg-[#12211E] border border-black/10 dark:border-[#285A48] px-3.5 py-3 sm:px-4 sm:py-3.5 shadow-sm text-left flex items-center gap-3 whitespace-nowrap min-w-[160px] sm:min-w-[180px]">
                  <div className="w-8 h-8 rounded-xl bg-[#e6f4ed] dark:bg-[#1b3b30] flex items-center justify-center text-[#086948] dark:text-[#8bd5b9] shrink-0">
                    <Columns3 className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-[#161e12] dark:text-[#E3F5EC] tracking-tight">
                      Project management
                    </h4>
                    <p className="text-[10px] sm:text-[11px] text-[#555e58] dark:text-[#86A99A]">
                      Tasks · Boards · Timelines
                    </p>
                  </div>
                </div>
              </div>

              {/* CARD 3: Website (Bottom Right - 330° / -30°, exact distance R=220) */}
              <div
                className="absolute -translate-x-1/2 -translate-y-1/2 z-10"
                style={{ left: "79.77%", top: "67.1875%" }}
              >
                <div className="rounded-[22px] bg-white dark:bg-[#12211E] border border-black/10 dark:border-[#285A48] px-3.5 py-3 sm:px-4 sm:py-3.5 shadow-sm text-left flex items-center gap-3 whitespace-nowrap min-w-[160px] sm:min-w-[180px]">
                  <div className="w-8 h-8 rounded-xl bg-[#e6f4ed] dark:bg-[#1b3b30] flex items-center justify-center text-[#086948] dark:text-[#8bd5b9] shrink-0">
                    <AppWindow className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-[#161e12] dark:text-[#E3F5EC] tracking-tight">
                      Website
                    </h4>
                    <p className="text-[10px] sm:text-[11px] text-[#555e58] dark:text-[#86A99A]">
                      Design · Manage · Maintain
                    </p>
                  </div>
                </div>
              </div>

              {/* CARD 4: SEO and AEO (Bottom - 270°, exact distance R=220) */}
              <div
                className="absolute -translate-x-1/2 -translate-y-1/2 z-10"
                style={{ left: "50%", top: "84.375%" }}
              >
                <div className="rounded-[22px] bg-white dark:bg-[#12211E] border border-black/10 dark:border-[#285A48] px-3.5 py-3 sm:px-4 sm:py-3.5 shadow-sm text-left flex items-center gap-3 whitespace-nowrap min-w-[160px] sm:min-w-[180px]">
                  <div className="w-8 h-8 rounded-xl bg-[#e6f4ed] dark:bg-[#1b3b30] flex items-center justify-center text-[#086948] dark:text-[#8bd5b9] shrink-0">
                    <Search className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-[#161e12] dark:text-[#E3F5EC] tracking-tight">
                      SEO and AEO
                    </h4>
                    <p className="text-[10px] sm:text-[11px] text-[#555e58] dark:text-[#86A99A]">
                      Search + AI answers
                    </p>
                  </div>
                </div>
              </div>

              {/* CARD 5: Applications (Bottom Left - 210°, exact distance R=220) */}
              <div
                className="absolute -translate-x-1/2 -translate-y-1/2 z-10"
                style={{ left: "20.23%", top: "67.1875%" }}
              >
                <div className="rounded-[22px] bg-white dark:bg-[#12211E] border border-black/10 dark:border-[#285A48] px-3.5 py-3 sm:px-4 sm:py-3.5 shadow-sm text-left flex items-center gap-3 whitespace-nowrap min-w-[160px] sm:min-w-[180px]">
                  <div className="w-8 h-8 rounded-xl bg-[#e6f4ed] dark:bg-[#1b3b30] flex items-center justify-center text-[#086948] dark:text-[#8bd5b9] shrink-0">
                    <Code2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-[#161e12] dark:text-[#E3F5EC] tracking-tight">
                      Applications
                    </h4>
                    <p className="text-[10px] sm:text-[11px] text-[#555e58] dark:text-[#86A99A]">
                      Custom web &amp; business apps
                    </p>
                  </div>
                </div>
              </div>

              {/* CARD 6: MCP tools (Top Left - 150°, exact distance R=220) */}
              <div
                className="absolute -translate-x-1/2 -translate-y-1/2 z-10"
                style={{ left: "20.23%", top: "32.8125%" }}
              >
                <div className="rounded-[22px] bg-[#0e1916] dark:bg-[#06100f] border border-black/20 dark:border-[#285A48] px-3.5 py-3 sm:px-4 sm:py-3.5 text-white shadow-lg shadow-black/15 text-left flex items-center gap-3 whitespace-nowrap min-w-[160px] sm:min-w-[180px]">
                  <div className="w-8 h-8 rounded-xl bg-[#193327] dark:bg-[#142922] flex items-center justify-center text-[#5eead4] dark:text-[#8bd5b9] shrink-0">
                    <Share2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-white tracking-tight">
                      MCP tools
                    </h4>
                    <p className="text-[10px] sm:text-[11px] text-[#9ca3af] dark:text-gray-400">
                      AI connected to your apps
                    </p>
                  </div>
                </div>
              </div>

            </div>
          </div>

        </div>
      </section>
    </div>
  );
}


