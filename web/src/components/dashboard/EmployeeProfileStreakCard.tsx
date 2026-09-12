"use client";

import { useState } from "react";
import {
  User,
  Flame,
  Clock,
  Calendar,
  Building2,
  Briefcase,
  Mail,
  Sparkles,
} from "lucide-react";
import { format, parseISO } from "date-fns";

interface EmployeeProfileStreakCardProps {
  selectedEmployee?: {
    _id: string;
    name: string;
    email?: string;
    role?: string;
    department?: string;
    status?: string;
    joiningDate?: string | Date;
  } | null;
  yearlyActivity?: {
    days: Array<{
      date: string;
      hours: number;
      count: number;
      level: 0 | 1 | 2 | 3 | 4;
    }>;
    currentStreak: number;
    longestStreak: number;
    totalYearHours: number;
    activeDays: number;
  };
}

export function EmployeeProfileStreakCard({
  selectedEmployee,
  yearlyActivity,
}: EmployeeProfileStreakCardProps) {
  const [hoveredDay, setHoveredDay] = useState<{
    date: string;
    hours: number;
    count: number;
    x: number;
    y: number;
  } | null>(null);

  const days = yearlyActivity?.days || [];
  const currentStreak = yearlyActivity?.currentStreak || 0;
  const longestStreak = yearlyActivity?.longestStreak || 0;
  const totalYearHours = yearlyActivity?.totalYearHours || 0;
  const activeDays = yearlyActivity?.activeDays || 0;

  // Organize days into 52/53 columns (weeks) of 7 rows (Mon-Sun)
  const weeks: Array<Array<{ date: string; hours: number; count: number; level: 0 | 1 | 2 | 3 | 4 }>> = [];
  let currentWeek: Array<any> = [];

  for (let i = 0; i < days.length; i++) {
    currentWeek.push(days[i]);
    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  }
  if (currentWeek.length > 0) {
    weeks.push(currentWeek);
  }

  const getCellColor = (level: number) => {
    switch (level) {
      case 1:
        return "bg-emerald-500/35 hover:bg-emerald-500/50 border-emerald-500/20";
      case 2:
        return "bg-emerald-500/60 hover:bg-emerald-500/75 border-emerald-500/40";
      case 3:
        return "bg-emerald-500/85 hover:bg-emerald-400 border-emerald-500/60";
      case 4:
        return "bg-emerald-400 hover:bg-emerald-300 border-emerald-300 shadow-sm shadow-emerald-500/30";
      default:
        return "bg-muted/40 hover:bg-muted/70 border-border/30";
    }
  };

  const formatJoiningDate = (d?: string | Date) => {
    if (!d) return "N/A";
    try {
      const parsed = typeof d === "string" ? parseISO(d) : d;
      return format(parsed, "MMM yyyy");
    } catch {
      return "N/A";
    }
  };

  const formatTooltipDate = (dStr: string) => {
    try {
      const parsed = parseISO(dStr);
      return format(parsed, "EEEE, MMMM d, yyyy");
    } catch {
      return dStr;
    }
  };

  return (
    <div className="rounded-3xl border border-border/70 bg-gradient-to-br from-card via-card to-muted/20 p-6 shadow-sm">
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-center">
        {/* LEFT COLUMN: Employee Profile Section (5 cols) */}
        <div className="xl:col-span-4 flex flex-col justify-between border-b xl:border-b-0 xl:border-r border-border/60 pb-6 xl:pb-0 xl:pr-6 space-y-5">
          {/* Header */}
          <div className="flex items-center gap-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              Employee Profile
            </span>
          </div>

          {/* Profile Card Main Info */}
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-primary/30 via-primary/10 to-indigo-500/20 border-2 border-primary/30 flex items-center justify-center text-primary text-xl font-black shadow-inner">
                {selectedEmployee?.name
                  ? selectedEmployee.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase()
                  : "EM"}
              </div>
              <span
                className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-card ${
                  selectedEmployee?.status === "Active"
                    ? "bg-emerald-500"
                    : selectedEmployee?.status === "On Leave"
                    ? "bg-amber-500"
                    : "bg-slate-400"
                }`}
                title={`Status: ${selectedEmployee?.status || "Active"}`}
              />
            </div>

            <div className="min-w-0 flex-1">
              <h3 className="text-lg font-black text-foreground truncate">
                {selectedEmployee?.name || "Select an Employee"}
              </h3>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                {selectedEmployee?.role && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20">
                    <Briefcase className="w-3 h-3" />
                    {selectedEmployee.role}
                  </span>
                )}
                {selectedEmployee?.department && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md bg-muted text-muted-foreground border border-border">
                    <Building2 className="w-3 h-3" />
                    {selectedEmployee.department}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Contact and Metadata */}
          <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground bg-muted/30 p-3 rounded-xl border border-border/40">
            <div className="flex items-center gap-1.5 truncate">
              <Mail className="w-3.5 h-3.5 text-muted-foreground/70 shrink-0" />
              <span className="truncate">{selectedEmployee?.email || "No email"}</span>
            </div>
            <div className="flex items-center gap-1.5 truncate justify-end">
              <Calendar className="w-3.5 h-3.5 text-muted-foreground/70 shrink-0" />
              <span>Joined {formatJoiningDate(selectedEmployee?.joiningDate)}</span>
            </div>
          </div>
        </div>


        {/* RIGHT COLUMN: GitHub-Style Yearly Activity Heatmap (7 cols) */}
        <div className="xl:col-span-8 flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Flame className="w-4 h-4 text-emerald-500" />
                Yearly Work Strike & Heatmap
              </h4>
              <p className="text-xs text-muted-foreground mt-0.5">
                Daily activity & logged hours over the past 52 weeks (365 days)
              </p>
            </div>

            <div className="text-right">
              <span className="text-xs font-semibold text-foreground bg-muted px-2.5 py-1 rounded-lg border border-border">
                Best Streak: <span className="text-emerald-500 font-bold">{longestStreak} days</span>
              </span>
            </div>
          </div>

          {/* The 52-Week Grid */}
          <div className="relative overflow-x-auto custom-scrollbar pb-2">
            <div className="inline-block min-w-full">
              <div className="flex gap-1.5">
                {/* Day Labels */}
                <div className="flex flex-col gap-1 text-[9px] font-bold text-muted-foreground/70 pr-1 select-none justify-between pt-0.5">
                  <span className="h-3 leading-3">Mon</span>
                  <span className="h-3 leading-3 opacity-0">Tue</span>
                  <span className="h-3 leading-3">Wed</span>
                  <span className="h-3 leading-3 opacity-0">Thu</span>
                  <span className="h-3 leading-3">Fri</span>
                  <span className="h-3 leading-3 opacity-0">Sat</span>
                  <span className="h-3 leading-3">Sun</span>
                </div>

                {/* Week Columns */}
                {weeks.map((week, wIdx) => (
                  <div key={wIdx} className="flex flex-col gap-1">
                    {week.map((day, dIdx) => (
                      <button
                        key={dIdx}
                        type="button"
                        className={`w-3 h-3 rounded-[3px] border transition-all cursor-pointer ${getCellColor(
                          day.level
                        )}`}
                        onMouseEnter={(e) => {
                          const rect = e.currentTarget.getBoundingClientRect();
                          setHoveredDay({
                            date: day.date,
                            hours: day.hours,
                            count: day.count,
                            x: rect.left + rect.width / 2,
                            y: rect.top - 8,
                          });
                        }}
                        onMouseLeave={() => setHoveredDay(null)}
                      />
                    ))}
                  </div>
                ))}
              </div>
            </div>

            {/* Hover Tooltip Popup */}
            {hoveredDay && (
              <div
                className="fixed z-50 pointer-events-none -translate-x-1/2 -translate-y-full bg-popover/95 backdrop-blur-md border border-border px-3 py-1.5 rounded-xl shadow-xl text-xs whitespace-nowrap animate-in fade-in zoom-in-95 duration-150"
                style={{ left: hoveredDay.x, top: hoveredDay.y }}
              >
                <div className="font-bold text-foreground">
                  {hoveredDay.hours > 0 ? (
                    <span className="text-emerald-500">{hoveredDay.hours} hours logged</span>
                  ) : (
                    <span className="text-muted-foreground">No hours logged</span>
                  )}
                </div>
                <div className="text-[10px] text-muted-foreground mt-0.5">
                  {formatTooltipDate(hoveredDay.date)}
                </div>
              </div>
            )}
          </div>

          {/* Legend & Summary Footer */}
          <div className="flex items-center justify-between pt-2 border-t border-border/40 text-xs text-muted-foreground">
            <span>
              <strong className="text-foreground">{totalYearHours} hrs</strong> total recorded in 365 days
            </span>

            {/* Scale Legend */}
            <div className="flex items-center gap-1.5">
              <span className="text-[10px]">Less</span>
              <span className="w-2.5 h-2.5 rounded-[2px] bg-muted/40 border border-border/30" />
              <span className="w-2.5 h-2.5 rounded-[2px] bg-emerald-500/35 border border-emerald-500/20" />
              <span className="w-2.5 h-2.5 rounded-[2px] bg-emerald-500/60 border border-emerald-500/40" />
              <span className="w-2.5 h-2.5 rounded-[2px] bg-emerald-500/85 border border-emerald-500/60" />
              <span className="w-2.5 h-2.5 rounded-[2px] bg-emerald-400 border border-emerald-300" />
              <span className="text-[10px]">More</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
