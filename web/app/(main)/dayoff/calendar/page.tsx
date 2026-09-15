"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "../../../../src/components/layout/PageHeader";
import { MonthViewCalendar } from "../../../../src/components/dayoff/MonthViewCalendar";
import { ApplyLeaveDialog } from "../../../../src/components/dayoff/ApplyLeaveDialog";
import { isDayOffModuleEnabled } from "../../../../src/lib/dayoff-feature";
import {
  fetchMyLeaveApplications,
  fetchLeaveTypes,
} from "../../../../src/lib/api";

export default function DayOffCalendarPage() {
  const router = useRouter();
  const isEnabled = isDayOffModuleEnabled();

  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [leaves, setLeaves] = useState<any[]>([]);
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
      const [leavesData] = await Promise.all([
        fetchMyLeaveApplications(year).catch(() => []),
        fetchLeaveTypes(true).catch(() => []),
      ]);

      setLeaves(leavesData || []);
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

  if (!isEnabled) return null;

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-background">
      <PageHeader
        title="Leave Calendar"
        breadcrumbs={[
          { label: "Time Off" },
        ]}
        showAdd={true}
        addText="Request Time Off"
        onAddClick={() => {
          setSelectedDateForApply(null);
          setIsApplyOpen(true);
        }}
      />

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <div className="max-w-7xl mx-auto">
          {/* Main Month Calendar View Only */}
          {loading ? (
            <div className="flex justify-center items-center py-24">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : (
            <MonthViewCalendar
              currentDate={currentDate}
              onDateChange={setCurrentDate}
              leaves={leaves}
              onDateClick={handleDateClick}
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
