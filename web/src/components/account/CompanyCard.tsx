"use client";

import { ArrowRight } from "lucide-react";
import { Company, trialDaysLeft } from "../../lib/company-api";

interface CompanyCardProps {
  company: Company;
  onOpen: (company: Company) => void;
}

const AVATAR_COLORS = [
  "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20",
  "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
  "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20",
];

function getHashColor(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % AVATAR_COLORS.length;
  return AVATAR_COLORS[index];
}

const ROLE_STYLES: Record<string, string> = {
  owner: "bg-primary/10 text-primary border-primary/20",
  admin: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  member: "bg-muted text-muted-foreground border-border/60",
};

export function CompanyCard({ company, onOpen }: CompanyCardProps) {
  const initial = company.name ? company.name.charAt(0).toUpperCase() : "C";
  const avatarColorClass = getHashColor(company.name || "company");
  const daysRemaining = trialDaysLeft(company.trialEndsAt);
  const roleStyle = ROLE_STYLES[company.role] || ROLE_STYLES.member;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpen(company)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen(company);
        }
      }}
      className="w-full text-left bg-card hover:bg-muted/20 border border-border/70 hover:border-border rounded-2xl p-6 shadow-xs hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between space-y-6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3.5 min-w-0">
            <div
              className={`w-12 h-12 rounded-xl border flex items-center justify-center font-bold text-lg shrink-0 shadow-2xs ${avatarColorClass}`}
            >
              {initial}
            </div>
            <div className="min-w-0">
              <h3 className="text-lg font-bold text-foreground truncate tracking-tight">
                {company.name}
              </h3>
              <p className="text-xs text-muted-foreground truncate">
                {company.industry}
              </p>
            </div>
          </div>
          <span
            className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border uppercase tracking-wider shrink-0 ${roleStyle}`}
          >
            {company.role}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="text-xs px-2.5 py-0.5 rounded-full font-medium bg-muted text-muted-foreground border border-border/60">
            {company.employeeCount} employees
          </span>
          {company.plan === "trial" && (
            <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
              Trial · {daysRemaining} {daysRemaining === 1 ? "day" : "days"} left
            </span>
          )}
        </div>
      </div>

      <div className="pt-3 border-t border-border/40 flex items-center justify-between text-sm font-semibold text-primary group-hover:underline">
        <span>Open workspace</span>
        <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
      </div>
    </div>
  );
}
