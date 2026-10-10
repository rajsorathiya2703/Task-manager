import type { Metadata } from "next";
import { ExternalLink, ShieldCheck, Zap, Users } from "lucide-react";
import { siteConfig } from "@/src/content/site";

export const metadata: Metadata = {
  title: "About",
};

export default function AboutPage() {
  const currentYear = new Date().getFullYear();
  const yearsInIndustry = Math.max(1, currentYear - siteConfig.stats.foundedYear);

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-16 space-y-16 sm:space-y-24">
      {/* 1. Header Section */}
      <div className="max-w-3xl space-y-4">
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-foreground">
          About {siteConfig.brand.name}
        </h1>
        <p className="text-lg text-muted-foreground leading-relaxed">
          {siteConfig.brand.description} We are dedicated to providing teams with high-clarity operational workflows that eliminate tool fragmentation and empower focused execution.
        </p>
      </div>

      {/* 2. Stat Cards */}
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
            Years in Industry (Since {siteConfig.stats.foundedYear})
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

      {/* 3. Team Grid */}
      <div className="space-y-8">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Our Team
          </h2>
          <p className="mt-2 text-muted-foreground">
            The people behind the platform dedicated to building effortless workflow tools.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {siteConfig.team.map((member) => (
            <div
              key={member.name}
              className="bg-card border border-border/60 rounded-2xl p-6 sm:p-7 shadow-xs hover:border-border transition-colors flex flex-col justify-between space-y-6"
            >
              <div className="space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-muted border border-border/60 flex items-center justify-center font-bold text-foreground text-lg shadow-2xs">
                  {getInitials(member.name)}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground">
                    {member.name}
                  </h3>
                  <p className="text-sm font-medium text-muted-foreground">
                    {member.role}
                  </p>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {member.bio}
                </p>
              </div>

              {member.linkedin && (
                <div className="pt-2 border-t border-border/40">
                  <a
                    href={member.linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
                  >
                    <span>LinkedIn</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 4. Values Row */}
      <div className="space-y-8">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Our Core Values
          </h2>
          <p className="mt-2 text-muted-foreground">
            Principles that guide every feature we design and system we build.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
          <div className="bg-card border border-border/60 rounded-2xl p-6 sm:p-7 space-y-3 shadow-xs">
            <div className="w-10 h-10 rounded-xl bg-muted border border-border/60 flex items-center justify-center text-foreground shadow-2xs">
              <Zap className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-foreground">Simple</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              We strip away bureaucratic noise and convoluted menus so your team can focus on shipping meaningful work.
            </p>
          </div>

          <div className="bg-card border border-border/60 rounded-2xl p-6 sm:p-7 space-y-3 shadow-xs">
            <div className="w-10 h-10 rounded-xl bg-muted border border-border/60 flex items-center justify-center text-foreground shadow-2xs">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-foreground">Reliable</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Built with enterprise-grade stability, predictable performance, and strict privacy controls for critical business operations.
            </p>
          </div>

          <div className="bg-card border border-border/60 rounded-2xl p-6 sm:p-7 space-y-3 shadow-xs">
            <div className="w-10 h-10 rounded-xl bg-muted border border-border/60 flex items-center justify-center text-foreground shadow-2xs">
              <Users className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-foreground">Built with customers</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Every workflow and feature is shaped by continuous real-world feedback from modern product teams and organizations.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
