"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  ArrowRight,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { siteConfig } from "@/src/content/site";
import { HeroKanbanBoard } from "@/src/components/marketing/HeroKanbanBoard";
import { NatureFeatureTree } from "@/src/components/marketing/NatureFeatureTree";
import { SiteFooter } from "@/src/components/marketing/SiteFooter";

interface MarketingHomeClientProps {
  yearsInIndustry: number;
}

const SECTION_LABELS = [
  { id: "hero", label: "01 • Kanban & Sprint", title: "Overview" },
  { id: "features", label: "02 • Feature Tree", title: "What You Get" },
  { id: "overview", label: "03 • Steps & Metrics", title: "Get Started" },
  { id: "footer", label: "04 • Footer & Links", title: "Footer" },
];

export function MarketingHomeClient({ yearsInIndustry }: MarketingHomeClientProps) {
  const [activeSection, setActiveSection] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const sectionRefs = useRef<(HTMLElement | null)[]>([]);
  const isScrollingRef = useRef(false);
  const activeSectionRef = useRef(0);
  const touchStartY = useRef<number | null>(null);

  // Sync ref with state
  useEffect(() => {
    activeSectionRef.current = activeSection;
  }, [activeSection]);

  const scrollToSection = useCallback((index: number) => {
    const target = sectionRefs.current[index];
    if (target && containerRef.current) {
      isScrollingRef.current = true;
      target.scrollIntoView({ behavior: "smooth", block: "start" });
      setActiveSection(index);

      // Lock scrolling during animation to prevent stops between sections
      setTimeout(() => {
        isScrollingRef.current = false;
      }, 750);
    }
  }, []);

  // IntersectionObserver to keep activeSection accurate
  useEffect(() => {
    const observers: IntersectionObserver[] = [];
    sectionRefs.current.forEach((el, idx) => {
      if (!el) return;
      const obs = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting && !isScrollingRef.current) {
              setActiveSection(idx);
            }
          });
        },
        { threshold: 0.5 }
      );
      obs.observe(el);
      observers.push(obs);
    });

    return () => {
      observers.forEach((obs) => obs.disconnect());
    };
  }, []);

  // Full-section snap scroll via wheel
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      // Ignore tiny jitter or touchpad resting noise
      if (Math.abs(e.deltaY) < 16) return;

      e.preventDefault();

      if (isScrollingRef.current) return;

      const direction = e.deltaY > 0 ? 1 : -1;
      const current = activeSectionRef.current;
      const nextIndex = Math.min(Math.max(current + direction, 0), 3);

      if (nextIndex !== current) {
        scrollToSection(nextIndex);
      }
    };

    const handleTouchStart = (e: TouchEvent) => {
      touchStartY.current = e.touches[0].clientY;
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (touchStartY.current === null) return;
      const touchEndY = e.changedTouches[0].clientY;
      const diff = touchStartY.current - touchEndY;
      touchStartY.current = null;

      if (Math.abs(diff) < 40) return;
      if (isScrollingRef.current) return;

      const direction = diff > 0 ? 1 : -1;
      const current = activeSectionRef.current;
      const nextIndex = Math.min(Math.max(current + direction, 0), 3);

      if (nextIndex !== current) {
        scrollToSection(nextIndex);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (["ArrowDown", "PageDown", " "].includes(e.key)) {
        e.preventDefault();
        if (activeSectionRef.current < 3 && !isScrollingRef.current) {
          scrollToSection(activeSectionRef.current + 1);
        }
      } else if (["ArrowUp", "PageUp"].includes(e.key)) {
        e.preventDefault();
        if (activeSectionRef.current > 0 && !isScrollingRef.current) {
          scrollToSection(activeSectionRef.current - 1);
        }
      }
    };

    container.addEventListener("wheel", handleWheel, { passive: false });
    container.addEventListener("touchstart", handleTouchStart, { passive: true });
    container.addEventListener("touchend", handleTouchEnd, { passive: true });
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      container.removeEventListener("wheel", handleWheel);
      container.removeEventListener("touchstart", handleTouchStart);
      container.removeEventListener("touchend", handleTouchEnd);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [scrollToSection]);

  return (
    <div className="relative w-full overflow-hidden">
      {/* Floating Section Dots Navigation Indicator */}
      <nav
        aria-label="Section Navigation"
        className="fixed right-3 sm:right-6 top-1/2 -translate-y-1/2 z-50 flex flex-col items-center gap-2.5 bg-background/80 dark:bg-card/80 backdrop-blur-md px-2 py-3 rounded-full border border-border/50 shadow-lg select-none"
      >
        {SECTION_LABELS.map((item, idx) => {
          const isActive = activeSection === idx;
          return (
            <button
              key={item.id}
              onClick={() => scrollToSection(idx)}
              aria-label={`Go to ${item.label}`}
              className="group relative flex items-center justify-center p-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 rounded-full"
            >
              {/* Dot / Pill */}
              <div
                className={`transition-all duration-300 rounded-full ${
                  isActive
                    ? "w-2.5 h-6 bg-emerald-500 shadow-xs shadow-emerald-500/50"
                    : "w-2 h-2 bg-muted-foreground/35 hover:bg-muted-foreground/70"
                }`}
              />

              {/* Tooltip on hover */}
              <div className="absolute right-7 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-200 px-2.5 py-1 rounded-md bg-popover border border-border text-[11px] font-semibold text-popover-foreground whitespace-nowrap shadow-md">
                {item.label}
              </div>
            </button>
          );
        })}
      </nav>

      {/* Main Snap Scrolling Container */}
      <div
        ref={containerRef}
        className="h-[calc(100vh-4rem)] w-full overflow-y-auto snap-y snap-mandatory scroll-smooth focus:outline-none scrollbar-none"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {/* ========================================================= */}
        {/* SECTION 1: HERO (KANBAN BOARD)                            */}
        {/* ========================================================= */}
        <section
          id="section-hero"
          ref={(el) => { sectionRefs.current[0] = el; }}
          className="h-[calc(100vh-4rem)] snap-start snap-always w-full flex flex-col justify-between items-center px-4 sm:px-6 max-w-7xl mx-auto py-2 sm:py-3 relative"
        >
          {/* Header Title & Subtitle */}
          <div className="flex flex-col items-center max-w-2xl mx-auto text-center space-y-1.5 shrink-0 pt-1">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold tracking-tight text-foreground leading-tight">
              Run Project, Task, Team, and Time in One Workspace
            </h1>
            <p className="text-[11px] sm:text-xs text-muted-foreground leading-relaxed max-w-lg mx-auto">
              Run tasks, track billable time, manage leave balances, and collaborate seamlessly across teams with an AI-powered workspace.
            </p>
          </div>

          {/* Kanban Board */}
          <div className="w-full flex-1 flex items-center justify-center my-1 min-h-0">
            <HeroKanbanBoard />
          </div>

          {/* Next Section Indicator */}
          <button
            onClick={() => scrollToSection(1)}
            aria-label="Scroll to What you get"
            className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground/75 hover:text-foreground transition-colors group pb-1 shrink-0"
          >
            <span>What you get</span>
            <ChevronDown className="w-3.5 h-3.5 animate-bounce group-hover:text-emerald-500" />
          </button>
        </section>

        {/* ========================================================= */}
        {/* SECTION 2: WHAT YOU GET (NATURE FEATURE TREE)             */}
        {/* ========================================================= */}
        <section
          id="section-features"
          ref={(el) => { sectionRefs.current[1] = el; }}
          className="h-[calc(100vh-4rem)] snap-start snap-always w-full flex flex-col justify-between items-center px-4 sm:px-6 max-w-7xl mx-auto py-2 sm:py-3 relative"
        >
          {/* Top Bar: Title & Service Link */}
          <div className="w-full flex flex-row items-center justify-between gap-2 shrink-0 pt-1">
            <div>
              <h2 className="text-lg sm:text-xl font-bold tracking-tight text-foreground">
                What you get
              </h2>
              <p className="text-[11px] sm:text-xs text-muted-foreground line-clamp-1">
                A comprehensive suite of collaboration tools built directly into a unified platform.
              </p>
            </div>
            <Link
              href="/services"
              className="inline-flex items-center gap-1 text-xs font-semibold text-foreground hover:underline shrink-0"
            >
              <span>See all services</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Nature Tree Interactive View */}
          <div className="w-full flex-1 flex items-center justify-center my-1 min-h-0">
            <NatureFeatureTree />
          </div>

          {/* Navigation helpers: Prev / Next */}
          <div className="flex items-center gap-4 shrink-0 pb-1">
            <button
              onClick={() => scrollToSection(0)}
              aria-label="Back to Hero"
              className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground/60 hover:text-foreground transition-colors"
            >
              <ChevronUp className="w-3 h-3" />
              <span>Back to Hero</span>
            </button>
            <span className="text-muted-foreground/30">•</span>
            <button
              onClick={() => scrollToSection(2)}
              aria-label="Scroll to Overview"
              className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground/75 hover:text-foreground transition-colors group"
            >
              <span>How it works & Join</span>
              <ChevronDown className="w-3.5 h-3.5 animate-bounce group-hover:text-emerald-500" />
            </button>
          </div>
        </section>

        {/* ========================================================= */}
        {/* SECTION 3: HOW IT WORKS + CTA + STATS                     */}
        {/* ========================================================= */}
        <section
          id="section-overview"
          ref={(el) => { sectionRefs.current[2] = el; }}
          className="h-[calc(100vh-4rem)] snap-start snap-always w-full flex flex-col justify-between items-center px-4 sm:px-6 max-w-6xl mx-auto py-3 sm:py-5 relative"
        >
          {/* Main 3 components stacked with rich, balanced proportions */}
          <div className="w-full flex-1 flex flex-col justify-center space-y-3 sm:space-y-4 my-auto">
            {/* 1. How It Works (3 Steps) */}
            <div className="space-y-2">
              <div className="text-center">
                <h3 className="text-lg sm:text-xl lg:text-2xl font-bold tracking-tight text-foreground">
                  How it works
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                  Get your company operational in minutes with three straightforward steps.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                <div className="bg-card border border-border/70 rounded-2xl p-4 sm:p-5 text-center space-y-2 shadow-xs hover:border-emerald-500/40 hover:shadow-md transition-all duration-300">
                  <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-primary text-primary-foreground font-bold text-xs sm:text-sm flex items-center justify-center mx-auto shadow-xs">
                    1
                  </div>
                  <h4 className="text-xs sm:text-sm font-bold text-foreground">
                    Register company
                  </h4>
                  <p className="text-[11px] sm:text-xs text-muted-foreground leading-relaxed">
                    Create your organization profile with a Google account to immediately start your 14-day free trial.
                  </p>
                </div>

                <div className="bg-card border border-border/70 rounded-2xl p-4 sm:p-5 text-center space-y-2 shadow-xs hover:border-emerald-500/40 hover:shadow-md transition-all duration-300">
                  <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-primary text-primary-foreground font-bold text-xs sm:text-sm flex items-center justify-center mx-auto shadow-xs">
                    2
                  </div>
                  <h4 className="text-xs sm:text-sm font-bold text-foreground">
                    Invite your team
                  </h4>
                  <p className="text-[11px] sm:text-xs text-muted-foreground leading-relaxed">
                    Set up departments, designate leads, and invite employees with tailored role-based access.
                  </p>
                </div>

                <div className="bg-card border border-border/70 rounded-2xl p-4 sm:p-5 text-center space-y-2 shadow-xs hover:border-emerald-500/40 hover:shadow-md transition-all duration-300">
                  <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-primary text-primary-foreground font-bold text-xs sm:text-sm flex items-center justify-center mx-auto shadow-xs">
                    3
                  </div>
                  <h4 className="text-xs sm:text-sm font-bold text-foreground">
                    Open workspace
                  </h4>
                  <p className="text-[11px] sm:text-xs text-muted-foreground leading-relaxed">
                    Launch task boards, log work sessions, review balances, and harness the AI Task Copilot.
                  </p>
                </div>
              </div>
            </div>

            {/* 2. Closing CTA Band */}
            <div className="rounded-2xl border border-border/70 bg-card p-4 sm:p-5 lg:p-6 text-center shadow-md space-y-2">
              <h3 className="text-base sm:text-lg lg:text-xl font-extrabold tracking-tight text-foreground">
                Ready to streamline your team&apos;s workflow?
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground max-w-lg mx-auto">
                Join other growing organizations today. No credit card required for your 14-day free trial.
              </p>
              <div className="flex items-center justify-center gap-3 pt-0.5">
                <Link
                  href={siteConfig.cta.trial.href}
                  className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-full px-6 h-9 sm:h-10 inline-flex items-center justify-center text-xs sm:text-sm font-semibold shadow-xs hover:scale-[1.02] active:scale-[0.98] transition-all"
                >
                  {siteConfig.cta.trial.label}
                </Link>
                <Link
                  href={siteConfig.cta.login.href}
                  className="px-5 py-2 text-xs sm:text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-lg transition-colors"
                >
                  {siteConfig.cta.login.label}
                </Link>
              </div>
            </div>

            {/* 3. The 3 Stat Cards (Trust Strip) */}
            <div className="grid grid-cols-3 gap-3 sm:gap-4">
              <div className="bg-card border border-border/70 rounded-2xl p-4 sm:p-5 text-center shadow-xs hover:border-emerald-500/30 transition-all">
                <div className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-foreground tracking-tight">
                  {siteConfig.stats.associateCompanies}
                </div>
                <div className="mt-1 text-[11px] sm:text-xs text-muted-foreground font-medium">
                  Associate Companies
                </div>
              </div>

              <div className="bg-card border border-border/70 rounded-2xl p-4 sm:p-5 text-center shadow-xs hover:border-emerald-500/30 transition-all">
                <div className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-foreground tracking-tight">
                  {yearsInIndustry}+
                </div>
                <div className="mt-1 text-[11px] sm:text-xs text-muted-foreground font-medium">
                  Years in Industry ({siteConfig.stats.foundedYear})
                </div>
              </div>

              <div className="bg-card border border-border/70 rounded-2xl p-4 sm:p-5 text-center shadow-xs hover:border-emerald-500/30 transition-all">
                <div className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-foreground tracking-tight">
                  {siteConfig.stats.teamSize}
                </div>
                <div className="mt-1 text-[11px] sm:text-xs text-muted-foreground font-medium">
                  Core Team Members
                </div>
              </div>
            </div>
          </div>

          {/* Scroll down to Footer Cue */}
          <div className="shrink-0 pt-1">
            <button
              onClick={() => scrollToSection(3)}
              aria-label="Scroll to footer"
              className="flex items-center gap-1 text-xs font-semibold text-muted-foreground/75 hover:text-foreground transition-colors group mx-auto"
            >
              <span>Footer & Links</span>
              <ChevronDown className="w-3.5 h-3.5 animate-bounce group-hover:text-emerald-500" />
            </button>
          </div>
        </section>

        {/* ========================================================= */}
        {/* SECTION 4: OFFICIAL FULL SITE FOOTER                      */}
        {/* ========================================================= */}
        <section
          id="section-footer"
          ref={(el) => { sectionRefs.current[3] = el; }}
          className="min-h-[calc(100vh-4rem)] snap-start snap-always w-full flex flex-col justify-between bg-card relative"
        >
          {/* Back to Section 3 Button */}
          <div className="flex justify-center pt-3 sm:pt-4 shrink-0">
            <button
              onClick={() => scrollToSection(2)}
              aria-label="Back to Steps & Metrics"
              className="flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-muted/70 hover:bg-muted text-muted-foreground hover:text-foreground text-xs font-semibold transition-colors shadow-2xs"
            >
              <ChevronUp className="w-3.5 h-3.5" />
              <span>Back to Steps & Metrics</span>
            </button>
          </div>

          {/* Official SiteFooter Component */}
          <div className="w-full flex-1 flex flex-col justify-center">
            <SiteFooter standalone />
          </div>
        </section>
      </div>
    </div>
  );
}
