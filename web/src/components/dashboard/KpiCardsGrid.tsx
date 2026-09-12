"use client";

import { CheckCircle2, Clock, AlertTriangle } from "lucide-react";

interface KpiCardsGridProps {
  kpis?: {
    tasksCompleted?: { count: number };
    openTasks?: { total: number; overdue: number };
  };
}

export function KpiCardsGrid({ kpis }: KpiCardsGridProps) {
  const tasksComp = kpis?.tasksCompleted || { count: 0 };
  const openTasks = kpis?.openTasks || { total: 0, overdue: 0 };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {/* 1. Tasks Completed (current user, in selected range) */}
      <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-card to-card/70 p-5 shadow-sm hover:shadow-md transition-all">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Tasks Completed
          </span>
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-3">
          <div className="text-3xl font-extrabold tracking-tight text-foreground">
            {tasksComp.count}
          </div>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Completed by you within the selected range
        </p>
      </div>

      {/* 2. Open Tasks (assigned to current user, status != Done) */}
      <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-card to-card/70 p-5 shadow-sm hover:shadow-md transition-all">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Open Tasks
          </span>
          <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
            <Clock className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-3 flex items-baseline justify-between">
          <div className="text-3xl font-extrabold tracking-tight text-foreground">
            {openTasks.total}
          </div>
          {openTasks.overdue > 0 ? (
            <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-red-500/10 text-red-500 border border-red-500/20 animate-pulse">
              <AlertTriangle className="w-3 h-3" />
              {openTasks.overdue} Overdue
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500">
              0 Overdue
            </span>
          )}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Assigned to you · {openTasks.total - openTasks.overdue} on track
        </p>
      </div>
    </div>
  );
}
