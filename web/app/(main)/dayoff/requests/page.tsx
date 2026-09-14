"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { PageHeader, SearchContextItem } from "../../../../src/components/layout/PageHeader";
import { LeaveBalanceHeader } from "../../../../src/components/dayoff/LeaveBalanceHeader";
import { ApplyLeaveDialog } from "../../../../src/components/dayoff/ApplyLeaveDialog";
import { isDayOffModuleEnabled } from "../../../../src/lib/dayoff-feature";
import {
  fetchMyLeaveApplications,
  fetchLeaveTypes,
  fetchMyLeaveBalances,
  cancelDayOffApplication,
} from "../../../../src/lib/api";
import {
  Calendar,
  CheckCircle2,
  Clock,
  XCircle,
  Ban,
  ChevronLeft,
  ChevronRight,
  Type,
  Tag,
  CalendarCheck,
} from "lucide-react";
import { FilterRule, FilterFieldDefinition } from "../../../../src/components/common/FilterDropdown";

const searchContexts: SearchContextItem[] = [
  { key: "reason", label: "Reason", icon: Type },
  { key: "type", label: "Leave Type", icon: Tag },
];

export default function MyLeavesPage() {
  const router = useRouter();
  const isEnabled = isDayOffModuleEnabled();

  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [leaves, setLeaves] = useState<any[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<any[]>([]);
  const [balances, setBalances] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [searchContext, setSearchContext] = useState<string>("all");
  const [filters, setFilters] = useState<FilterRule[]>([]);

  // Apply Leave Dialog state
  const [isApplyOpen, setIsApplyOpen] = useState<boolean>(false);

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
      console.error("Failed loading leave requests data:", err);
    } finally {
      setLoading(false);
    }
  }, [isEnabled, year]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCancelLeave = async (id: string) => {
    if (!confirm("Are you sure you want to cancel this pending leave request?")) return;
    try {
      await cancelDayOffApplication(id);
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to cancel leave application.");
    }
  };

  // Filter fields configuration
  const filterFields: FilterFieldDefinition[] = useMemo(
    () => [
      {
        field: "Status",
        label: "Status",
        options: ["approved", "pending", "rejected", "cancelled"],
      },
      {
        field: "LeaveType",
        label: "Leave Type",
        options: leaveTypes.map((lt) => lt.name),
      },
    ],
    [leaveTypes]
  );

  // Filter and search application data
  const filteredLeaves = useMemo(() => {
    return leaves.filter((leave) => {
      for (const filter of filters) {
        if (filter.field === "Status") {
          const s = (leave.status || "pending").toLowerCase();
          const target = filter.value.toLowerCase();
          if (filter.condition === "eq" && s !== target) return false;
          if (filter.condition === "neq" && s === target) return false;
        } else if (filter.field === "LeaveType") {
          const typeName = (leave.leaveTypeId?.name || "").toLowerCase();
          const target = filter.value.toLowerCase();
          if (filter.condition === "eq" && typeName !== target) return false;
          if (filter.condition === "neq" && typeName === target) return false;
        }
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const reason = (leave.reason || "").toLowerCase();
        const typeName = (leave.leaveTypeId?.name || "").toLowerCase();
        const desc = (leave.description || "").toLowerCase();

        if (searchContext === "reason") {
          if (!reason.includes(q)) return false;
        } else if (searchContext === "type") {
          if (!typeName.includes(q)) return false;
        } else {
          if (!reason.includes(q) && !typeName.includes(q) && !desc.includes(q)) return false;
        }
      }

      return true;
    });
  }, [leaves, filters, searchQuery, searchContext]);

  if (!isEnabled) return null;

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-background">
      <PageHeader
        title="My Leave Requests"
        breadcrumbs={[
          { label: "Time Off", href: "/dayoff/calendar" },
          { label: "My Leaves" },
        ]}
        showAdd={true}
        addText="Apply for Leave"
        onAddClick={() => setIsApplyOpen(true)}
        searchQuery={searchQuery}
        searchContext={searchContext}
        searchContexts={searchContexts}
        onSearchChange={(q, ctx) => {
          setSearchQuery(q);
          setSearchContext(ctx);
        }}
        filters={filters}
        onApplyFilter={(f) => setFilters([...filters, f])}
        onRemoveFilter={(id) => setFilters(filters.filter((f) => f.id !== id))}
        onClearFilters={() => setFilters([])}
        filterFields={filterFields}
      />

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Top KPI Balance Cards */}
          <LeaveBalanceHeader
            balances={balances}
            onApplyClick={() => setIsApplyOpen(true)}
          />

          {/* Subheader Toolbar with Year Selector */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card p-4 rounded-2xl border border-border/60 shadow-xs">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                <CalendarCheck className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-foreground">Applications History</h3>
                <p className="text-xs text-muted-foreground">Showing leave requests submitted for year {year}</p>
              </div>
            </div>

            {/* Year Selector */}
            <div className="flex items-center gap-2 self-end sm:self-auto">
              <div className="flex items-center bg-card border border-border rounded-xl p-0.5 shadow-xs text-xs font-semibold">
                <button
                  onClick={() => setCurrentDate(new Date(year - 1, currentDate.getMonth(), 1))}
                  className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                  title="Previous Year"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="px-3 font-mono font-bold text-foreground">{year}</span>
                <button
                  onClick={() => setCurrentDate(new Date(year + 1, currentDate.getMonth(), 1))}
                  className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                  title="Next Year"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              <button
                onClick={() => setCurrentDate(new Date())}
                className="px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/80 rounded-xl border border-border transition-colors"
              >
                Current Year
              </button>
            </div>
          </div>

          {/* Applications Table */}
          <div className="bg-card rounded-2xl border border-border shadow-xs overflow-hidden">
            {loading ? (
              <div className="flex justify-center items-center py-24">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            ) : filteredLeaves.length === 0 ? (
              <div className="py-20 text-center text-sm text-muted-foreground space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto text-muted-foreground/50">
                  <Calendar className="w-6 h-6" />
                </div>
                <div className="font-medium text-foreground">No leave requests found</div>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  You haven&apos;t submitted any leave applications for {year} matching the current filters.
                </p>
                <button
                  onClick={() => setIsApplyOpen(true)}
                  className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-xs"
                >
                  Apply for Leave
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-border bg-muted/40 text-muted-foreground uppercase text-[10px] tracking-wider">
                      <th className="py-3.5 px-6 font-semibold">Leave Type</th>
                      <th className="py-3.5 px-6 font-semibold">Date Range</th>
                      <th className="py-3.5 px-6 font-semibold">Duration</th>
                      <th className="py-3.5 px-6 font-semibold">Reason</th>
                      <th className="py-3.5 px-6 font-semibold">Status</th>
                      <th className="py-3.5 px-6 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50 text-foreground">
                    {filteredLeaves.map((leave) => {
                      const lt = leave.leaveTypeId;
                      const fromStr = new Date(leave.fromDate).toISOString().split("T")[0];
                      const toStr = new Date(leave.toDate).toISOString().split("T")[0];

                      return (
                        <tr key={leave._id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div
                                className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs"
                                style={{
                                  backgroundColor: `${lt?.color || "#3b82f6"}20`,
                                  color: lt?.color || "#3b82f6",
                                }}
                              >
                                {lt?.name?.charAt(0) || "L"}
                              </div>
                              <div>
                                <div className="font-semibold text-foreground">{lt?.name || "Leave"}</div>
                                <div className="text-[10px] text-muted-foreground font-mono">
                                  {lt?.code || "LEAVE"}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="font-medium text-foreground font-mono">
                              {fromStr} {fromStr !== toStr ? `→ ${toStr}` : ""}
                            </div>
                          </td>
                          <td className="px-6 py-4 font-semibold text-foreground">
                            {leave.daysCount} day{leave.daysCount !== 1 ? "s" : ""}
                          </td>
                          <td className="px-6 py-4 max-w-xs">
                            <div className="font-medium text-foreground truncate">{leave.reason}</div>
                            {leave.description && (
                              <div className="text-[11px] text-muted-foreground truncate">{leave.description}</div>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={`px-2.5 py-1 rounded-full text-xs font-semibold inline-flex items-center gap-1.5 ${
                                leave.status === "approved"
                                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                  : leave.status === "pending"
                                  ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                                  : leave.status === "rejected"
                                  ? "bg-red-500/10 text-red-600 dark:text-red-400"
                                  : "bg-muted text-muted-foreground"
                              }`}
                            >
                              {leave.status === "approved" && <CheckCircle2 className="w-3.5 h-3.5" />}
                              {leave.status === "pending" && <Clock className="w-3.5 h-3.5" />}
                              {leave.status === "rejected" && <XCircle className="w-3.5 h-3.5" />}
                              {leave.status === "cancelled" && <Ban className="w-3.5 h-3.5" />}
                              <span className="capitalize">{leave.status}</span>
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            {leave.status === "pending" ? (
                              <button
                                onClick={() => handleCancelLeave(leave._id)}
                                className="text-xs font-semibold text-red-600 dark:text-red-400 hover:underline cursor-pointer"
                              >
                                Cancel Request
                              </button>
                            ) : (
                              <span className="text-xs text-muted-foreground italic">Completed</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      <ApplyLeaveDialog
        isOpen={isApplyOpen}
        onClose={() => setIsApplyOpen(false)}
        selectedDate={null}
        onSuccess={() => loadData()}
      />
    </div>
  );
}
