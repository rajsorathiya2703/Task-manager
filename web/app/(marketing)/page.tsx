import type { Metadata } from "next";
import Link from "next/link";
import {
  LayoutGrid,
  Folder,
  Timer,
  Users,
  BarChart3,
  CalendarDays,
  Bot,
  MessageSquare,
  ArrowRight,
  Sparkles,
  CheckCircle2,
} from "lucide-react";
import { siteConfig, ServiceIconKey } from "@/src/content/site";

export const metadata: Metadata = {
  title: {
    absolute: `${siteConfig.brand.name} | Task management for teams`,
  },
};

const ICONS: Record<ServiceIconKey, React.ComponentType<{ className?: string }>> = {
  kanban: LayoutGrid,
  folder: Folder,
  timer: Timer,
  users: Users,
  chart: BarChart3,
  calendar: CalendarDays,
  bot: Bot,
  message: MessageSquare,
};

export default function MarketingHomePage() {
  const currentYear = new Date().getFullYear();
  const yearsInIndustry = Math.max(1, currentYear - siteConfig.stats.foundedYear);
  const firstSixServices = siteConfig.services.slice(0, 6);

  return (
    <div className="flex flex-col gap-16 sm:gap-24 pb-20">
      {/* 1. Hero Section */}
      <section className="pt-12 sm:pt-20 lg:pt-24 max-w-6xl mx-auto px-4 sm:px-6 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          {/* Left Hero Content */}
          <div className="lg:col-span-7 flex flex-col items-start space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-muted text-foreground border border-border/80 shadow-xs">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              <span>14-day free trial</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-foreground leading-[1.1]">
              Run tasks, time and teams in one workspace
            </h1>

            <p className="text-lg sm:text-xl text-muted-foreground leading-relaxed max-w-2xl">
              {siteConfig.brand.description}
            </p>

            <div className="flex flex-wrap items-center gap-4 pt-2 w-full sm:w-auto">
              <Link
                href={siteConfig.cta.trial.href}
                className="w-full sm:w-auto bg-primary text-primary-foreground hover:bg-primary/90 rounded-full px-7 h-12 inline-flex items-center justify-center text-base font-medium shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                {siteConfig.cta.trial.label}
              </Link>
              <Link
                href="/contact"
                className="w-full sm:w-auto border border-border bg-card hover:bg-muted text-foreground rounded-full px-7 h-12 inline-flex items-center justify-center text-base font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                Contact sales
              </Link>
            </div>
          </div>

          {/* Right CSS-only Product Mock */}
          <div className="lg:col-span-5 w-full">
            <div className="rounded-2xl border border-border/80 bg-card p-4 sm:p-5 shadow-xl relative overflow-hidden">
              {/* Mock Window Header */}
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-border/60">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500/80" />
                  <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                  <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
                </div>
                <div className="text-xs font-medium text-muted-foreground px-2 py-0.5 rounded bg-muted/60">
                  Sprint Board
                </div>
              </div>

              {/* Three Mini Kanban Columns */}
              <div className="grid grid-cols-3 gap-2 sm:gap-3 text-left">
                {/* Column 1: To Do */}
                <div className="bg-muted/40 rounded-xl p-2 sm:p-2.5 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-muted-foreground">To Do</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted font-bold text-foreground">2</span>
                  </div>
                  <div className="bg-card rounded-lg p-2 border border-border/60 shadow-xs space-y-1.5">
                    <div className="h-2 w-3/4 bg-foreground/20 rounded" />
                    <div className="h-1.5 w-1/2 bg-muted-foreground/30 rounded" />
                    <div className="flex justify-between items-center pt-1">
                      <span className="text-[9px] px-1 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 font-medium">Design</span>
                      <div className="w-3.5 h-3.5 rounded-full bg-primary/20" />
                    </div>
                  </div>
                  <div className="bg-card rounded-lg p-2 border border-border/60 shadow-xs space-y-1.5">
                    <div className="h-2 w-4/5 bg-foreground/20 rounded" />
                    <div className="h-1.5 w-2/3 bg-muted-foreground/30 rounded" />
                  </div>
                </div>

                {/* Column 2: Doing */}
                <div className="bg-muted/40 rounded-xl p-2 sm:p-2.5 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-muted-foreground">Doing</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted font-bold text-foreground">1</span>
                  </div>
                  <div className="bg-card rounded-lg p-2 border border-border/60 shadow-xs space-y-1.5 border-l-2 border-l-blue-500">
                    <div className="h-2 w-5/6 bg-foreground/20 rounded" />
                    <div className="h-1.5 w-2/5 bg-muted-foreground/30 rounded" />
                    <div className="flex justify-between items-center pt-1">
                      <span className="text-[9px] px-1 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 font-medium">API</span>
                      <div className="w-3.5 h-3.5 rounded-full bg-blue-500/20" />
                    </div>
                  </div>
                </div>

                {/* Column 3: Completed */}
                <div className="bg-muted/40 rounded-xl p-2 sm:p-2.5 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-muted-foreground">Completed</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted font-bold text-foreground">3</span>
                  </div>
                  <div className="bg-card rounded-lg p-2 border border-border/60 shadow-xs space-y-1.5">
                    <div className="h-2 w-2/3 bg-foreground/20 rounded" />
                    <div className="flex justify-between items-center pt-1">
                      <span className="text-[9px] px-1 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium">Docs</span>
                      <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Trust Strip */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 w-full">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-card border border-border/60 rounded-2xl p-6 sm:p-8 text-center shadow-xs">
            <div className="text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight">
              {siteConfig.stats.associateCompanies}
            </div>
            <div className="mt-2 text-sm text-muted-foreground font-medium">
              Associate Companies Connected
            </div>
          </div>

          <div className="bg-card border border-border/60 rounded-2xl p-6 sm:p-8 text-center shadow-xs">
            <div className="text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight">
              {yearsInIndustry}+
            </div>
            <div className="mt-2 text-sm text-muted-foreground font-medium">
              Years in the Industry (Since {siteConfig.stats.foundedYear})
            </div>
          </div>

          <div className="bg-card border border-border/60 rounded-2xl p-6 sm:p-8 text-center shadow-xs">
            <div className="text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight">
              {siteConfig.stats.teamSize}
            </div>
            <div className="mt-2 text-sm text-muted-foreground font-medium">
              Core Team Members
            </div>
          </div>
        </div>
      </section>

      {/* 3. What You Get (First 6 Services) */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 w-full space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              What you get
            </h2>
            <p className="mt-2 text-muted-foreground max-w-xl">
              A comprehensive suite of collaboration tools built directly into a unified platform.
            </p>
          </div>
          <Link
            href="/services"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-foreground hover:underline shrink-0"
          >
            <span>See all services</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {firstSixServices.map((service) => {
            const Icon = ICONS[service.icon] || LayoutGrid;
            return (
              <div
                key={service.slug}
                className="bg-card border border-border/60 rounded-2xl p-6 shadow-xs hover:border-border transition-colors flex flex-col justify-between"
              >
                <div className="space-y-4">
                  <div className="w-11 h-11 rounded-xl bg-muted border border-border/60 flex items-center justify-center text-foreground shrink-0">
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground tracking-tight">
                    {service.title}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {service.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 4. How It Works */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 w-full space-y-8">
        <div className="text-center max-w-2xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            How it works
          </h2>
          <p className="mt-2 text-muted-foreground">
            Get your company operational in minutes with three straightforward steps.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-card border border-border/60 rounded-2xl p-6 text-center space-y-4">
            <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground font-bold text-base flex items-center justify-center mx-auto shadow-xs">
              1
            </div>
            <h3 className="text-lg font-semibold text-foreground">
              Register your company
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Create your organization profile with a Google account to immediately start your 14-day free trial.
            </p>
          </div>

          <div className="bg-card border border-border/60 rounded-2xl p-6 text-center space-y-4">
            <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground font-bold text-base flex items-center justify-center mx-auto shadow-xs">
              2
            </div>
            <h3 className="text-lg font-semibold text-foreground">
              Invite your team
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Set up departments, designate leads, and invite employees with tailored role-based access.
            </p>
          </div>

          <div className="bg-card border border-border/60 rounded-2xl p-6 text-center space-y-4">
            <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground font-bold text-base flex items-center justify-center mx-auto shadow-xs">
              3
            </div>
            <h3 className="text-lg font-semibold text-foreground">
              Open your workspace
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Launch task boards, log work sessions, review balances, and harness the AI Task Copilot.
            </p>
          </div>
        </div>
      </section>

      {/* 5. Closing CTA Band */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 w-full">
        <div className="rounded-3xl border border-border/70 bg-card p-8 sm:p-14 text-center shadow-lg space-y-6">
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground max-w-xl mx-auto">
            Ready to streamline your team&apos;s workflow?
          </h2>
          <p className="text-muted-foreground text-base sm:text-lg max-w-lg mx-auto">
            Join other growing organizations today. No credit card required for your 14-day free trial.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
            <Link
              href={siteConfig.cta.trial.href}
              className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-full px-7 h-12 inline-flex items-center justify-center text-base font-medium shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              {siteConfig.cta.trial.label}
            </Link>
            <Link
              href={siteConfig.cta.login.href}
              className="px-6 py-2.5 text-base font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {siteConfig.cta.login.label}
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
