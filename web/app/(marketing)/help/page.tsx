import type { Metadata } from "next";
import Link from "next/link";
import { Info, HelpCircle } from "lucide-react";
import { siteConfig } from "@/src/content/site";

export const metadata: Metadata = {
  title: "Help",
};

const NAV_LINKS = [
  { href: "#getting-started", label: "Getting started" },
  { href: "#tasks-boards", label: "Tasks and boards" },
  { href: "#projects", label: "Projects" },
  { href: "#time-tracking", label: "Time tracking" },
  { href: "#teams-employees", label: "Teams and employees" },
  { href: "#leave-management", label: "Leave management" },
  { href: "#ai-copilot", label: "AI Copilot" },
  { href: "#faq", label: "Frequently asked questions" },
];

export default function HelpPage() {
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-16 space-y-10">
      {/* Banner */}
      <div className="rounded-2xl border border-border/70 bg-muted/50 p-4 sm:p-5 flex items-start sm:items-center gap-3.5 shadow-xs">
        <Info className="w-5 h-5 text-primary shrink-0 mt-0.5 sm:mt-0" />
        <p className="text-sm text-foreground font-medium">
          Full documentation is coming soon. Here is a quick guide to get you started.
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-12 items-start">
        {/* Desktop Sticky Left Anchor Nav */}
        <aside className="hidden lg:block w-64 shrink-0 sticky top-24 self-start">
          <nav
            className="flex flex-col space-y-1 text-sm border-l border-border/60 pl-4"
            aria-label="Table of contents"
          >
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground pb-2">
              On this page
            </span>
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="py-1.5 text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-xs"
              >
                {link.label}
              </a>
            ))}
          </nav>
        </aside>

        {/* Main Content Sections */}
        <div className="flex-1 min-w-0 space-y-14">
          {/* 1. Getting Started */}
          <section id="getting-started" className="scroll-mt-24 space-y-4">
            <h2 className="text-2xl font-bold tracking-tight text-foreground">
              Getting started
            </h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Setting up your organization in {siteConfig.brand.name} takes only a few moments:
            </p>
            <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground pl-1">
              <li>
                <strong className="text-foreground">Register your company:</strong> Visit{" "}
                <Link
                  href={siteConfig.cta.trial.href}
                  className="text-foreground underline underline-offset-2 hover:text-primary transition-colors"
                >
                  company registration
                </Link>{" "}
                and sign in with your Google account to initialize your 14-day free trial.
              </li>
              <li>
                <strong className="text-foreground">Log in:</strong> Access your account securely via Google OAuth from the{" "}
                <Link
                  href={siteConfig.cta.login.href}
                  className="text-foreground underline underline-offset-2 hover:text-primary transition-colors"
                >
                  login page
                </Link>
                .
              </li>
              <li>
                <strong className="text-foreground">My Account:</strong> Review all companies you are affiliated with, inspect trial status, and open your active workspace.
              </li>
            </ol>
          </section>

          {/* 2. Tasks and Boards */}
          <section id="tasks-boards" className="scroll-mt-24 space-y-3">
            <h2 className="text-2xl font-bold tracking-tight text-foreground">
              Tasks and boards
            </h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Organize day-to-day deliverables using interactive Kanban boards and comprehensive list views. Drag and drop task cards across status columns (To Do, In Progress, Review, Completed), attach files, assign teammates, and leave comments with @mentions.
            </p>
          </section>

          {/* 3. Projects */}
          <section id="projects" className="scroll-mt-24 space-y-3">
            <h2 className="text-2xl font-bold tracking-tight text-foreground">
              Projects
            </h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Group related tasks into structured projects. Customize project badges with distinctive color tags, set milestone priorities, track completion progress, and assign dedicated teams to oversee project execution.
            </p>
          </section>

          {/* 4. Time Tracking */}
          <section id="time-tracking" className="scroll-mt-24 space-y-3">
            <h2 className="text-2xl font-bold tracking-tight text-foreground">
              Time tracking
            </h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Track work hours with precision. Start and stop live timers on individual tasks, log manual entries when necessary, and review organizational timelines for accurate timesheet records and reporting.
            </p>
          </section>

          {/* 5. Teams and Employees */}
          <section id="teams-employees" className="scroll-mt-24 space-y-3">
            <h2 className="text-2xl font-bold tracking-tight text-foreground">
              Teams and employees
            </h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Structure departments and collaborate smoothly. Create teams, assign team leads, manage employee records, and establish clear operational responsibilities throughout the workspace.
            </p>
          </section>

          {/* 6. Leave Management */}
          <section id="leave-management" className="scroll-mt-24 space-y-3">
            <h2 className="text-2xl font-bold tracking-tight text-foreground">
              Leave management
            </h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Simplify time-off coordination with built-in request workflows. Employees can view remaining leave balances and submit time-off requests, while team leads and managers can approve requests directly via calendar views or one-click email actions.
            </p>
          </section>

          {/* 7. AI Copilot */}
          <section id="ai-copilot" className="scroll-mt-24 space-y-3">
            <h2 className="text-2xl font-bold tracking-tight text-foreground">
              AI Copilot
            </h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Boost execution velocity with the embedded Task Copilot. Press{" "}
              <kbd className="px-2 py-0.5 rounded bg-muted border border-border/80 text-foreground font-mono text-xs">
                Ctrl + J
              </kbd>{" "}
              or{" "}
              <kbd className="px-2 py-0.5 rounded bg-muted border border-border/80 text-foreground font-mono text-xs">
                Cmd + J
              </kbd>{" "}
              anywhere inside the workspace to summon the AI assistant for instant task generation, summaries, and smart productivity tips.
            </p>
          </section>

          {/* 8. Frequently Asked Questions */}
          <section id="faq" className="scroll-mt-24 space-y-4 pt-6 border-t border-border/60">
            <div className="flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-primary" />
              <h2 className="text-2xl font-bold tracking-tight text-foreground">
                Frequently asked questions
              </h2>
            </div>

            <div className="space-y-3 pt-2">
              <details className="group bg-card border border-border/60 rounded-xl p-4 transition-all">
                <summary className="font-medium text-foreground cursor-pointer list-none flex items-center justify-between text-sm select-none">
                  <span>How long is the free trial?</span>
                  <span className="text-muted-foreground transition-transform group-open:rotate-180">
                    ▼
                  </span>
                </summary>
                <p className="mt-3 text-sm text-muted-foreground leading-relaxed pt-2 border-t border-border/40">
                  Every newly registered company receives an unrestricted 14-day free trial with full access to all features, task boards, time tracking, and the AI Copilot. No credit card is required.
                </p>
              </details>

              <details className="group bg-card border border-border/60 rounded-xl p-4 transition-all">
                <summary className="font-medium text-foreground cursor-pointer list-none flex items-center justify-between text-sm select-none">
                  <span>Can I invite my team?</span>
                  <span className="text-muted-foreground transition-transform group-open:rotate-180">
                    ▼
                  </span>
                </summary>
                <p className="mt-3 text-sm text-muted-foreground leading-relaxed pt-2 border-t border-border/40">
                  Yes, company owners and administrators can invite team members, assign specific departments, and configure customized role-based permissions at any point during and after the trial.
                </p>
              </details>

              <details className="group bg-card border border-border/60 rounded-xl p-4 transition-all">
                <summary className="font-medium text-foreground cursor-pointer list-none flex items-center justify-between text-sm select-none">
                  <span>How do I contact support?</span>
                  <span className="text-muted-foreground transition-transform group-open:rotate-180">
                    ▼
                  </span>
                </summary>
                <p className="mt-3 text-sm text-muted-foreground leading-relaxed pt-2 border-t border-border/40">
                  If you have technical questions or require setup guidance, visit our{" "}
                  <Link
                    href="/contact"
                    className="text-foreground underline underline-offset-2 hover:text-primary transition-colors font-medium"
                  >
                    Contact page
                  </Link>{" "}
                  to submit a message directly to our support team.
                </p>
              </details>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
