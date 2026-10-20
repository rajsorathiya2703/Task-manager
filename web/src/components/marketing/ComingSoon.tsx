"use client";

import Link from "next/link";
import {
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Kanban,
  Clock,
  Bot,
  Users,
  Compass,
  CheckCircle2,
} from "lucide-react";
import { siteConfig } from "@/src/content/site";

const UPCOMING_HIGHLIGHTS = [
  {
    icon: Kanban,
    title: "Agile Task & Kanban Boards",
    desc: "Streamlined workflow boards with fluid drag-and-drop prioritization.",
  },
  {
    icon: Clock,
    title: "Precision Time Tracking",
    desc: "Built-in timers, billable hour metrics, and detailed timesheets.",
  },
  {
    icon: Bot,
    title: "AI Task Copilot",
    desc: "Smart task breakdown, automated descriptions, and intelligent summaries.",
  },
  {
    icon: Users,
    title: "Multi-Team Coordination",
    desc: "Role-based access, department workspaces, and leave tracking.",
  },
];

export function ComingSoon() {
  return (
    <div className="home-theme-scope relative isolate min-h-[calc(100vh-4rem)] flex flex-col justify-center overflow-hidden bg-[var(--home-bg)] py-16 sm:py-24 px-4 sm:px-6 lg:px-8 transition-colors duration-300">
      {/* Background Decorative Ambient Gradients (Warm Sage Olive in Light, Cybernetic Pine in Dark) */}
      <div
        className="pointer-events-none absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80"
        aria-hidden="true"
      >
        <div
          className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-[var(--home-glow-1)] to-[var(--home-glow-2)] opacity-70 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]"
          style={{
            clipPath:
              "polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)",
          }}
        />
      </div>

      <div
        className="pointer-events-none absolute inset-x-0 top-[calc(100%-13rem)] -z-10 transform-gpu overflow-hidden blur-3xl sm:top-[calc(100%-30rem)]"
        aria-hidden="true"
      >
        <div
          className="relative left-[calc(50%+3rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 bg-gradient-to-tr from-[var(--home-glow-2)] to-[var(--home-glow-1)] opacity-50 sm:left-[calc(50%+36rem)] sm:w-[72.1875rem]"
          style={{
            clipPath:
              "polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)",
          }}
        />
      </div>

      <div className="mx-auto max-w-4xl text-center">
        {/* Pulsing Status Pill */}
        <div className="inline-flex items-center gap-2 rounded-full border border-[var(--home-pill-border)] bg-[var(--home-pill-bg)] px-4 py-1.5 text-xs font-semibold text-[var(--home-pill-text)] shadow-xs mb-6 backdrop-blur-sm">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--home-primary)] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--home-primary)]"></span>
          </span>
          <Sparkles className="w-3.5 h-3.5" />
          <span>Redesign in Progress • New Experience Coming Soon</span>
        </div>

        {/* Headline */}
        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-[var(--home-headline)] leading-[1.15]">
          A Brand New Experience is{" "}
          <span className="bg-gradient-to-r from-[var(--home-primary)] via-[var(--home-secondary)] to-[var(--home-primary-container)] bg-clip-text text-transparent">
            Coming Soon
          </span>
        </h1>

        {/* Subtitle */}
        <p className="mt-5 text-sm sm:text-base lg:text-lg text-[var(--home-text-muted)] max-w-2xl mx-auto leading-relaxed">
          We are redesigning the home page from the ground up to give you an even faster, more intuitive platform. All workspace tools, tasks, and projects remain fully active.
        </p>

        {/* CTA Buttons */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3 sm:gap-4">
          <Link
            href={siteConfig.cta.login.href}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-[var(--home-primary)] text-[var(--home-on-primary)] px-6 py-3 text-sm font-semibold border border-[var(--home-border-subtle)] shadow-sm hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--home-primary)] focus-visible:ring-offset-2 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <span>Go to Login & Workspace</span>
            <ArrowRight className="w-4 h-4" />
          </Link>

          <Link
            href={siteConfig.cta.trial.href}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-[var(--home-border)] bg-[var(--home-surface-card)] px-6 py-3 text-sm font-semibold text-[var(--home-headline)] shadow-xs hover:bg-[var(--home-surface-container)] backdrop-blur-xs transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <span>{siteConfig.cta.trial.label}</span>
          </Link>

          <Link
            href="/services"
            className="inline-flex items-center justify-center gap-2 rounded-lg px-5 py-3 text-sm font-medium text-[var(--home-text-muted)] hover:text-[var(--home-headline)] hover:bg-[var(--home-surface-container)] transition-colors"
          >
            <Compass className="w-4 h-4" />
            <span>Explore Services</span>
          </Link>
        </div>

        {/* Operational System Notice Card */}
        <div className="mt-12 rounded-xl border border-[var(--home-border)] bg-[var(--home-surface-card)] p-5 shadow-xs backdrop-blur-md max-w-xl mx-auto text-left">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[var(--home-surface-container)] text-[var(--home-primary)] shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-[var(--home-headline)]">Task Manager Operational</span>
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[var(--home-primary)]">
                  <CheckCircle2 className="w-3.5 h-3.5" /> All systems normal
                </span>
              </div>
              <p className="text-xs text-[var(--home-text-muted)] mt-0.5">
                Existing teams, boards, and sessions are running seamlessly. Only the public marketing front is undergoing this upgrade.
              </p>
            </div>
          </div>
        </div>

        {/* Upcoming Core Features Grid */}
        <div className="mt-14 pt-10 border-t border-[var(--home-border)]">
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--home-text-muted)] mb-6">
            Everything You Need to Power Your Organization
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-left">
            {UPCOMING_HIGHLIGHTS.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.title}
                  className="rounded-lg border border-[var(--home-border)] bg-[var(--home-surface-card)] p-4 backdrop-blur-xs hover:border-[var(--home-primary)] transition-colors shadow-2xs"
                >
                  <div className="w-8 h-8 rounded-md bg-[var(--home-surface-container)] text-[var(--home-primary)] flex items-center justify-center mb-3">
                    <Icon className="w-4 h-4" />
                  </div>
                  <h2 className="text-xs font-bold text-[var(--home-headline)]">{item.title}</h2>
                  <p className="text-[11px] text-[var(--home-text-muted)] mt-1 leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
