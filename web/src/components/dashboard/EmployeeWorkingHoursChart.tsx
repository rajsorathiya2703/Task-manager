"use client";

import { useState } from "react";
import { Clock, TrendingUp, BarChart3, Target, Calendar } from "lucide-react";

interface EmployeeWorkingHoursChartProps {
  data?: Array<{
    date: string;
    dayName: string;
    hours: number;
    tasksCount: number;
  }>;
  employeeName?: string;
  range?: "weekly" | "monthly";
}

export function EmployeeWorkingHoursChart({
  data = [],
  employeeName = "Employee",
  range = "weekly",
}: EmployeeWorkingHoursChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const totalHours = Math.round(data.reduce((sum, d) => sum + d.hours, 0) * 10) / 10;
  const activeDays = data.filter((d) => d.hours > 0).length;
  const avgHours = activeDays > 0 ? Math.round((totalHours / activeDays) * 10) / 10 : 0;
  const maxHours = Math.max(...data.map((d) => d.hours), 8);

  const peakDay = data.reduce((peak, d) => (d.hours > (peak?.hours || 0) ? d : peak), data[0]);

  return (
    <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm flex flex-col">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-blue-500" />
            Daily Working Hours & Logged Time
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Logged hours breakdown for <strong className="text-foreground">{employeeName}</strong>
          </p>
        </div>

        {/* Quick Stats Badges */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-500 border border-blue-500/20">
            <Clock className="w-3.5 h-3.5" />
            <span>{totalHours}h Total</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
            <Target className="w-3.5 h-3.5" />
            <span>{avgHours}h/day avg</span>
          </div>
        </div>
      </div>

      {data.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
          <Calendar className="w-8 h-8 mb-2 opacity-40" />
          <p className="text-xs">No logged hours recorded for this period.</p>
        </div>
      ) : (
        <div className="flex flex-col justify-end space-y-3">
          {/* Bars Container */}
          <div className="relative h-48 flex items-end justify-between gap-1 sm:gap-2 pt-6 px-2">
            {/* Target 8-hour line indicator */}
            <div
              className="absolute left-0 right-0 border-b border-dashed border-primary/30 flex items-center justify-end pr-2 pointer-events-none z-10"
              style={{ bottom: `${(8 / (maxHours * 1.1)) * 100}%` }}
            >
              <span className="text-[10px] font-bold text-primary/70 bg-card px-1 rounded -translate-y-1/2">
                8h Target
              </span>
            </div>

            {data.map((item, idx) => {
              const heightPct = Math.max((item.hours / (maxHours * 1.1)) * 100, 3);
              const isHovered = hoveredIndex === idx;
              const isOvertime = item.hours >= 8;

              return (
                <div
                  key={item.date || idx}
                  className="flex-1 flex flex-col items-center justify-end h-full group relative cursor-pointer"
                  onMouseEnter={() => setHoveredIndex(idx)}
                  onMouseLeave={() => setHoveredIndex(null)}
                >
                  {/* Floating tooltip */}
                  {isHovered && (
                    <div className="absolute -top-10 z-30 bg-popover/95 backdrop-blur-md border border-border px-2.5 py-1 rounded-lg shadow-xl text-xs whitespace-nowrap animate-in fade-in zoom-in-95">
                      <span className="font-bold text-foreground">{item.hours}h</span>{" "}
                      <span className="text-muted-foreground">({item.dayName}, {item.date})</span>
                    </div>
                  )}

                  {/* Value on top of bar if hours > 0 */}
                  {item.hours > 0 && (
                    <span
                      className={`text-[10px] font-bold mb-1 transition-all ${
                        isHovered ? "text-primary scale-110" : "text-muted-foreground"
                      }`}
                    >
                      {item.hours}
                    </span>
                  )}

                  {/* The Bar */}
                  <div
                    className={`w-full max-w-[32px] rounded-t-lg transition-all duration-300 ${
                      item.hours === 0
                        ? "bg-muted/30 border border-border/20"
                        : isOvertime
                        ? "bg-gradient-to-t from-emerald-600 to-teal-400 group-hover:from-emerald-500 group-hover:to-teal-300 shadow-sm shadow-emerald-500/20"
                        : "bg-gradient-to-t from-blue-600 to-cyan-400 group-hover:from-blue-500 group-hover:to-cyan-300 shadow-sm shadow-blue-500/20"
                    }`}
                    style={{ height: `${heightPct}%` }}
                  />

                  {/* Day Label */}
                  <div className="mt-2 text-center">
                    <span className="block text-[10px] font-bold text-foreground">
                      {item.dayName}
                    </span>
                    {range === "monthly" && (
                      <span className="block text-[9px] text-muted-foreground">
                        {item.date.slice(-2)}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer Summary */}
          <div className="flex items-center justify-between pt-3 border-t border-border/40 text-xs text-muted-foreground px-2">
            <span>
              Peak Day:{" "}
              <strong className="text-foreground">
                {peakDay?.dayName} ({peakDay?.hours}h)
              </strong>
            </span>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-gradient-to-t from-blue-600 to-cyan-400" />
                Regular (&lt;8h)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-gradient-to-t from-emerald-600 to-teal-400" />
                Full/Overtime (≥8h)
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
