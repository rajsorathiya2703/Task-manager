"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  UserCheck,
  Columns3,
  AppWindow,
  Search,
  Code2,
  Share2,
  Check,
  PenTool,
  SlidersHorizontal,
  ShieldCheck,
  Zap,
} from "lucide-react";

interface ServiceItem {
  id: string;
  num: string;
  shortName: string;
  title: string;
  badge: string;
  description: string;
  deliverables: string[];
  icon: React.ComponentType<{ className?: string }>;
  isMilestone?: boolean;
}

const SERVICES_DATA: ServiceItem[] = [
  {
    id: "crm",
    num: "01",
    shortName: "CRM",
    title: "CRM Setup & Configuration",
    badge: "Odoo CRM · HubSpot CRM",
    description:
      "We configure and tailor Odoo CRM and HubSpot CRM around your exact sales process. From lead capture and deal stages to contact lifecycles and automated follow-ups — no bloat, just the pipeline your team actually uses.",
    deliverables: [
      "Custom pipeline stages & deal flow",
      "Automated lead routing & notifications",
      "Data migration from spreadsheets or legacy CRM",
      "Team onboarding and sales workflow training",
      "Executive reporting and sales velocity dashboards",
    ],
    icon: UserCheck,
  },
  {
    id: "project-management",
    num: "02",
    shortName: "Project management",
    title: "Project Management Tool",
    badge: "Tasks · Boards · Timelines",
    description:
      "A structured, intuitive system to organize tasks, assign owners, track milestones, and keep projects moving forward without endless status meetings and chaotic threads.",
    deliverables: [
      "Custom Kanban boards with multi-stage flows",
      "Gantt & timeline visual scheduling",
      "Task dependencies and subtask checklists",
      "Billable time tracking and leave balance management",
      "Automated status updates and role-based permissions",
    ],
    icon: Columns3,
  },
  {
    id: "website",
    num: "03",
    shortName: "Website",
    title: "Website Design, Management & Maintenance",
    badge: "Design · Manage · Maintain",
    description:
      "Bespoke, high-performance websites engineered to represent your brand with authority and convert visitors into high-intent enquiries. We keep your site fast, secure, and continually updated.",
    deliverables: [
      "Tailored modern UI/UX design with brand identity",
      "Lightning-fast Next.js architecture with 99+ PageSpeed",
      "Mobile-first responsive design across all screen sizes",
      "Hosting, domain DNS, and SSL security configuration",
      "Ongoing monthly maintenance, backups & content updates",
    ],
    icon: AppWindow,
  },
  {
    id: "seo-aeo",
    num: "04",
    shortName: "SEO and AEO",
    title: "SEO and AEO Management",
    badge: "Search + AI answers",
    description:
      "Ensure your business is recommended where modern customers look: traditional search engines like Google, and modern AI answer engines including ChatGPT, Perplexity, and Claude.",
    deliverables: [
      "Technical SEO audit and on-page optimization",
      "Answer Engine Optimization (AEO) for AI citation",
      "Structured JSON-LD schema markup implementation",
      "High-intent keyword and topical authority strategy",
      "Monthly search visibility, rankings, and traffic reporting",
    ],
    icon: Search,
  },
  {
    id: "applications",
    num: "05",
    shortName: "Applications",
    title: "Application Development",
    badge: "Custom web & business apps",
    description:
      "Full-stack custom web and business applications engineered specifically for the workflows only your organization does. From client portals to internal management tools.",
    deliverables: [
      "Custom business portals and client self-service hubs",
      "Robust REST & WebSocket API architecture",
      "Secure authentication, JWT sessions, and RBAC",
      "Scalable SQL/NoSQL database modeling",
      "End-to-end testing, deployment, and cloud infrastructure",
    ],
    icon: Code2,
  },
  {
    id: "mcp",
    num: "06",
    shortName: "MCP",
    title: "MCP Tools for Business Applications",
    badge: "AI connected to your apps",
    description:
      "Implement the Model Context Protocol (MCP) to safely connect AI models, agents, and LLMs directly to your company's CRM, internal databases, and business tools with enterprise security.",
    deliverables: [
      "Custom MCP server development & tool definitions",
      "Bi-directional connectivity to CRM and project databases",
      "Strict data privacy, scope limits, and audit logging",
      "AI assistant integration with Cursor, Claude, and internal bots",
      "Safe, autonomous task execution and workflow automation",
    ],
    icon: Share2,
    isMilestone: true,
  },
];

export function ServicesSection() {
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [selectedCrm, setSelectedCrm] = useState<"odoo" | "hubspot">("odoo");

  const scrollToService = (id: string) => {
    setActiveFilter(id === activeFilter ? null : id);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <div className="relative isolate overflow-hidden bg-[var(--home-bg)] text-[var(--home-text-body)] transition-colors duration-300">

      {/* ========================================================================= */}
      {/* 1. HERO SECTION: EXACT MATCH TO USER REFERENCE IMAGE                      */}
      {/* ========================================================================= */}
      <section className="relative pt-10 sm:pt-16 pb-12 sm:pb-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 overflow-hidden">

        {/* Soft Organic Curved Sage Shape on Right */}
        <div
          className="absolute -right-20 sm:-right-10 -top-24 sm:-top-16 w-[420px] sm:w-[560px] lg:w-[680px] h-[420px] sm:h-[560px] lg:h-[680px] rounded-full bg-[#dce9df] dark:bg-[#142d24] opacity-80 pointer-events-none -z-10 transition-colors duration-300"
          aria-hidden="true"
        />

        <div className="max-w-4xl text-left">
          {/* Eyebrow Pill */}
          <div className="inline-flex items-center gap-2 rounded-full border border-black/15 dark:border-[#285A48] bg-white/90 dark:bg-[#12211E]/95 backdrop-blur-sm px-4 py-1.5 text-xs sm:text-sm font-semibold text-[#161e12] dark:text-[#E3F5EC] shadow-2xs w-fit mb-6 transition-colors">
            <span className="w-2 h-2 rounded-full bg-[#086948] dark:bg-[#8bd5b9] shrink-0" />
            <span>Our services</span>
          </div>

          {/* Main Headline */}
          <h1 className="text-4xl sm:text-6xl lg:text-[64px] font-extrabold tracking-tight leading-[1.05]">
            <span className="text-[#161e12] dark:text-[#F3FDF8]">
              Six services.{" "}
            </span>
            <span className="text-[#086948] dark:text-[#8bd5b9]">
              One connected team.
            </span>
          </h1>

          {/* Subtext Paragraph */}
          <p className="mt-5 sm:mt-6 text-base sm:text-lg text-[#374151] dark:text-[#9bb7ab] max-w-2xl leading-relaxed">
            From CRM and project management to websites, search, applications and AI, here is exactly what Own Technology can set up and run for you.
          </p>

          {/* 6 Quick Jump Pills / Filter Badges */}
          <div className="mt-8 sm:mt-10 flex flex-wrap items-center gap-2.5 sm:gap-3.5">
            {SERVICES_DATA.map((service) => {
              const isActive = activeFilter === service.id;
              const isMCP = service.id === "mcp";

              return (
                <button
                  key={service.id}
                  type="button"
                  onClick={() => scrollToService(service.id)}
                  className={`inline-flex items-center gap-2 rounded-full px-4 sm:px-5 py-2.5 text-xs sm:text-sm font-semibold transition-all duration-200 cursor-pointer shadow-xs hover:scale-[1.02] active:scale-[0.98] ${
                    isMCP
                      ? "bg-[#0e1916] dark:bg-[#06100f] text-white border border-black/20 dark:border-[#285A48] shadow-sm"
                      : isActive
                      ? "bg-[#086948] text-white border border-[#086948] shadow-sm"
                      : "bg-white dark:bg-[#12211E] text-[#161e12] dark:text-[#E3F5EC] border border-black/10 dark:border-[#285A48] hover:border-black/25 dark:hover:border-[#8bd5b9]/50"
                  }`}
                >
                  <span
                    className={`font-mono font-bold text-xs ${
                      isMCP
                        ? "text-[#6EE7B7] dark:text-[#8bd5b9]"
                        : isActive
                        ? "text-white/80"
                        : "text-[#086948] dark:text-[#8bd5b9]"
                    }`}
                  >
                    {service.num}
                  </span>
                  <span>{service.shortName}</span>
                </button>
              );
            })}

            {activeFilter && (
              <button
                type="button"
                onClick={() => setActiveFilter(null)}
                className="text-xs text-[#086948] dark:text-[#8bd5b9] underline underline-offset-4 font-semibold px-2 hover:opacity-80 transition-opacity"
              >
                View all
              </button>
            )}
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 2. SERVICE 01: CRM SETUP AND CONFIGURATION (EXACT MATCH TO DESIGN)        */}
      {/* ========================================================================= */}
      <section
        id="crm"
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 border-t border-[var(--home-border)]"
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
          
          {/* LEFT COLUMN: Eyebrow with icon, Title, Description, Checklist, CTA Button */}
          <div className="lg:col-span-5 flex flex-col justify-center text-left">
            {/* Eyebrow with UserCheck Icon */}
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-[#e6f4ed] dark:bg-[#1b3b30] flex items-center justify-center text-[#086948] dark:text-[#8bd5b9] shrink-0">
                <UserCheck className="w-5 h-5" />
              </div>
              <span className="text-xs sm:text-sm font-bold tracking-widest text-[#086948] dark:text-[#8bd5b9] uppercase font-mono">
                SERVICE 01
              </span>
            </div>

            {/* Main Title */}
            <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-[#161e12] dark:text-[#E3F5EC] leading-[1.08]">
              CRM setup and
              <br />
              configuration
            </h2>

            {/* Paragraph */}
            <p className="mt-5 text-sm sm:text-base text-[#4B5750] dark:text-[#9bb7ab] leading-relaxed max-w-lg">
              We set up Odoo CRM and HubSpot CRM around the way your team actually sells, so every lead, deal and follow-up lives in one place.
            </p>

            {/* 4 Checklist Items with Solid Green Check Badge */}
            <div className="mt-7 space-y-3.5">
              {[
                "Odoo CRM and HubSpot CRM installation",
                "Pipelines, stages and automation rules",
                "Data import, clean-up and integrations",
                "Team training and ongoing support",
              ].map((item) => (
                <div key={item} className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-[#086948] text-white flex items-center justify-center shrink-0 shadow-xs">
                    <Check className="w-3 h-3 stroke-[3]" />
                  </div>
                  <span className="text-sm font-semibold text-[#161e12] dark:text-[#E3F5EC]">
                    {item}
                  </span>
                </div>
              ))}
            </div>

            {/* CTA Button */}
            <div className="mt-8">
              <Link
                href="/contact"
                className="inline-flex items-center gap-2 rounded-full bg-[#0C1511] hover:bg-[#202c25] dark:bg-[#8bd5b9] dark:hover:bg-[#a6f2d4] text-white dark:text-[#091413] px-7 py-3.5 text-sm sm:text-base font-semibold transition-all duration-200 shadow-sm hover:scale-[1.02] active:scale-[0.98]"
              >
                <span>Set up my CRM</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* RIGHT COLUMN: Sales Pipeline Kanban Mockup Card */}
          <div className="lg:col-span-7 flex items-center justify-center w-full">
            <div className="w-full rounded-[32px] bg-white dark:bg-[#12211E] border border-black/8 dark:border-[#285A48] p-5 sm:p-7 shadow-xl shadow-black/5 text-left transition-colors">
              
              {/* Top Bar: Toggle (Odoo CRM / HubSpot CRM) + Label */}
              <div className="flex items-center justify-between pb-5 border-b border-black/5 dark:border-white/10">
                <div className="inline-flex items-center p-1 rounded-full bg-[#f0f4f1] dark:bg-[#1b2b24] border border-black/5 dark:border-white/5">
                  <button
                    type="button"
                    onClick={() => setSelectedCrm("odoo")}
                    className={`px-3.5 sm:px-4 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                      selectedCrm === "odoo"
                        ? "bg-[#086948] text-white shadow-xs"
                        : "text-[#555e58] dark:text-[#86A99A] hover:text-[#161e12] dark:hover:text-white"
                    }`}
                  >
                    Odoo CRM
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedCrm("hubspot")}
                    className={`px-3.5 sm:px-4 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                      selectedCrm === "hubspot"
                        ? "bg-[#086948] text-white shadow-xs"
                        : "text-[#555e58] dark:text-[#86A99A] hover:text-[#161e12] dark:hover:text-white"
                    }`}
                  >
                    HubSpot CRM
                  </button>
                </div>

                <div className="text-xs font-semibold text-[#555e58] dark:text-[#86A99A]">
                  Sales pipeline
                </div>
              </div>

              {/* 4 Pipeline Stages (Columns) */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 py-5 overflow-x-auto">
                {/* Column 1: New (3) */}
                <div className="rounded-2xl bg-[#f7f9f7] dark:bg-[#182a22] p-2.5 sm:p-3 flex flex-col gap-2">
                  <div className="flex items-center justify-between text-xs font-bold text-[#161e12] dark:text-[#E3F5EC] px-1">
                    <span>New</span>
                    <span className="text-[#555e58] dark:text-[#86A99A] font-mono">3</span>
                  </div>
                  {/* Card 1 */}
                  <div className="rounded-xl bg-white dark:bg-[#12211E] p-2.5 shadow-2xs border border-black/5 dark:border-white/5 flex flex-col gap-1.5">
                    <div className="h-2 w-14 rounded-full bg-[#161e12] dark:bg-white/80" />
                    <div className="h-1.5 w-9 rounded-full bg-black/20 dark:bg-white/20" />
                  </div>
                  {/* Card 2 */}
                  <div className="rounded-xl bg-white dark:bg-[#12211E] p-2.5 shadow-2xs border border-black/5 dark:border-white/5 flex flex-col gap-1.5">
                    <div className="h-2 w-12 rounded-full bg-[#161e12] dark:bg-white/80" />
                    <div className="h-1.5 w-10 rounded-full bg-black/20 dark:bg-white/20" />
                  </div>
                  {/* Card 3 */}
                  <div className="rounded-xl bg-white dark:bg-[#12211E] p-2.5 shadow-2xs border border-black/5 dark:border-white/5 flex flex-col gap-1.5">
                    <div className="h-2 w-13 rounded-full bg-[#161e12] dark:bg-white/80" />
                    <div className="h-1.5 w-8 rounded-full bg-black/20 dark:bg-white/20" />
                  </div>
                </div>

                {/* Column 2: Qualified (2) */}
                <div className="rounded-2xl bg-[#f7f9f7] dark:bg-[#182a22] p-2.5 sm:p-3 flex flex-col gap-2">
                  <div className="flex items-center justify-between text-xs font-bold text-[#161e12] dark:text-[#E3F5EC] px-1">
                    <span>Qualified</span>
                    <span className="text-[#555e58] dark:text-[#86A99A] font-mono">2</span>
                  </div>
                  {/* Card 1 */}
                  <div className="rounded-xl bg-white dark:bg-[#12211E] p-2.5 shadow-2xs border border-black/5 dark:border-white/5 flex flex-col gap-1.5">
                    <div className="h-2 w-14 rounded-full bg-[#161e12] dark:bg-white/80" />
                    <div className="h-1.5 w-10 rounded-full bg-black/20 dark:bg-white/20" />
                  </div>
                  {/* Card 2 */}
                  <div className="rounded-xl bg-white dark:bg-[#12211E] p-2.5 shadow-2xs border border-black/5 dark:border-white/5 flex flex-col gap-1.5">
                    <div className="h-2 w-16 rounded-full bg-[#161e12] dark:bg-white/80" />
                    <div className="h-1.5 w-9 rounded-full bg-black/20 dark:bg-white/20" />
                  </div>
                </div>

                {/* Column 3: Proposal (2) */}
                <div className="rounded-2xl bg-[#f7f9f7] dark:bg-[#182a22] p-2.5 sm:p-3 flex flex-col gap-2">
                  <div className="flex items-center justify-between text-xs font-bold text-[#161e12] dark:text-[#E3F5EC] px-1">
                    <span>Proposal</span>
                    <span className="text-[#555e58] dark:text-[#86A99A] font-mono">2</span>
                  </div>
                  {/* Card 1 */}
                  <div className="rounded-xl bg-white dark:bg-[#12211E] p-2.5 shadow-2xs border border-black/5 dark:border-white/5 flex flex-col gap-1.5">
                    <div className="h-2 w-12 rounded-full bg-[#161e12] dark:bg-white/80" />
                    <div className="h-1.5 w-9 rounded-full bg-black/20 dark:bg-white/20" />
                  </div>
                  {/* Card 2 */}
                  <div className="rounded-xl bg-white dark:bg-[#12211E] p-2.5 shadow-2xs border border-black/5 dark:border-white/5 flex flex-col gap-1.5">
                    <div className="h-2 w-15 rounded-full bg-[#161e12] dark:bg-white/80" />
                    <div className="h-1.5 w-8 rounded-full bg-black/20 dark:bg-white/20" />
                  </div>
                </div>

                {/* Column 4: Won (1) - Green Highlighted */}
                <div className="rounded-2xl bg-[#e6f4ed] dark:bg-[#153e30] p-2.5 sm:p-3 flex flex-col gap-2">
                  <div className="flex items-center justify-between text-xs font-bold text-[#086948] dark:text-[#8bd5b9] px-1">
                    <span>Won</span>
                    <span className="font-mono">1</span>
                  </div>
                  {/* Card 1: Solid Emerald Green Card */}
                  <div className="rounded-xl bg-[#086948] dark:bg-[#059669] p-2.5 shadow-xs flex flex-col gap-1.5">
                    <div className="h-2 w-13 rounded-full bg-white" />
                    <div className="h-1.5 w-8 rounded-full bg-white/70" />
                  </div>
                </div>
              </div>

              {/* Bottom Feature Tags */}
              <div className="flex flex-wrap items-center gap-2 pt-4 border-t border-black/5 dark:border-white/10">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-[#e6f4ed] dark:bg-[#1b3b30] text-[#086948] dark:text-[#8bd5b9]">
                  Automated follow-ups
                </span>
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-[#e6f4ed] dark:bg-[#1b3b30] text-[#086948] dark:text-[#8bd5b9]">
                  Email sync
                </span>
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-[#e6f4ed] dark:bg-[#1b3b30] text-[#086948] dark:text-[#8bd5b9]">
                  Reports
                </span>
              </div>

            </div>
          </div>

        </div>
      </section>

      {/* ========================================================================= */}
      {/* 3. SERVICE 02: PROJECT MANAGEMENT TOOL (EXACT MATCH TO DESIGN)            */}
      {/* ========================================================================= */}
      <section
        id="project-management"
        className="relative bg-[#091511] dark:bg-[#06100c] text-white py-12 sm:py-20 border-t border-[#1d352b] overflow-hidden"
      >
        {/* Subtle Ambient Radial Glow */}
        <div
          className="absolute -left-24 top-1/2 -translate-y-1/2 w-[480px] h-[480px] rounded-full bg-[#086948]/15 blur-3xl pointer-events-none -z-10"
          aria-hidden="true"
        />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">

            {/* LEFT COLUMN: Project Timeline Gantt Mockup Card */}
            <div className="lg:col-span-7 flex items-center justify-center w-full order-2 lg:order-1">
              <div className="w-full rounded-[32px] bg-[#10201a] border border-[#1d352b] p-5 sm:p-7 shadow-2xl text-left">
                
                {/* Card Header: Title & "On track" Badge */}
                <div className="flex items-center justify-between pb-6 border-b border-white/10">
                  <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                    Project timeline
                  </h3>
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-[#183a2d] text-[#5eead4] border border-[#275341]">
                    On track
                  </span>
                </div>

                {/* Gantt Timeline Grid */}
                <div className="pt-6 pb-6">
                  {/* Timeline Header Row (Week Columns) */}
                  <div className="grid grid-cols-12 gap-1 sm:gap-2 text-[11px] font-mono text-gray-400 pb-4">
                    <div className="col-span-3" />
                    <div className="col-span-9 grid grid-cols-6 text-center">
                      <div>Wk 1</div>
                      <div>Wk 2</div>
                      <div>Wk 3</div>
                      <div>Wk 4</div>
                      <div>Wk 5</div>
                      <div>Wk 6</div>
                    </div>
                  </div>

                  {/* 5 Timeline Rows with Vertical Guidelines */}
                  <div className="relative space-y-4">
                    {/* Vertical Guidelines (6 Week Columns) */}
                    <div className="absolute inset-0 left-[25%] grid grid-cols-6 pointer-events-none">
                      <div className="border-r border-white/5 h-full" />
                      <div className="border-r border-white/5 h-full" />
                      <div className="border-r border-white/5 h-full" />
                      <div className="border-r border-white/5 h-full" />
                      <div className="border-r border-white/5 h-full" />
                      <div className="border-r border-white/5 h-full" />
                    </div>

                    {/* Row 1: Plan */}
                    <div className="grid grid-cols-12 items-center relative z-10">
                      <div className="col-span-3 text-xs sm:text-sm font-semibold text-white">
                        Plan
                      </div>
                      <div className="col-span-9 relative h-8 flex items-center">
                        <div className="absolute left-0 w-[35%] h-7 rounded-full bg-[#6ee7b7] shadow-sm transition-transform hover:scale-[1.01]" />
                      </div>
                    </div>

                    {/* Row 2: Design */}
                    <div className="grid grid-cols-12 items-center relative z-10">
                      <div className="col-span-3 text-xs sm:text-sm font-semibold text-white">
                        Design
                      </div>
                      <div className="col-span-9 relative h-8 flex items-center">
                        <div className="absolute left-[20%] w-[38%] h-7 rounded-full bg-[#086948] shadow-sm transition-transform hover:scale-[1.01]" />
                      </div>
                    </div>

                    {/* Row 3: Build */}
                    <div className="grid grid-cols-12 items-center relative z-10">
                      <div className="col-span-3 text-xs sm:text-sm font-semibold text-white">
                        Build
                      </div>
                      <div className="col-span-9 relative h-8 flex items-center">
                        <div className="absolute left-[40%] w-[45%] h-7 rounded-full bg-[#6ee7b7] shadow-sm transition-transform hover:scale-[1.01]" />
                      </div>
                    </div>

                    {/* Row 4: Test */}
                    <div className="grid grid-cols-12 items-center relative z-10">
                      <div className="col-span-3 text-xs sm:text-sm font-semibold text-white">
                        Test
                      </div>
                      <div className="col-span-9 relative h-8 flex items-center">
                        <div className="absolute left-[70%] w-[25%] h-7 rounded-full bg-[#086948] shadow-sm transition-transform hover:scale-[1.01]" />
                      </div>
                    </div>

                    {/* Row 5: Launch */}
                    <div className="grid grid-cols-12 items-center relative z-10">
                      <div className="col-span-3 text-xs sm:text-sm font-semibold text-white">
                        Launch
                      </div>
                      <div className="col-span-9 relative h-8 flex items-center">
                        <div className="absolute right-0 w-[14%] h-7 rounded-full bg-white shadow-sm transition-transform hover:scale-[1.01]" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bottom Milestone Pills */}
                <div className="pt-5 border-t border-white/10 flex flex-wrap items-center gap-2.5">
                  {/* Milestone 1: Kick-off done */}
                  <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-2xl bg-[#183a2d] border border-[#275341] text-xs font-semibold text-white">
                    <span className="w-4 h-4 rounded-full bg-[#5eead4] text-[#091511] flex items-center justify-center text-[10px] font-bold">
                      ✓
                    </span>
                    <span>Kick-off done</span>
                  </div>

                  {/* Milestone 2: Review designs */}
                  <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-2xl bg-[#13271f] border border-[#1d352b] text-xs font-medium text-gray-300">
                    <span className="w-3.5 h-3.5 rounded-full border-2 border-[#5eead4]" />
                    <span>Review designs</span>
                  </div>

                  {/* Milestone 3: Go live */}
                  <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-2xl bg-[#13271f] border border-[#1d352b] text-xs font-medium text-gray-400">
                    <span className="w-3.5 h-3.5 rounded-full border-2 border-white/20" />
                    <span>Go live</span>
                  </div>
                </div>

              </div>
            </div>

            {/* RIGHT COLUMN: Eyebrow, Title, Description, 4 Feature Tiles, CTA Button */}
            <div className="lg:col-span-5 flex flex-col justify-center text-left order-1 lg:order-2">
              {/* Eyebrow with Columns3 Icon */}
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl bg-[#183327] text-[#5eead4] flex items-center justify-center shrink-0">
                  <Columns3 className="w-5 h-5" />
                </div>
                <span className="text-xs sm:text-sm font-bold tracking-widest text-[#5eead4] uppercase font-mono">
                  SERVICE 02
                </span>
              </div>

              {/* Main Title */}
              <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white leading-[1.08]">
                Project management
                <br />
                tool
              </h2>

              {/* Description */}
              <p className="mt-5 text-sm sm:text-base text-gray-300 leading-relaxed max-w-lg">
                We provide and set up a project management tool that gives your team one clear view of who is doing what, and by when.
              </p>

              {/* 2x2 Feature Tiles */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-3.5 mt-7">
                {/* Tile 1 */}
                <div className="rounded-2xl bg-[#10201a] border border-[#1d352b] p-4 text-left">
                  <h4 className="text-sm sm:text-base font-bold text-white mb-1">
                    Boards and tasks
                  </h4>
                  <p className="text-xs text-gray-400 leading-relaxed">
                    Assign owners and due dates.
                  </p>
                </div>

                {/* Tile 2 */}
                <div className="rounded-2xl bg-[#10201a] border border-[#1d352b] p-4 text-left">
                  <h4 className="text-sm sm:text-base font-bold text-white mb-1">
                    Timelines
                  </h4>
                  <p className="text-xs text-gray-400 leading-relaxed">
                    See the plan week by week.
                  </p>
                </div>

                {/* Tile 3 */}
                <div className="rounded-2xl bg-[#10201a] border border-[#1d352b] p-4 text-left">
                  <h4 className="text-sm sm:text-base font-bold text-white mb-1">
                    Team roles
                  </h4>
                  <p className="text-xs text-gray-400 leading-relaxed">
                    Control who can see and edit.
                  </p>
                </div>

                {/* Tile 4 */}
                <div className="rounded-2xl bg-[#10201a] border border-[#1d352b] p-4 text-left">
                  <h4 className="text-sm sm:text-base font-bold text-white mb-1">
                    Progress reports
                  </h4>
                  <p className="text-xs text-gray-400 leading-relaxed">
                    Know where every project stands.
                  </p>
                </div>
              </div>

              {/* CTA Button */}
              <div className="mt-8">
                <Link
                  href="/contact"
                  className="inline-flex items-center gap-2 rounded-full bg-white hover:bg-gray-100 text-[#0C1511] px-7 py-3.5 text-sm sm:text-base font-semibold transition-all duration-200 shadow-sm hover:scale-[1.02] active:scale-[0.98]"
                >
                  <span>Get a project tool</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 4. SERVICE 03: WEBSITE DESIGN, MANAGEMENT AND MAINTENANCE (EXACT)        */}
      {/* ========================================================================= */}
      <section
        id="website"
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 border-t border-[var(--home-border)]"
      >
        {/* Top Header Row: Title & Eyebrow on Left, Subtext & CTA Button on Right */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-end mb-10 sm:mb-12">
          
          {/* Left: Eyebrow + Headline */}
          <div className="lg:col-span-7 text-left">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-[#e6f4ed] dark:bg-[#1b3b30] flex items-center justify-center text-[#086948] dark:text-[#8bd5b9] shrink-0">
                <AppWindow className="w-5 h-5" />
              </div>
              <span className="text-xs sm:text-sm font-bold tracking-widest text-[#086948] dark:text-[#8bd5b9] uppercase font-mono">
                SERVICE 03
              </span>
            </div>

            <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-[#161e12] dark:text-[#E3F5EC] leading-[1.08]">
              Website design,
              <br />
              management and
              <br />
              maintenance
            </h2>
          </div>

          {/* Right: Subtext + Action CTA */}
          <div className="lg:col-span-5 flex flex-col justify-end text-left lg:pb-1">
            <p className="text-sm sm:text-base text-[#4B5750] dark:text-[#9bb7ab] leading-relaxed max-w-md">
              A site that looks sharp, loads fast and stays secure, designed by us and looked after long after launch.
            </p>
            <div className="mt-5">
              <Link
                href="/contact"
                className="inline-flex items-center gap-2 rounded-full bg-[#0C1511] hover:bg-[#202c25] dark:bg-[#8bd5b9] dark:hover:bg-[#a6f2d4] text-white dark:text-[#091413] px-7 py-3.5 text-sm sm:text-base font-semibold transition-all duration-200 shadow-sm hover:scale-[1.02] active:scale-[0.98]"
              >
                <span>Plan my website</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>

        {/* Lower Row: Browser Window Graphic (Left) + 3 Feature Cards (Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
          
          {/* Left Column: Dark Browser Mockup Frame with Floating Badges */}
          <div className="lg:col-span-7 relative flex items-center justify-center">
            
            {/* The Browser Window Container */}
            <div className="w-full rounded-[28px] sm:rounded-[32px] bg-[#0c1612] dark:bg-[#06100c] border border-[#1b2f26] p-5 sm:p-7 shadow-2xl relative text-left overflow-hidden">
              
              {/* Window Header / Window Controls */}
              <div className="flex items-center gap-2 pb-5 border-b border-white/5">
                <span className="w-2.5 h-2.5 rounded-full bg-white/20" />
                <span className="w-2.5 h-2.5 rounded-full bg-white/20" />
                <span className="w-2.5 h-2.5 rounded-full bg-white/20" />
                <div className="ml-3 h-6 w-44 sm:w-60 rounded-full bg-white/5 border border-white/5" />
              </div>

              {/* Web Page Content Preview */}
              <div className="pt-6 pb-4">
                {/* Mint Pill Tag */}
                <div className="h-2.5 w-16 rounded-full bg-[#6ee7b7] mb-4" />

                {/* Big White Headline Bars */}
                <div className="h-5 w-[85%] rounded-full bg-white mb-2.5" />
                <div className="h-5 w-[55%] rounded-full bg-white mb-4" />

                {/* Subtitle Gray Bar */}
                <div className="h-2 w-[70%] rounded-full bg-white/20 mb-6" />

                {/* Emerald Green Action Button */}
                <div className="h-9 w-28 rounded-full bg-[#086948]" />

                {/* 3 Content Blocks at the bottom */}
                <div className="grid grid-cols-3 gap-2.5 sm:gap-3 mt-7">
                  <div className="h-16 rounded-2xl bg-white/5 border border-white/5" />
                  <div className="h-16 rounded-2xl bg-white/5 border border-white/5" />
                  <div className="h-16 rounded-2xl bg-white/5 border border-white/5" />
                </div>
              </div>
            </div>

            {/* Floating Badge 1: Secure and online (Top Right) */}
            <div className="absolute -right-2 sm:-right-4 top-[24%] -translate-y-1/2 z-10 shadow-xl rounded-full">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white dark:bg-[#12211E] border border-black/10 dark:border-[#285A48] text-xs font-semibold text-[#161e12] dark:text-[#E3F5EC]">
                <span className="w-2 h-2 rounded-full bg-[#086948] dark:bg-[#8bd5b9] shrink-0" />
                <span>Secure and online</span>
              </div>
            </div>

            {/* Floating Badge 2: Fast loading (Bottom Right) */}
            <div className="absolute right-4 sm:right-6 -bottom-3 z-10 shadow-xl rounded-full">
              <div className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#086948] text-white text-xs font-semibold shadow-md">
                <Zap className="w-3.5 h-3.5 fill-current" />
                <span>Fast loading</span>
              </div>
            </div>

          </div>

          {/* Right Column: 3 Stacked Cards (Design, Management, Maintenance) */}
          <div className="lg:col-span-5 flex flex-col gap-3.5 sm:gap-4">
            
            {/* Card 1: Design */}
            <div className="rounded-[24px] bg-white dark:bg-[#12211E] border border-black/8 dark:border-[#285A48] p-5 sm:p-6 shadow-sm hover:shadow-md transition-all flex items-center gap-4 text-left">
              <div className="w-12 h-12 rounded-2xl bg-[#e6f4ed] dark:bg-[#1b3b30] text-[#086948] dark:text-[#8bd5b9] flex items-center justify-center shrink-0">
                <PenTool className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-[#161e12] dark:text-[#E3F5EC] tracking-tight">
                  Design
                </h3>
                <p className="mt-1 text-xs sm:text-sm text-[#555e58] dark:text-[#86A99A] leading-relaxed">
                  Modern, on-brand layouts that work on every screen.
                </p>
              </div>
            </div>

            {/* Card 2: Management */}
            <div className="rounded-[24px] bg-white dark:bg-[#12211E] border border-black/8 dark:border-[#285A48] p-5 sm:p-6 shadow-sm hover:shadow-md transition-all flex items-center gap-4 text-left">
              <div className="w-12 h-12 rounded-2xl bg-[#e6f4ed] dark:bg-[#1b3b30] text-[#086948] dark:text-[#8bd5b9] flex items-center justify-center shrink-0">
                <SlidersHorizontal className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-[#161e12] dark:text-[#E3F5EC] tracking-tight">
                  Management
                </h3>
                <p className="mt-1 text-xs sm:text-sm text-[#555e58] dark:text-[#86A99A] leading-relaxed">
                  Content updates, new pages and changes handled for you.
                </p>
              </div>
            </div>

            {/* Card 3: Maintenance (Black Highlight Milestone Card) */}
            <div className="rounded-[24px] bg-[#0c1612] dark:bg-[#06100f] text-white border border-black/20 dark:border-[#285A48] p-5 sm:p-6 shadow-lg shadow-black/10 hover:shadow-xl transition-all flex items-center gap-4 text-left">
              <div className="w-12 h-12 rounded-2xl bg-[#183327] text-[#5eead4] flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  Maintenance
                </h3>
                <p className="mt-1 text-xs sm:text-sm text-[#9ca3af] leading-relaxed">
                  Backups, security updates and uptime monitoring.
                </p>
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* ========================================================================= */}
      {/* 5. SERVICE 04: SEO AND AEO MANAGEMENT (EXACT MATCH TO DESIGN)             */}
      {/* ========================================================================= */}
      <section
        id="seo-aeo"
        className="relative bg-[#086948] dark:bg-[#07432e] text-white py-12 sm:py-20 border-t border-[#0b7d56] dark:border-[#0a573d] overflow-hidden transition-colors duration-300"
      >
        {/* Subtle Ambient Organic Curved Shape on Right */}
        <div
          className="absolute -right-28 -top-28 w-[500px] sm:w-[650px] lg:w-[800px] h-[500px] sm:h-[650px] lg:h-[800px] rounded-full bg-white/[0.06] dark:bg-white/[0.04] pointer-events-none -z-10"
          aria-hidden="true"
        />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
            
            {/* LEFT COLUMN: Eyebrow with Search icon, Title, Description, Checklist, CTA Button */}
            <div className="lg:col-span-5 flex flex-col justify-center text-left">
              {/* Eyebrow with Search Icon */}
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur-xs flex items-center justify-center text-white shrink-0 shadow-xs">
                  <Search className="w-5 h-5" />
                </div>
                <span className="text-xs sm:text-sm font-bold tracking-widest text-white/90 uppercase font-mono">
                  SERVICE 04
                </span>
              </div>

              {/* Main Title */}
              <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white leading-[1.08]">
                SEO and AEO
                <br />
                management
              </h2>

              {/* Paragraph */}
              <p className="mt-5 text-sm sm:text-base text-white/90 leading-relaxed max-w-lg">
                We manage your website&apos;s search engine optimisation and answer engine optimisation, so customers find you in search results and in AI assistants.
              </p>

              {/* 4 Checklist Items with Solid White Check Badge */}
              <div className="mt-7 space-y-3.5">
                {[
                  "Keyword research and on-page optimisation",
                  "Technical fixes, speed and structured data",
                  "Content that AI assistants can quote",
                  "Ongoing monitoring and reporting",
                ].map((item) => (
                  <div key={item} className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full bg-white text-[#086948] flex items-center justify-center shrink-0 shadow-xs">
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    </div>
                    <span className="text-sm sm:text-base text-white font-medium">
                      {item}
                    </span>
                  </div>
                ))}
              </div>

              {/* CTA Button */}
              <div className="mt-8 sm:mt-10">
                <Link
                  href="/contact"
                  className="inline-flex items-center gap-2 rounded-full bg-[#0C1511] hover:bg-[#1f2d26] text-white px-7 py-3.5 text-sm sm:text-base font-semibold transition-all duration-200 shadow-md hover:scale-[1.02] active:scale-[0.98]"
                >
                  <span>Improve my visibility</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>

            {/* RIGHT COLUMN: 2 Stacked Results Cards (Search Engine + AI Assistant) */}
            <div className="lg:col-span-7 flex flex-col gap-5 sm:gap-6 w-full text-left">
              
              {/* Card 1: Search Engine Results (White Card) */}
              <div className="w-full rounded-[28px] sm:rounded-[32px] bg-white text-[#161e12] p-5 sm:p-7 shadow-2xl relative text-left">
                {/* Card Header: SEO Search Results Badge + Label */}
                <div className="flex items-center justify-between pb-3 sm:pb-4">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-[11px] font-mono font-bold tracking-wider uppercase bg-[#e6f4ed] text-[#086948]">
                    SEO · SEARCH RESULTS
                  </span>
                  <span className="text-xs sm:text-sm text-[#555e58] font-medium">
                    Search engine
                  </span>
                </div>

                {/* Simulated Search Input Bar */}
                <div className="mt-2 rounded-full border border-gray-200 bg-white px-4 py-2.5 sm:py-3 flex items-center gap-3 text-sm text-[#161e12] shadow-xs">
                  <Search className="w-4 h-4 text-gray-400 shrink-0" />
                  <span className="text-sm font-normal text-gray-700">best CRM setup partner</span>
                </div>

                {/* Highlight Rank 1 Result Box */}
                <div className="mt-4 sm:mt-5 rounded-2xl bg-[#eaf4ee] p-4 sm:p-5 border-l-4 border-[#086948] text-left">
                  <div className="text-xs font-bold text-[#086948] tracking-wide">
                    Your website · Rank 1
                  </div>
                  <h4 className="text-sm sm:text-base font-bold text-[#161e12] mt-1 tracking-tight">
                    Own Technology | CRM, websites and AI
                  </h4>
                  {/* Simulated snippet line */}
                  <div className="h-2 w-3/4 rounded-full bg-[#d0ded5] mt-2.5" />
                </div>

                {/* Faint regular search results skeleton bars */}
                <div className="pt-4 pl-1 space-y-2">
                  <div className="h-2 w-[42%] rounded-full bg-gray-200" />
                  <div className="h-2 w-[68%] rounded-full bg-gray-200" />
                </div>
              </div>

              {/* Card 2: AI Assistant Answer (Obsidian Dark Card) */}
              <div className="w-full rounded-[28px] sm:rounded-[32px] bg-[#0c1612] border border-[#1b2f26] text-white p-5 sm:p-7 shadow-2xl relative text-left">
                {/* Card Header: AEO AI Answer Badge + Label */}
                <div className="flex items-center justify-between pb-3 sm:pb-4">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-[11px] font-mono font-bold tracking-wider uppercase bg-[#183327] text-[#5eead4] border border-[#275341]/60">
                    AEO · AI ANSWER
                  </span>
                  <span className="text-xs sm:text-sm text-gray-400 font-medium">
                    AI assistant
                  </span>
                </div>

                {/* AI Assistant Answer Body */}
                <p className="mt-2 text-sm sm:text-base text-gray-200 leading-relaxed font-normal">
                  For CRM setup, a team like{" "}
                  <span className="text-[#5eead4] font-semibold">Own Technology</span>{" "}
                  can configure Odoo CRM or HubSpot CRM around your sales process and train your team.
                </p>

                {/* Source Citation Pill */}
                <div className="mt-4 sm:mt-5">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-[#192721] text-gray-300 border border-white/10">
                    Source: your website
                  </span>
                </div>
              </div>

            </div>

          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 6. SERVICE 05: APPLICATION DEVELOPMENT (EXACT MATCH TO DESIGN)             */}
      {/* ========================================================================= */}
      <section
        id="applications"
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 border-t border-[var(--home-border)] transition-colors duration-300"
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-center">
          
          {/* LEFT COLUMN: Code Editor Mockup + Floating App Card + Floating Status Badge */}
          <div className="lg:col-span-6 relative flex items-center justify-center">
            
            {/* The Code Editor Window Container */}
            <div className="w-full rounded-[28px] sm:rounded-[32px] bg-[#0c1612] dark:bg-[#06100c] border border-[#1b2f26] p-5 sm:p-7 shadow-2xl relative text-left overflow-hidden">
              
              {/* Window Header / Window Controls + Tab */}
              <div className="flex items-center pb-5 border-b border-white/5">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-white/20" />
                  <span className="w-2.5 h-2.5 rounded-full bg-white/20" />
                  <span className="w-2.5 h-2.5 rounded-full bg-white/20" />
                </div>
                <div className="ml-4 px-3 py-1 rounded-md bg-white/5 border border-white/5 text-[11px] font-mono text-gray-300">
                  orders.service.ts
                </div>
              </div>

              {/* Code Snippet */}
              <div className="pt-6 pb-6 font-mono text-xs sm:text-[13px] leading-relaxed text-gray-300 select-none">
                <div>
                  <span className="text-[#6ee7b7]">export class</span>{" "}
                  <span className="text-white font-semibold">OrdersService</span> {"{"}
                </div>
                <div className="pl-4 sm:pl-6 mt-1.5">
                  <span className="text-[#6ee7b7]">async</span>{" "}
                  <span className="text-white">create</span>
                  <span className="text-gray-400">(</span>
                  <span className="text-gray-300">data</span>
                  <span className="text-gray-400">)</span> {"{"}
                </div>
                <div className="pl-8 sm:pl-12 mt-1.5">
                  <span className="text-[#6ee7b7]">const</span>{" "}
                  <span className="text-white">order</span> ={" "}
                  <span className="text-[#6ee7b7]">await</span>{" "}
                  <span className="text-gray-300">this</span>.
                  <span className="text-white">save</span>
                  <span className="text-gray-400">(</span>
                  <span className="text-gray-300">data</span>
                  <span className="text-gray-400">);</span>
                </div>
                <div className="pl-8 sm:pl-12 mt-1.5">
                  <span className="text-[#6ee7b7]">await</span>{" "}
                  <span className="text-gray-300">this</span>.
                  <span className="text-white">notifyTeam</span>
                  <span className="text-gray-400">(</span>
                  <span className="text-gray-300">order</span>
                  <span className="text-gray-400">);</span>
                </div>
                <div className="pl-8 sm:pl-12 mt-1.5">
                  <span className="text-[#6ee7b7]">return</span>{" "}
                  <span className="text-white">order</span>;
                </div>
                <div className="pl-4 sm:pl-6 mt-1.5">{"}"}</div>
                <div className="mt-1.5">{"}"}</div>
              </div>
            </div>

            {/* Floating Card 1: Your App Preview (Top Right) */}
            <div className="absolute -right-2 sm:-right-6 top-8 sm:top-12 z-10 shadow-2xl rounded-2xl bg-white dark:bg-[#12211E] border border-black/8 dark:border-[#285A48] p-3.5 sm:p-4.5 w-44 sm:w-52 text-left">
              <span className="text-[10px] font-mono font-bold tracking-wider text-[#086948] dark:text-[#8bd5b9] uppercase">
                YOUR APP
              </span>
              <div className="h-2 sm:h-2.5 w-28 sm:w-32 bg-[#161e12] dark:bg-white rounded-full mt-2 mb-3" />
              <div className="grid grid-cols-2 gap-2">
                <div className="h-9 sm:h-11 rounded-xl bg-[#e6f4ed] dark:bg-[#1b3b30]" />
                <div className="h-9 sm:h-11 rounded-xl bg-[#086948] dark:bg-[#0e7b57]" />
              </div>
              <div className="h-1.5 w-3/4 bg-gray-200 dark:bg-white/20 rounded-full mt-2.5" />
              <div className="h-1.5 w-1/2 bg-gray-200 dark:bg-white/20 rounded-full mt-1.5" />
            </div>

            {/* Floating Badge 2: Deployed to production (Bottom Left) */}
            <div className="absolute left-4 sm:left-8 -bottom-3.5 z-10 shadow-xl rounded-full">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#086948] text-white text-xs sm:text-sm font-semibold shadow-md">
                <div className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                  <Check className="w-2.5 h-2.5 stroke-[3]" />
                </div>
                <span>Deployed to production</span>
              </div>
            </div>

          </div>

          {/* RIGHT COLUMN: Eyebrow + Headline + Description + 2x2 Feature Grid + CTA */}
          <div className="lg:col-span-6 flex flex-col justify-center text-left">
            {/* Eyebrow with Code2 Icon */}
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-[#e6f4ed] dark:bg-[#1b3b30] flex items-center justify-center text-[#086948] dark:text-[#8bd5b9] shrink-0">
                <Code2 className="w-5 h-5" />
              </div>
              <span className="text-xs sm:text-sm font-bold tracking-widest text-[#086948] dark:text-[#8bd5b9] uppercase font-mono">
                SERVICE 05
              </span>
            </div>

            {/* Headline */}
            <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-[#161e12] dark:text-[#E3F5EC] leading-[1.08]">
              Application
              <br />
              development
            </h2>

            {/* Description Paragraph */}
            <p className="mt-5 text-sm sm:text-base text-[#4B5750] dark:text-[#9bb7ab] leading-relaxed max-w-lg">
              When off-the-shelf software does not fit, we build custom web and business applications around the way you work.
            </p>

            {/* 2x2 Feature Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mt-7">
              {/* Card 1: Web applications */}
              <div className="rounded-[20px] bg-white dark:bg-[#12211E] border border-black/8 dark:border-[#285A48] p-4 sm:p-5 shadow-xs text-left">
                <h3 className="text-sm sm:text-base font-bold text-[#161e12] dark:text-[#E3F5EC] tracking-tight">
                  Web applications
                </h3>
                <p className="mt-1 text-xs sm:text-sm text-[#555e58] dark:text-[#86A99A]">
                  Fast, modern and easy to use.
                </p>
              </div>

              {/* Card 2: Business tools */}
              <div className="rounded-[20px] bg-white dark:bg-[#12211E] border border-black/8 dark:border-[#285A48] p-4 sm:p-5 shadow-xs text-left">
                <h3 className="text-sm sm:text-base font-bold text-[#161e12] dark:text-[#E3F5EC] tracking-tight">
                  Business tools
                </h3>
                <p className="mt-1 text-xs sm:text-sm text-[#555e58] dark:text-[#86A99A]">
                  Dashboards, portals and workflows.
                </p>
              </div>

              {/* Card 3: Integrations */}
              <div className="rounded-[20px] bg-white dark:bg-[#12211E] border border-black/8 dark:border-[#285A48] p-4 sm:p-5 shadow-xs text-left">
                <h3 className="text-sm sm:text-base font-bold text-[#161e12] dark:text-[#E3F5EC] tracking-tight">
                  Integrations
                </h3>
                <p className="mt-1 text-xs sm:text-sm text-[#555e58] dark:text-[#86A99A]">
                  Connected to your CRM and data.
                </p>
              </div>

              {/* Card 4: Support */}
              <div className="rounded-[20px] bg-white dark:bg-[#12211E] border border-black/8 dark:border-[#285A48] p-4 sm:p-5 shadow-xs text-left">
                <h3 className="text-sm sm:text-base font-bold text-[#161e12] dark:text-[#E3F5EC] tracking-tight">
                  Support
                </h3>
                <p className="mt-1 text-xs sm:text-sm text-[#555e58] dark:text-[#86A99A]">
                  Maintained and improved after launch.
                </p>
              </div>
            </div>

            {/* CTA Button */}
            <div className="mt-8 sm:mt-10">
              <Link
                href="/contact"
                className="inline-flex items-center gap-2 rounded-full bg-[#0C1511] hover:bg-[#202c25] dark:bg-[#8bd5b9] dark:hover:bg-[#a6f2d4] text-white dark:text-[#091413] px-7 py-3.5 text-sm sm:text-base font-semibold transition-all duration-200 shadow-sm hover:scale-[1.02] active:scale-[0.98]"
              >
                <span>Build my application</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

        </div>
      </section>

      {/* ========================================================================= */}
      {/* 7. SERVICE 06: MCP TOOLS FOR YOUR BUSINESS APPLICATIONS (EXACT DESIGN)    */}
      {/* ========================================================================= */}
      <section
        id="mcp"
        className="relative bg-[#06100c] text-white py-12 sm:py-20 border-t border-[#1d352b] overflow-hidden"
      >
        {/* Subtle Ambient Radial Glow */}
        <div
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-[#086948]/20 blur-3xl pointer-events-none -z-10"
          aria-hidden="true"
        />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* Top Header Row: Eyebrow + Headline on Left, Subtext + CTA on Right */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-end mb-12 sm:mb-16">
            
            {/* Left: Eyebrow + Headline */}
            <div className="lg:col-span-7 text-left">
              <div className="flex items-center gap-3 mb-4 sm:mb-5">
                <div className="w-10 h-10 rounded-xl bg-[#1b3b30] text-[#5eead4] flex items-center justify-center shrink-0">
                  <Share2 className="w-5 h-5" />
                </div>
                <span className="text-xs sm:text-sm font-bold tracking-widest text-[#5eead4] uppercase font-mono">
                  SERVICE 06
                </span>
              </div>

              <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white leading-[1.08]">
                MCP tools for your business
                <br />
                applications
              </h2>
            </div>

            {/* Right: Subtext + White CTA Button */}
            <div className="lg:col-span-5 flex flex-col justify-end text-left lg:pb-1">
              <p className="text-sm sm:text-base text-gray-300 leading-relaxed max-w-md">
                We implement Model Context Protocol so AI assistants can safely read from and act in the tools your business already uses.
              </p>
              <div className="mt-5 sm:mt-6">
                <Link
                  href="/contact"
                  className="inline-flex items-center gap-2 rounded-full bg-white hover:bg-gray-100 text-[#0C1511] px-7 py-3.5 text-sm sm:text-base font-semibold transition-all duration-200 shadow-sm hover:scale-[1.02] active:scale-[0.98]"
                >
                  <span>Connect AI to my apps</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>

          {/* Bottom Row: Connected Node Flow Architecture Diagram */}
          <div className="w-full overflow-x-auto pb-4 pt-2">
            <div className="min-w-[860px] max-w-5xl flex items-center justify-center mx-auto py-4 px-2">
              
              {/* Left Node: AI Assistant */}
              <div className="w-56 sm:w-60 rounded-[20px] bg-[#0c1612] border border-[#1b2f26] p-5 text-left shadow-lg shrink-0">
                <span className="text-[10px] font-mono font-bold tracking-wider text-gray-400 uppercase">
                  ASK
                </span>
                <h3 className="text-base sm:text-lg font-bold text-white mt-1">
                  AI assistant
                </h3>
                <p className="text-xs text-gray-400 mt-1.5 font-normal">
                  &ldquo;Show this week&apos;s new leads&rdquo;
                </p>
              </div>

              {/* Horizontal Connector Line: Left to Center (Equal Width) */}
              <div className="flex-1 max-w-[150px] min-w-[70px] shrink flex items-center justify-center px-1 sm:px-2">
                <div className="w-full border-t-2 border-dashed border-[#1b6348]" />
              </div>

              {/* Center Highlight Node: MCP Server */}
              <div className="w-56 sm:w-60 rounded-[28px] sm:rounded-[32px] bg-[#0c6b4b] border border-[#1e9d72] p-6 sm:p-7 flex flex-col items-center justify-center text-center shadow-[0_0_40px_rgba(12,107,75,0.4)] shrink-0 relative z-10">
                {/* Vector Server Icon matching the design */}
                <svg
                  className="w-10 h-10 text-white mb-2"
                  viewBox="0 0 32 32"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="4" y="6" width="24" height="8" rx="2" />
                  <rect x="4" y="18" width="24" height="8" rx="2" />
                  <circle cx="23" cy="10" r="1" fill="currentColor" />
                  <circle cx="23" cy="22" r="1" fill="currentColor" />
                </svg>

                <h4 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                  MCP server
                </h4>
                <p className="text-xs text-emerald-100/90 mt-1 font-normal">
                  Secure and permissioned
                </p>
              </div>

              {/* Fan-out Connector Curves: Center to 4 Destinations (Identical Equal Width) */}
              <div className="flex-1 max-w-[150px] min-w-[70px] shrink flex items-center justify-center px-1 sm:px-2">
                <svg
                  className="w-full h-64 sm:h-72 pointer-events-none"
                  viewBox="0 0 100 240"
                  preserveAspectRatio="none"
                  fill="none"
                >
                  <path
                    d="M 0 120 C 50 120, 50 25, 100 25"
                    stroke="#1b6348"
                    strokeWidth="2"
                    strokeDasharray="4 4"
                  />
                  <path
                    d="M 0 120 C 50 120, 50 85, 100 85"
                    stroke="#1b6348"
                    strokeWidth="2"
                    strokeDasharray="4 4"
                  />
                  <path
                    d="M 0 120 C 50 120, 50 155, 100 155"
                    stroke="#1b6348"
                    strokeWidth="2"
                    strokeDasharray="4 4"
                  />
                  <path
                    d="M 0 120 C 50 120, 50 215, 100 215"
                    stroke="#1b6348"
                    strokeWidth="2"
                    strokeDasharray="4 4"
                  />
                </svg>
              </div>

              {/* Right Nodes: 4 Connected Systems */}
              <div className="flex flex-col gap-3 sm:gap-3.5 shrink-0">
                {[
                  "Odoo CRM",
                  "HubSpot CRM",
                  "Your database",
                  "Internal apps and APIs",
                ].map((item) => (
                  <div
                    key={item}
                    className="w-52 sm:w-60 rounded-[20px] bg-[#0c1612] border border-[#1b2f26] px-5 py-3.5 sm:py-4 flex items-center gap-3 text-left shadow-md"
                  >
                    <span className="w-2.5 h-2.5 rounded-full bg-[#5eead4] shadow-[0_0_8px_rgba(94,234,212,0.6)] shrink-0" />
                    <span className="text-sm sm:text-base font-semibold text-white tracking-tight">
                      {item}
                    </span>
                  </div>
                ))}
              </div>

            </div>
          </div>

        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 border-t border-[var(--home-border)]">
        <div className="rounded-[28px] bg-[#086948] dark:bg-[#134e3a] text-white p-7 sm:p-10 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-md transition-colors">
          <div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight leading-snug">
              Need more than one service?
            </h2>
            <p className="mt-2 text-sm sm:text-base text-white/85 max-w-xl leading-relaxed">
              Everything we build is engineered to work together under one partner. Tell us where your business is and we will map the right rollout.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <Link
              href="/contact"
              className="inline-flex items-center justify-center rounded-full bg-white hover:bg-gray-100 text-[#0C1511] px-7 py-3.5 text-sm sm:text-base font-semibold transition-all duration-200 shadow-sm hover:scale-[1.02] active:scale-[0.98]"
            >
              Plan your setup
            </Link>
            <Link
              href="/pricing"
              className="inline-flex items-center justify-center rounded-full border-2 border-white/40 hover:border-white text-white px-6 py-3.5 text-sm sm:text-base font-semibold transition-all duration-200"
            >
              View pricing
            </Link>
          </div>
        </div>
      </section>

    </div>
  );
}
