"use client";

import { Award, CheckCircle2, Clock, Trophy } from "lucide-react";

interface TopPerformersListProps {
  data?: Array<{
    employeeId: string;
    name: string;
    avatarUrl: string;
    tasksCompleted: number;
    hoursLogged: number;
  }>;
}

export function TopPerformersList({ data = [] }: TopPerformersListProps) {
  const getRankBadge = (idx: number) => {
    if (idx === 0) {
      return (
        <span className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-500 border border-amber-500/40 flex items-center justify-center text-xs font-black shrink-0">
          🥇
        </span>
      );
    }
    if (idx === 1) {
      return (
        <span className="w-6 h-6 rounded-full bg-slate-400/20 text-slate-300 border border-slate-400/40 flex items-center justify-center text-xs font-black shrink-0">
          🥈
        </span>
      );
    }
    if (idx === 2) {
      return (
        <span className="w-6 h-6 rounded-full bg-amber-700/20 text-amber-600 border border-amber-700/40 flex items-center justify-center text-xs font-black shrink-0">
          🥉
        </span>
      );
    }
    return (
      <span className="w-6 h-6 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-[11px] font-bold shrink-0">
        #{idx + 1}
      </span>
    );
  };

  return (
    <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-500" />
            Top Performers
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Leaderboard by tasks completed & hours logged
          </p>
        </div>
      </div>

      {data.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center py-10 text-center text-muted-foreground">
          <Award className="w-8 h-8 mb-2 opacity-40" />
          <p className="text-xs">No performer records logged in this period.</p>
        </div>
      ) : (
        <div className="divide-y divide-border/40">
          {data.map((performer, idx) => {
            const initials = performer.name
              ? performer.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase()
              : "EM";

            return (
              <div
                key={performer.employeeId || idx}
                className="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-3 hover:bg-muted/20 px-2 rounded-lg transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  {getRankBadge(idx)}
                  <div className="w-8 h-8 rounded-full bg-primary/10 text-primary border border-primary/20 flex items-center justify-center text-xs font-bold shrink-0 overflow-hidden">
                    {performer.avatarUrl ? (
                      <img
                        src={performer.avatarUrl}
                        alt={performer.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      initials
                    )}
                  </div>
                  <span className="text-xs font-semibold text-foreground truncate">
                    {performer.name}
                  </span>
                </div>

                <div className="flex items-center gap-4 shrink-0 text-xs">
                  <div className="flex items-center gap-1.5 text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md font-semibold">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{performer.tasksCompleted} done</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-blue-500 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded-md font-semibold">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{performer.hoursLogged}h</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
