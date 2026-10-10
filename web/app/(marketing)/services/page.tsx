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
} from "lucide-react";
import { siteConfig, ServiceIconKey } from "@/src/content/site";

export const metadata: Metadata = {
  title: "Services",
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

export default function ServicesPage() {
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-16 space-y-16">
      {/* Page Header */}
      <div className="max-w-2xl">
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-foreground">
          Everything your team needs
        </h1>
        <p className="mt-4 text-lg text-muted-foreground leading-relaxed">
          Explore the full suite of modular productivity tools built to help organizations manage tasks, track time, and coordinate people in one workspace.
        </p>
      </div>

      {/* Services Grid (1/2/3 Columns) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
        {siteConfig.services.map((service) => {
          const Icon = ICONS[service.icon] || LayoutGrid;
          return (
            <div
              key={service.slug}
              className="bg-card border border-border/60 rounded-2xl p-6 sm:p-7 shadow-xs hover:border-border transition-colors flex flex-col justify-between"
            >
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-xl bg-muted border border-border/60 flex items-center justify-center text-foreground shrink-0 shadow-2xs">
                  <Icon className="w-6 h-6" />
                </div>
                <h2 className="text-xl font-bold tracking-tight text-foreground">
                  {service.title}
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {service.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* CTA Band */}
      <div className="rounded-3xl border border-border/70 bg-card p-8 sm:p-12 text-center shadow-lg space-y-6">
        <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
          Ready to experience the entire suite?
        </h2>
        <p className="text-muted-foreground text-base max-w-lg mx-auto">
          Start your 14-day free trial now or speak with our sales team to discuss custom setup and licensing.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
          <Link
            href={siteConfig.cta.trial.href}
            className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-full px-7 h-11 inline-flex items-center justify-center text-sm font-medium shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            {siteConfig.cta.trial.label}
          </Link>
          <Link
            href="/contact"
            className="border border-border bg-card hover:bg-muted text-foreground rounded-full px-7 h-11 inline-flex items-center justify-center text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Talk to sales
          </Link>
        </div>
      </div>
    </div>
  );
}
