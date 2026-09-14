"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "../../../../src/components/layout/PageHeader";
import { MonthViewCalendar } from "../../../../src/components/dayoff/MonthViewCalendar";
import { YearCalendar } from "../../../../src/components/dayoff/YearCalendar";
import { ApplyLeaveDialog } from "../../../../src/components/dayoff/ApplyLeaveDialog";
import { isDayOffModuleEnabled } from "../../../../src/lib/dayoff-feature";
import {
  fetchMyLeaveApplications,
  fetchLeaveTypes,
  fetchMyLeaveBalances,
} from "../../../../src/lib/api";
import { Calendar, CalendarDays, Plus } from "lucide-react";

export default function DayOffCalendarPage() {
  const router = useRouter();
  const isEnabled = isDayOffModuleEnabled();

  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<"month" | "year">("month");
  const [leaves, setLeaves] = useState<any[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<any[]>([]);
  const [balances, setBalances] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Dialog state
  const [isApplyOpen, setIsApplyOpen] = useState<boolean>(false);
  const [selectedDateForApply, setSelectedDateForApply] = useState<string | null>(null);

  // Feature toggle redirect guard
  useEffect(() => {
    if (!isEnabled) {
      router.replace("/dashboard");
    }
  }, [isEnabled, router]);

  const year = currentDate.getFullYear();

  const loadData = useCallback(async () => {
    if (!isEnabled) return;
    try {
      setLoading(true);
      const [leavesData, typesData, balancesData] = await Promise.all([
        fetchMyLeaveApplications(year).catch(() => []),
        fetchLeaveTypes(true).catch(() => []),
        fetchMyLeaveBalances(year).catch(() => []),
      ]);

      setLeaves(leavesData || []);
      setLeaveTypes(typesData || []);
      setBalances(balancesData || []);
    } catch (err) {
      console.error("Failed loading calendar leaves:", err);
    } finally {
      setLoading(false);
    }
  }, [isEnabled, year]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleDateClick = (dateStr: string) => {
    setSelectedDateForApply(dateStr);
    setIsApplyOpen(true);
  };

  const handleMonthSelect = (mIndex: number) => {
    setCurrentDate(new Date(year, mIndex, 1));
    setViewMode("month");
  };

  if (!isEnabled) return null;

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-background">
      <PageHeader
        title="Leave Calendar"
        breadcrumbs={[
          { label: "Time Off" },
          { label: "Calendar" },
        ]}
        showAdd={true}
        addText="Request Time Off"
        onAddClick={() => {
          setSelectedDateForApply(null);
          setIsApplyOpen(true);
        }}
      />

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <div className="max-w-7xl mx-auto space-y-5">
          {/* Top Quick Balances & View Switcher Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card p-4 rounded-2xl border border-border/60 shadow-xs">
            {/* Balance Pills directly in front of the user */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider mr-1">
                Your Balances:
              </span>
              {balances.length === 0 ? (
                <span className="text-xs text-muted-foreground">Loading balances...</span>
              ) : (
                balances.map((b) => {
                  const lt = b.leaveType;
                  const color = lt?.color || "#3b82f6";
                  return (
                    <div
                      key={lt?._id || Math.random()}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-muted/60 border border-border/60 text-xs font-semibold"
                    >
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: color }}
                      />
                      <span className="text-foreground">{lt?.name || "Leave"}:</span>
                      <span className="text-primary font-bold">{b.remaining}d left</span>
                    </div>
                  );
                })
              )}
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center bg-muted p-1 rounded-xl border border-border/50 text-xs font-semibold self-end sm:self-auto shrink-0">
              <button
                onClick={() => setViewMode("month")}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition-all ${
                  viewMode === "month"
                    ? "bg-card text-foreground shadow-xs font-bold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                Month View
              </button>

              <button
                onClick={() => setViewMode("year")}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition-all ${
                  viewMode === "year"
                    ? "bg-card text-foreground shadow-xs font-bold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <CalendarDays className="w-3.5 h-3.5" />
                12-Month Overview
              </button>
            </div>
          </div>

          {/* Main Calendar View */}
          {loading ? (
            <div className="flex justify-center items-center py-24">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : viewMode === "month" ? (
            <MonthViewCalendar
              currentDate={currentDate}
              onDateChange={setCurrentDate}
              leaves={leaves}
              onDateClick={handleDateClick}
            />
          ) : (
            <YearCalendar
              year={year}
              leaves={leaves}
              leaveTypes={leaveTypes}
              onDateClick={handleDateClick}
              onMonthSelect={handleMonthSelect}
            />
          )}
        </div>
      </div>

      <ApplyLeaveDialog
        isOpen={isApplyOpen}
        onClose={() => setIsApplyOpen(false)}
        selectedDate={selectedDateForApply}
        onSuccess={() => loadData()}
      />
    </div>
  );
}
