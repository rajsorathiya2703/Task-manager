"use client";

import React from "react";
import { MonthCalendar } from "./MonthCalendar";

interface YearCalendarProps {
  year: number;
  leaves: any[];
  leaveTypes: any[];
  onDateClick: (dateStr: string) => void;
  onMonthSelect?: (monthIndex: number) => void;
}

export function YearCalendar({
  year,
  leaves,
  leaveTypes,
  onDateClick,
  onMonthSelect,
}: YearCalendarProps) {
  const months = Array.from({ length: 12 }, (_, i) => i);

  return (
    <div className="space-y-4">
      {/* Legend & Types */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-muted/20 border border-border/60 rounded-xl text-xs text-muted-foreground">
        <div className="flex flex-wrap items-center gap-4">
          <span className="font-semibold text-foreground">Status:</span>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span>Approved</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            <span>Pending</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-md bg-primary" />
            <span>Today</span>
          </div>
        </div>

        {leaveTypes.length > 0 && (
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-semibold text-foreground">Types:</span>
            {leaveTypes.map((lt) => (
              <div key={lt._id} className="flex items-center gap-1.5">
                <span
                  className="w-2 h-2 rounded-full inline-block"
                  style={{ backgroundColor: lt.color || "#3b82f6" }}
                />
                <span>{lt.name}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 12-Month Grid (4 columns on wide screens, 3 on desktop, 2 on tablet, 1 on mobile) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
        {months.map((m) => (
          <MonthCalendar
            key={m}
            year={year}
            monthIndex={m}
            leaves={leaves}
            onDateClick={onDateClick}
            onMonthSelect={onMonthSelect}
          />
        ))}
      </div>
    </div>
  );
}
