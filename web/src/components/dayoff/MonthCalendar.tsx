"use client";

import React from "react";

interface MonthCalendarProps {
  year: number;
  monthIndex: number; // 0 for Jan, 11 for Dec
  leaves: any[];
  onDateClick: (dateStr: string) => void;
  onMonthSelect?: (monthIndex: number) => void;
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];

export function MonthCalendar({
  year,
  monthIndex,
  leaves,
  onDateClick,
  onMonthSelect,
}: MonthCalendarProps) {
  const firstDay = new Date(year, monthIndex, 1).getDay();
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();

  const formatDateStr = (day: number) => {
    const m = String(monthIndex + 1).padStart(2, "0");
    const d = String(day).padStart(2, "0");
    return `${year}-${m}-${d}`;
  };

  const todayStr = new Date().toISOString().split("T")[0];

  const getLeavesForDay = (day: number) => {
    const targetDate = new Date(year, monthIndex, day);
    targetDate.setHours(0, 0, 0, 0);

    return leaves.filter((l) => {
      const from = new Date(l.fromDate);
      from.setHours(0, 0, 0, 0);
      const to = new Date(l.toDate);
      to.setHours(23, 59, 59, 999);
      return targetDate >= from && targetDate <= to;
    });
  };

  const blanks = Array.from({ length: firstDay }, (_, i) => i);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  return (
    <div className="bg-card border border-border/70 hover:border-border rounded-xl p-3.5 shadow-xs transition-all flex flex-col group">
      {/* Month Header with Jump Action */}
      <div className="flex items-center justify-between mb-2.5 pb-2 border-b border-border/40">
        <button
          type="button"
          onClick={() => onMonthSelect?.(monthIndex)}
          className="font-bold text-xs text-foreground hover:text-primary transition-colors text-left flex items-center gap-1.5"
          title={`View ${MONTH_NAMES[monthIndex]} in full view`}
        >
          <span>{MONTH_NAMES[monthIndex]}</span>
        </button>
        <span className="text-[10px] text-muted-foreground font-mono">
          {daysInMonth}d
        </span>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-1 text-center mb-1">
        {WEEKDAYS.map((wd, i) => (
          <span
            key={i}
            className={`text-[10px] font-semibold ${
              i === 0 || i === 6 ? "text-muted-foreground/50" : "text-muted-foreground/80"
            }`}
          >
            {wd}
          </span>
        ))}
      </div>

      {/* Day cells grid */}
      <div className="grid grid-cols-7 gap-1 text-center flex-1">
        {blanks.map((b) => (
          <div key={`blank-${b}`} className="h-6" />
        ))}

        {days.map((day) => {
          const dateStr = formatDateStr(day);
          const isToday = dateStr === todayStr;
          const dayLeaves = getLeavesForDay(day);
          const hasLeave = dayLeaves.length > 0;
          const isApproved = hasLeave && dayLeaves.some((l) => l.status === "approved");

          const primaryColor = dayLeaves[0]?.leaveTypeId?.color || (isApproved ? "#10b981" : "#f59e0b");

          return (
            <button
              key={day}
              type="button"
              onClick={() => onDateClick(dateStr)}
              title={
                hasLeave
                  ? `${dateStr}: ${dayLeaves.map((l) => `${l.leaveTypeId?.name || 'Leave'} (${l.status})`).join(', ')}`
                  : `Apply leave on ${dateStr}`
              }
              className={`
                group/cell relative h-6 w-full flex flex-col items-center justify-center rounded text-[11px] font-medium transition-all
                hover:scale-110 hover:z-10 focus:outline-none
                ${
                  hasLeave
                    ? isApproved
                      ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-bold"
                      : "bg-amber-500/20 text-amber-700 dark:text-amber-300 font-bold"
                    : isToday
                    ? "bg-primary text-primary-foreground font-bold shadow-xs"
                    : "text-foreground/80 hover:bg-muted"
                }
              `}
            >
              <span>{day}</span>

              {hasLeave && (
                <span
                  className="absolute -bottom-0.5 w-1 h-1 rounded-full ring-1 ring-background"
                  style={{ backgroundColor: primaryColor }}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
