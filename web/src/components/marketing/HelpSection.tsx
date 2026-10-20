"use client";

import { useState } from "react";
import Link from "next/link";
import {
  HelpCircle,
  BookOpen,
  MessageSquare,
  Sparkles,
  ChevronDown,
  Layers,
  Clock,
  Users,
  Calendar,
  Bot,
  Kanban,
  Check,
  ArrowRight,
} from "lucide-react";
import { siteConfig } from "@/src/content/site";

const HELP_NAV_LINKS = [
  { href: "#getting-started", label: "Getting started", icon: Sparkles },
  { href: "#tasks-boards", label: "Tasks and boards", icon: Kanban },
  { href: "#projects", label: "Projects", icon: Layers },
  { href: "#time-tracking", label: "Time tracking", icon: Clock },
  { href: "#teams-employees", label: "Teams and employees", icon: Users },
  { href: "#leave-management", label: "Leave management", icon: Calendar },
  { href: "#ai-copilot", label: "AI Task Copilot", icon: Bot },
  { href: "#faq", label: "Frequently asked questions", icon: HelpCircle },
];

const HELP_FAQS = [
  {
    q: "How long is the free trial and what is included?",
    a: "Every newly registered company receives an unrestricted 14-day free trial with complete access to all core features, including Kanban boards, live time tracking, employee directories, and the AI Task Copilot. No credit card is required.",
  },
  {
    q: "How do I invite team members and configure departments?",
    a: "Company owners and administrators can invite team members at any time from the administration settings dashboard. You can assign employees to specific departments, designate team leads, and set role-based permissions.",
  },
  {
    q: "How does the AI Task Copilot work?",
    a: "Press Ctrl + J (or Cmd + J on macOS) anywhere inside your workspace to summon the AI assistant. The Copilot can generate full task breakdowns from single-sentence briefs, summarize complex discussions, and draft action plans.",
  },
  {
    q: "Can I connect my company's Odoo CRM or HubSpot CRM?",
    a: "Yes! Own Technology offers full-service setup and bi-directional synchronization between your CRM and your task pipeline, ensuring every deal and follow-up is visible to the team.",
  },
  {
    q: "How do leave requests and email approvals work?",
    a: "Employees submit time-off requests directly from the Leave Management calendar. Designated managers receive automated notifications with one-click approval buttons that instantly update employee quotas.",
  },
];

export function HelpSection() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  return (
    <div className="relative isolate overflow-hidden bg-[var(--home-bg)] text-[var(--home-text-body)] transition-colors duration-300">
      
      {/* ========================================================================= */}
      {/* 1. HERO HEADER                                                            */}
      {/* ========================================================================= */}
      <section className="relative pt-12 sm:pt-20 pb-12 sm:pb-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        {/* Soft Ambient Organic Curved Shape on Right */}
        <div
          className="absolute -right-20 -top-20 w-[450px] sm:w-[600px] h-[450px] sm:h-[600px] rounded-full bg-[#dbe8df]/60 dark:bg-[#142d24]/50 pointer-events-none -z-10"
          aria-hidden="true"
        />

        {/* Eyebrow */}
        <div className="inline-flex items-center gap-2 rounded-full border border-black/10 dark:border-[#285A48] bg-white/80 dark:bg-[#12211E] px-3.5 py-1.5 text-xs font-semibold text-[#161e12] dark:text-[#E3F5EC] mb-6 shadow-2xs">
          <span className="w-2 h-2 rounded-full bg-[#086948] dark:bg-[#8bd5b9] shrink-0" />
          <span>Help & Documentation</span>
        </div>

        {/* Main Title */}
        <h1 className="text-4xl sm:text-6xl lg:text-[62px] font-extrabold tracking-tight leading-[1.06] max-w-3xl mx-auto">
          <span className="text-[#161e12] dark:text-[#F3FDF8]">How can we </span>
          <span className="text-[#086948] dark:text-[#8bd5b9]">help you today?</span>
        </h1>

        {/* Subtitle */}
        <p className="mt-5 text-base sm:text-lg text-[#4B5750] dark:text-[#9bb7ab] max-w-2xl mx-auto leading-relaxed">
          Guides, walkthroughs, and answers to help your team get the most out of your workspace, CRM integrations, and AI tools.
        </p>

        {/* 3 Quick Resource Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mt-10 sm:mt-12 text-left">
          
          {/* Card 1: Quickstart */}
          <a
            href="#getting-started"
            className="rounded-[24px] bg-white dark:bg-[#12211E] border border-black/8 dark:border-[#285A48] p-5 sm:p-6 shadow-xs hover:shadow-md transition-all hover:scale-[1.02] flex items-start gap-4 group"
          >
            <div className="w-11 h-11 rounded-2xl bg-[#e6f4ed] dark:bg-[#1b3b30] text-[#086948] dark:text-[#8bd5b9] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#161e12] dark:text-[#E3F5EC] tracking-tight">
                Quickstart Guide
              </h2>
              <p className="mt-1 text-xs sm:text-sm text-[#555e58] dark:text-[#86A99A] leading-relaxed">
                Set up your company, invite colleagues, and launch in 5 minutes.
              </p>
            </div>
          </a>

          {/* Card 2: Core Walkthroughs */}
          <a
            href="#tasks-boards"
            className="rounded-[24px] bg-white dark:bg-[#12211E] border border-black/8 dark:border-[#285A48] p-5 sm:p-6 shadow-xs hover:shadow-md transition-all hover:scale-[1.02] flex items-start gap-4 group"
          >
            <div className="w-11 h-11 rounded-2xl bg-[#e6f4ed] dark:bg-[#1b3b30] text-[#086948] dark:text-[#8bd5b9] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#161e12] dark:text-[#E3F5EC] tracking-tight">
                Core Walkthroughs
              </h2>
              <p className="mt-1 text-xs sm:text-sm text-[#555e58] dark:text-[#86A99A] leading-relaxed">
                Learn Kanban flows, live timesheets, and leave approval rules.
              </p>
            </div>
          </a>

          {/* Card 3: Support */}
          <Link
            href="/contact"
            className="rounded-[24px] bg-[#0c1612] text-white border border-white/10 p-5 sm:p-6 shadow-md hover:shadow-lg transition-all hover:scale-[1.02] flex items-start gap-4 group"
          >
            <div className="w-11 h-11 rounded-2xl bg-white/10 text-[#5eead4] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">
                Direct Team Support
              </h2>
              <p className="mt-1 text-xs sm:text-sm text-gray-300 leading-relaxed">
                Have custom questions? Talk directly to our technical team.
              </p>
            </div>
          </Link>

        </div>
      </section>

      {/* ========================================================================= */}
      {/* 2. MAIN DOCUMENTATION LAYOUT (STICKY NAV + CONTENT CARDS)                 */}
      {/* ========================================================================= */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16 sm:pb-24">
        <div className="flex flex-col lg:flex-row gap-10 lg:gap-14 items-start text-left">
          
          {/* Left Sticky Anchor Navigation */}
          <aside className="hidden lg:block w-64 shrink-0 sticky top-24 self-start">
            <div className="rounded-[24px] bg-white dark:bg-[#12211E] border border-black/8 dark:border-[#285A48] p-5 shadow-xs">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#086948] dark:text-[#8bd5b9] block mb-3 px-2">
                On this page
              </span>
              <nav className="flex flex-col space-y-1 text-xs sm:text-sm" aria-label="Table of contents">
                {HELP_NAV_LINKS.map((link) => {
                  const Icon = link.icon;
                  return (
                    <a
                      key={link.href}
                      href={link.href}
                      className="px-3 py-2 rounded-xl text-[#4B5750] dark:text-[#9bb7ab] hover:text-[#161e12] dark:hover:text-[#E3F5EC] hover:bg-[#e6f4ed]/50 dark:hover:bg-[#1b3b30]/50 font-medium transition-all flex items-center gap-2.5"
                    >
                      <Icon className="w-4 h-4 text-[#086948] dark:text-[#8bd5b9] shrink-0" />
                      <span>{link.label}</span>
                    </a>
                  );
                })}
              </nav>
            </div>
          </aside>

          {/* Right Content Area */}
          <div className="flex-1 min-w-0 space-y-8 sm:space-y-10">
            
            {/* 1. Getting Started */}
            <div
              id="getting-started"
              className="scroll-mt-24 rounded-[28px] sm:rounded-[32px] bg-white dark:bg-[#12211E] border border-black/8 dark:border-[#285A48] p-6 sm:p-8 shadow-sm"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-[#e6f4ed] dark:bg-[#1b3b30] text-[#086948] dark:text-[#8bd5b9] flex items-center justify-center shrink-0">
                  <Sparkles className="w-5 h-5" />
                </div>
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[#161e12] dark:text-[#E3F5EC]">
                  Getting started
                </h2>
              </div>

              <p className="text-sm sm:text-base text-[#4B5750] dark:text-[#9bb7ab] leading-relaxed mb-6">
                Setting up your company in {siteConfig.brand.name} takes only a few minutes. Follow these three simple steps:
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="rounded-2xl bg-[#f4f7f4] dark:bg-[#0c1612] p-5 border border-transparent dark:border-[#1e3b30]">
                  <span className="text-xs font-mono font-bold text-[#086948] dark:text-[#8bd5b9]">
                    STEP 01
                  </span>
                  <h3 className="text-base font-bold text-[#161e12] dark:text-[#E3F5EC] mt-1 mb-2">
                    Register company
                  </h3>
                  <p className="text-xs sm:text-sm text-[#555e58] dark:text-[#86A99A] leading-relaxed">
                    Visit{" "}
                    <Link
                      href={siteConfig.cta.trial.href}
                      className="text-[#086948] dark:text-[#8bd5b9] font-semibold underline underline-offset-2"
                    >
                      company registration
                    </Link>{" "}
                    and initialize your 14-day free trial.
                  </p>
                </div>

                <div className="rounded-2xl bg-[#f4f7f4] dark:bg-[#0c1612] p-5 border border-transparent dark:border-[#1e3b30]">
                  <span className="text-xs font-mono font-bold text-[#086948] dark:text-[#8bd5b9]">
                    STEP 02
                  </span>
                  <h3 className="text-base font-bold text-[#161e12] dark:text-[#E3F5EC] mt-1 mb-2">
                    Invite colleagues
                  </h3>
                  <p className="text-xs sm:text-sm text-[#555e58] dark:text-[#86A99A] leading-relaxed">
                    Add team members with role-based permissions from your organization dashboard.
                  </p>
                </div>

                <div className="rounded-2xl bg-[#f4f7f4] dark:bg-[#0c1612] p-5 border border-transparent dark:border-[#1e3b30]">
                  <span className="text-xs font-mono font-bold text-[#086948] dark:text-[#8bd5b9]">
                    STEP 03
                  </span>
                  <h3 className="text-base font-bold text-[#161e12] dark:text-[#E3F5EC] mt-1 mb-2">
                    Launch first board
                  </h3>
                  <p className="text-xs sm:text-sm text-[#555e58] dark:text-[#86A99A] leading-relaxed">
                    Create custom Kanban pipelines and track milestones with the AI Task Copilot.
                  </p>
                </div>
              </div>
            </div>

            {/* 2. Tasks and Boards */}
            <div
              id="tasks-boards"
              className="scroll-mt-24 rounded-[28px] sm:rounded-[32px] bg-white dark:bg-[#12211E] border border-black/8 dark:border-[#285A48] p-6 sm:p-8 shadow-sm"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-[#e6f4ed] dark:bg-[#1b3b30] text-[#086948] dark:text-[#8bd5b9] flex items-center justify-center shrink-0">
                  <Kanban className="w-5 h-5" />
                </div>
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[#161e12] dark:text-[#E3F5EC]">
                  Tasks and boards
                </h2>
              </div>
              <p className="text-sm sm:text-base text-[#4B5750] dark:text-[#9bb7ab] leading-relaxed">
                Organize day-to-day deliverables using interactive Kanban boards and comprehensive list views. Drag and drop task cards across status columns (To Do, In Progress, Review, Completed), attach files, assign teammates, and leave comments with @mentions.
              </p>
            </div>

            {/* 3. Projects */}
            <div
              id="projects"
              className="scroll-mt-24 rounded-[28px] sm:rounded-[32px] bg-white dark:bg-[#12211E] border border-black/8 dark:border-[#285A48] p-6 sm:p-8 shadow-sm"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-[#e6f4ed] dark:bg-[#1b3b30] text-[#086948] dark:text-[#8bd5b9] flex items-center justify-center shrink-0">
                  <Layers className="w-5 h-5" />
                </div>
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[#161e12] dark:text-[#E3F5EC]">
                  Projects
                </h2>
              </div>
              <p className="text-sm sm:text-base text-[#4B5750] dark:text-[#9bb7ab] leading-relaxed">
                Group related tasks into structured projects. Customize project badges with distinctive color tags, set milestone priorities, track completion progress, and assign dedicated teams to oversee project execution.
              </p>
            </div>

            {/* 4. Time Tracking */}
            <div
              id="time-tracking"
              className="scroll-mt-24 rounded-[28px] sm:rounded-[32px] bg-white dark:bg-[#12211E] border border-black/8 dark:border-[#285A48] p-6 sm:p-8 shadow-sm"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-[#e6f4ed] dark:bg-[#1b3b30] text-[#086948] dark:text-[#8bd5b9] flex items-center justify-center shrink-0">
                  <Clock className="w-5 h-5" />
                </div>
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[#161e12] dark:text-[#E3F5EC]">
                  Time tracking
                </h2>
              </div>
              <p className="text-sm sm:text-base text-[#4B5750] dark:text-[#9bb7ab] leading-relaxed">
                Track work hours with precision. Start and stop live timers on individual tasks, log manual entries when necessary, and review organizational timelines for accurate timesheet records and client reporting.
              </p>
            </div>

            {/* 5. Teams and Employees */}
            <div
              id="teams-employees"
              className="scroll-mt-24 rounded-[28px] sm:rounded-[32px] bg-white dark:bg-[#12211E] border border-black/8 dark:border-[#285A48] p-6 sm:p-8 shadow-sm"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-[#e6f4ed] dark:bg-[#1b3b30] text-[#086948] dark:text-[#8bd5b9] flex items-center justify-center shrink-0">
                  <Users className="w-5 h-5" />
                </div>
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[#161e12] dark:text-[#E3F5EC]">
                  Teams and employees
                </h2>
              </div>
              <p className="text-sm sm:text-base text-[#4B5750] dark:text-[#9bb7ab] leading-relaxed">
                Structure departments and collaborate smoothly. Create teams, assign department managers, manage employee records, and establish clear operational responsibilities throughout the workspace.
              </p>
            </div>

            {/* 6. Leave Management */}
            <div
              id="leave-management"
              className="scroll-mt-24 rounded-[28px] sm:rounded-[32px] bg-white dark:bg-[#12211E] border border-black/8 dark:border-[#285A48] p-6 sm:p-8 shadow-sm"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-[#e6f4ed] dark:bg-[#1b3b30] text-[#086948] dark:text-[#8bd5b9] flex items-center justify-center shrink-0">
                  <Calendar className="w-5 h-5" />
                </div>
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[#161e12] dark:text-[#E3F5EC]">
                  Leave management
                </h2>
              </div>
              <p className="text-sm sm:text-base text-[#4B5750] dark:text-[#9bb7ab] leading-relaxed">
                Simplify time-off coordination with built-in request workflows. Employees can view remaining leave balances and submit time-off requests, while team leads and managers can approve requests directly via calendar views or one-click email actions.
              </p>
            </div>

            {/* 7. AI Copilot */}
            <div
              id="ai-copilot"
              className="scroll-mt-24 rounded-[28px] sm:rounded-[32px] bg-[#0c1612] text-white border border-white/10 p-6 sm:p-8 shadow-xl"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-white/10 text-[#5eead4] flex items-center justify-center shrink-0">
                  <Bot className="w-5 h-5" />
                </div>
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                  AI Task Copilot
                </h2>
              </div>
              <p className="text-sm sm:text-base text-gray-300 leading-relaxed">
                Boost execution velocity with the embedded Task Copilot. Press{" "}
                <kbd className="px-2.5 py-1 rounded-lg bg-white/10 border border-white/20 text-[#5eead4] font-mono text-xs font-semibold">
                  Ctrl + J
                </kbd>{" "}
                or{" "}
                <kbd className="px-2.5 py-1 rounded-lg bg-white/10 border border-white/20 text-[#5eead4] font-mono text-xs font-semibold">
                  Cmd + J
                </kbd>{" "}
                anywhere inside the workspace to summon the AI assistant for instant task breakdown, auto-generated descriptions, and intelligent summaries.
              </p>
            </div>

            {/* 8. Frequently Asked Questions */}
            <div
              id="faq"
              className="scroll-mt-24 rounded-[28px] sm:rounded-[32px] bg-white dark:bg-[#12211E] border border-black/8 dark:border-[#285A48] p-6 sm:p-8 shadow-sm"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-[#e6f4ed] dark:bg-[#1b3b30] text-[#086948] dark:text-[#8bd5b9] flex items-center justify-center shrink-0">
                  <HelpCircle className="w-5 h-5" />
                </div>
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[#161e12] dark:text-[#E3F5EC]">
                  Frequently asked questions
                </h2>
              </div>

              <div className="space-y-3.5">
                {HELP_FAQS.map((faq, idx) => {
                  const isOpen = openFaq === idx;

                  return (
                    <div
                      key={faq.q}
                      className="rounded-2xl bg-[#f4f7f4] dark:bg-[#0c1612] border border-transparent dark:border-[#1e3b30] overflow-hidden transition-all"
                    >
                      <button
                        type="button"
                        onClick={() => toggleFaq(idx)}
                        className="w-full p-4 sm:p-5 text-left flex items-center justify-between gap-4 cursor-pointer focus:outline-none"
                      >
                        <span className="text-sm sm:text-base font-bold text-[#161e12] dark:text-[#E3F5EC] tracking-tight">
                          {faq.q}
                        </span>
                        <div
                          className={`w-7 h-7 rounded-full bg-white dark:bg-[#1b3b30] flex items-center justify-center text-[#161e12] dark:text-[#E3F5EC] shrink-0 transition-transform duration-200 ${
                            isOpen ? "rotate-180 text-[#086948] dark:text-[#8bd5b9]" : ""
                          }`}
                        >
                          <ChevronDown className="w-4 h-4" />
                        </div>
                      </button>

                      {isOpen && (
                        <div className="px-4 sm:px-5 pb-5 pt-1 text-xs sm:text-sm text-[#4B5750] dark:text-[#9bb7ab] leading-relaxed border-t border-black/5 dark:border-white/5">
                          {faq.a}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* ========================================================================= */}
      {/* 3. STILL HAVE QUESTIONS BANNER                                            */}
      {/* ========================================================================= */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16 sm:pb-24">
        <div className="rounded-[28px] bg-[#086948] dark:bg-[#134e3a] text-white p-7 sm:p-10 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-md transition-colors text-left">
          <div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight leading-snug">
              Still have questions or need custom assistance?
            </h2>
            <p className="mt-2 text-sm sm:text-base text-white/85 max-w-xl leading-relaxed">
              Our engineering and setup team is here to assist with company onboarding, CRM pipelines, and custom setups.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <Link
              href="/contact"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-white hover:bg-gray-100 text-[#0C1511] px-7 py-3.5 text-sm sm:text-base font-semibold transition-all duration-200 shadow-sm hover:scale-[1.02] active:scale-[0.98]"
            >
              <span>Contact support</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

    </div>
  );
}
