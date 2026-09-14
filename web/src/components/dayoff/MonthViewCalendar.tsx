"use client";

import React from "react";
import { ChevronLeft, ChevronRight, Plus, Calendar, CheckCircle2, Clock } from "lucide-react";

interface MonthViewCalendarProps {
  currentDate: Date;
  onDateChange: (date: Date) => void;
  leaves: any[];
  onDateClick: (dateStr: string) => void;
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function MonthViewCalendar({
  currentDate,
  onDateChange,
  leaves,
  onDateClick,
}: MonthViewCalendarProps) {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayOfWeek = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const todayStr = new Date().toISOString().split("T")[0];

  const handlePrevMonth = () => {
    onDateChange(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    onDateChange(new Date(year, month + 1, 1));
  };

  const handleToday = () => {
    onDateChange(new Date());
  };

  // Helper to format date string YYYY-MM-DD
  const formatDateStr = (y: number, m: number, d: number) => {
    const monthStr = String(m + 1).padStart(2, "0");
    const dayStr = String(d).padStart(2, "0");
    return `${y}-${monthStr}-${dayStr}`;
  };

  // Helper to get leaves for a specific day
  const getLeavesForDate = (y: number, m: number, d: number) => {
    const target = new Date(y, m, d);
    target.setHours(0, 0, 0, 0);

    return leaves.filter((l) => {
      const from = new Date(l.fromDate);
      from.setHours(0, 0, 0, 0);
      const to = new Date(l.toDate);
      to.setHours(23, 59, 59, 999);
      return target >= from && target <= to;
    });
  };

  // Generate 42 calendar grid cells (6 rows x 7 cols)
  const calendarCells: Array<{
    day: number;
    monthOffset: number; // -1 = prev month, 0 = current month, 1 = next month
    dateStr: string;
    isCurrentMonth: boolean;
  }> = [];

  // Prev month padding days
  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    const d = daysInPrevMonth - i;
    const prevDate = new Date(year, month - 1, d);
    calendarCells.push({
      day: d,
      monthOffset: -1,
      dateStr: formatDateStr(prevDate.getFullYear(), prevDate.getMonth(), d),
      isCurrentMonth: false,
    });
  }

  // Current month days
  for (let d = 1; d <= daysInMonth; d++) {
    calendarCells.push({
      day: d,
      monthOffset: 0,
      dateStr: formatDateStr(year, month, d),
      isCurrentMonth: true,
    });
  }

  // Next month padding days to complete 35 or 42 grid cells
  const remainingCells = (calendarCells.length > 35 ? 42 : 35) - calendarCells.length;
  for (let d = 1; d <= remainingCells; d++) {
    const nextDate = new Date(year, month + 1, d);
    calendarCells.push({
      day: d,
      monthOffset: 1,
      dateStr: formatDateStr(nextDate.getFullYear(), nextDate.getMonth(), d),
      isCurrentMonth: false,
    });
  }

  return (
    <div className="bg-card border border-border/80 rounded-2xl shadow-xs overflow-hidden flex flex-col">
      {/* Month Navigation Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-6 py-4 border-b border-border bg-muted/20">
        <div className="flex items-center gap-3">
          <h2 className="text-base font-bold text-foreground tracking-tight">
            {MONTH_NAMES[month]} <span className="text-primary font-mono">{year}</span>
          </h2>
          <div className="flex items-center bg-card border border-border rounded-xl p-0.5 shadow-xs">
            <button
              onClick={handlePrevMonth}
              className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
              title="Previous Month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleToday}
              className="px-2.5 py-1 text-xs font-semibold text-foreground hover:bg-muted rounded-lg transition-colors"
            >
              Today
            </button>
            <button
              onClick={handleNextMonth}
              className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
              title="Next Month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Quick Legend */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-emerald-500/20" />
            <span>Approved</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 ring-2 ring-amber-500/20" />
            <span>Pending</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-md bg-primary text-white" />
            <span>Today</span>
          </div>
        </div>
      </div>

      {/* Weekday Column Headers */}
      <div className="grid grid-cols-7 border-b border-border bg-muted/40 text-center">
        {WEEKDAYS.map((wd, i) => (
          <div
            key={wd}
            className={`py-2.5 text-xs font-semibold uppercase tracking-wider ${
              i === 0 || i === 6 ? "text-muted-foreground/70" : "text-muted-foreground"
            }`}
          >
            <span className="hidden sm:inline">{wd}</span>
            <span className="sm:hidden">{wd.slice(0, 3)}</span>
          </div>
        ))}
      </div>

      {/* Calendar 7-Column Grid */}
      <div className="grid grid-cols-7 divide-x divide-y divide-border/60 bg-background/50 flex-1">
        {calendarCells.map((cell, idx) => {
          const isToday = cell.dateStr === todayStr;
          const [cellYear, cellMonth, cellDay] = cell.dateStr.split("-").map(Number);
          const cellLeaves = getLeavesForDate(cellYear, cellMonth - 1, cellDay);

          return (
            <div
              key={idx}
              onClick={() => onDateClick(cell.dateStr)}
              className={`
                group relative min-h-[95px] sm:min-h-[110px] p-2 flex flex-col justify-between transition-colors cursor-pointer
                ${
                  !cell.isCurrentMonth
                    ? "bg-muted/15 text-muted-foreground/50 opacity-60"
                    : isToday
                    ? "bg-primary/[0.03]"
                    : "hover:bg-muted/30"
                }
              `}
            >
              {/* Top Row: Date Number & Hover Add Button */}
              <div className="flex items-center justify-between">
                <span
                  className={`
                    text-xs font-semibold rounded-lg w-6 h-6 flex items-center justify-center transition-all
                    ${
                      isToday
                        ? "bg-primary text-primary-foreground font-bold shadow-xs scale-105"
                        : cell.isCurrentMonth
                        ? "text-foreground group-hover:text-primary"
                        : "text-muted-foreground/50"
                    }
                  `}
                >
                  {cell.day}
                </span>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDateClick(cell.dateStr);
                  }}
                  className="opacity-0 group-hover:opacity-100 p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
                  title={`Apply leave on ${cell.dateStr}`}
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Leave Badges / Pills */}
              <div className="space-y-1 my-1 overflow-hidden">
                {cellLeaves.slice(0, 2).map((l) => {
                  const lt = l.leaveTypeId;
                  const isApproved = l.status === "approved";
                  const isPending = l.status === "pending";
                  const primaryColor = lt?.color || (isApproved ? "#10b981" : "#f59e0b");

                  return (
                    <div
                      key={l._id}
                      className={`
                        flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-semibold truncate transition-all
                        ${
                          isApproved
                            ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20"
                            : isPending
                            ? "bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20"
                            : "bg-muted text-muted-foreground border border-border"
                        }
                      `}
                      title={`${lt?.name || 'Leave'}: ${l.reason} (${l.status})`}
                    >
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: primaryColor }}
                      />
                      <span className="truncate flex-1">
                        {lt?.name || "Leave"}
                      </span>
                      {isApproved && <CheckCircle2 className="w-3 h-3 shrink-0 text-emerald-600" />}
                      {isPending && <Clock className="w-3 h-3 shrink-0 text-amber-600" />}
                    </div>
                  );
                })}

                {cellLeaves.length > 2 && (
                  <span className="text-[10px] text-muted-foreground font-semibold px-1">
                    +{cellLeaves.length - 2} more
                  </span>
                )}
              </div>

              {/* Bottom spacer for clean layout */}
              <div className="h-1" />
            </div>
          );
        })}
      </div>
    </div>
  );
}
