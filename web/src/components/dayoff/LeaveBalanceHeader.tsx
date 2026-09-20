"use client";

import { CalendarCheck, HeartPulse, Clock, ShieldAlert } from "lucide-react";

interface LeaveBalanceHeaderProps {
  balances: any[];
  onApplyClick?: () => void;
}

export function LeaveBalanceHeader({
  balances,
  onApplyClick: _onApplyClick,
}: LeaveBalanceHeaderProps) {
  // Select icon based on leave type code/name
  const getLeaveIcon = (lt: any) => {
    const code = (lt?.code || "").toLowerCase();
    const name = (lt?.name || "").toLowerCase();
    if (code.includes("medic") || name.includes("medic")) return HeartPulse;
    if (code.includes("half") || name.includes("half")) return Clock;
    if (code.includes("unpaid") || name.includes("unpaid")) return ShieldAlert;
    return CalendarCheck;
  };

  if (!balances || balances.length === 0) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {balances.map((b) => {
        const lt = b.leaveType;
        const IconComponent = getLeaveIcon(lt);
        const total = (b.allocated || 0) + (b.carriedForward || 0);
        const used = b.used || 0;
        const remaining = b.remaining !== undefined ? b.remaining : Math.max(0, total - used);
        const percentUsed = total > 0 ? Math.min(100, Math.round((used / total) * 100)) : 0;
        const primaryColor = lt?.color || "#3b82f6";

        return (
          <div
            key={lt?._id || Math.random()}
            className="bg-card border border-border/70 hover:border-border rounded-2xl p-5 shadow-xs transition-all flex flex-col justify-between group"
          >
            <div>
              {/* Header with Icon and Refill Badge */}
              <div className="flex items-center justify-between mb-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105"
                  style={{
                    backgroundColor: `${primaryColor}18`,
                    color: primaryColor,
                  }}
                >
                  <IconComponent className="w-5 h-5" />
                </div>
                <div className="flex items-center gap-1.5">
                  {b.carriedForward > 0 && (
                    <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                      +{b.carriedForward} carried
                    </span>
                  )}
                  <span className="text-[10px] uppercase font-bold text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                    {lt?.refillCycle || "Yearly"}
                  </span>
                </div>
              </div>

              {/* Title */}
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                {lt?.name || "Leave"}
              </h3>

              {/* Main Metric */}
              <div className="flex items-baseline gap-1.5 mb-3">
                <span className="text-3xl font-extrabold text-foreground tracking-tight">
                  {remaining}
                </span>
                <span className="text-xs font-medium text-muted-foreground">days left</span>
              </div>
            </div>

            {/* Utilization Bar & Stats */}
            <div className="space-y-1.5 pt-2 border-t border-border/40">
              <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                <span>
                  Used: <strong className="text-foreground">{used}</strong> of {total}d
                </span>
                <span className="font-medium text-foreground">{percentUsed}%</span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${percentUsed}%`,
                    backgroundColor: primaryColor,
                  }}
                />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
