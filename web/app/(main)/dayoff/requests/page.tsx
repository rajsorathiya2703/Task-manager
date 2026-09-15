"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { PageHeader, SearchContextItem } from "../../../../src/components/layout/PageHeader";
import { ApplyLeaveDialog } from "../../../../src/components/dayoff/ApplyLeaveDialog";
import { isDayOffModuleEnabled } from "../../../../src/lib/dayoff-feature";
import {
  fetchLeaveTypes,
  fetchMyLeaveBalances,
} from "../../../../src/lib/api";
import {
  Type,
  Tag,
  Plus,
} from "lucide-react";
import { FilterRule, FilterFieldDefinition } from "../../../../src/components/common/FilterDropdown";

const searchContexts: SearchContextItem[] = [
  { key: "name", label: "Policy Name", icon: Type },
  { key: "code", label: "Code", icon: Tag },
];

export default function MyLeavesPage() {
  const router = useRouter();
  const isEnabled = isDayOffModuleEnabled();

  const [currentDate] = useState<Date>(new Date());
  const [leaveTypes, setLeaveTypes] = useState<any[]>([]);
  const [balances, setBalances] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [searchContext, setSearchContext] = useState<string>("all");
  const [filters, setFilters] = useState<FilterRule[]>([]);

  // Apply Leave Dialog state
  const [isApplyOpen, setIsApplyOpen] = useState<boolean>(false);
  const [selectedApplyLeaveTypeId, setSelectedApplyLeaveTypeId] = useState<string | null>(null);

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
      const [typesData, balancesData] = await Promise.all([
        fetchLeaveTypes(true).catch(() => []),
        fetchMyLeaveBalances(year).catch(() => []),
      ]);

      setLeaveTypes(typesData || []);
      setBalances(balancesData || []);
    } catch (err) {
      console.error("Failed loading leave policies data:", err);
    } finally {
      setLoading(false);
    }
  }, [isEnabled, year]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleOpenApply = (typeId?: string) => {
    setSelectedApplyLeaveTypeId(typeId || null);
    setIsApplyOpen(true);
  };

  // Filter fields configuration
  const filterFields: FilterFieldDefinition[] = useMemo(
    () => [
      {
        field: "RefillCycle",
        label: "Refill Cycle",
        options: ["monthly", "quarterly", "yearly"],
      },
    ],
    []
  );

  // Leave policies matched with current user's balance records
  const policyRows = useMemo(() => {
    return leaveTypes.map((lt) => {
      const b = balances.find((bal) => {
        const balTypeId = bal.leaveType?._id || bal.leaveTypeId?._id || bal.leaveTypeId;
        return balTypeId?.toString() === lt._id?.toString();
      });

      const total =
        (b?.allocated !== undefined ? b.allocated : lt.defaultAllocation) +
        (b?.carriedForward || 0);
      const used = b?.used || 0;
      const remaining =
        b?.remaining !== undefined ? b.remaining : Math.max(0, total - used);

      return {
        ...lt,
        balanceRecord: b,
        totalAllocated: total,
        used,
        remaining,
        carriedForward: b?.carriedForward || 0,
      };
    });
  }, [leaveTypes, balances]);

  // Filtered leave policy rows
  const filteredPolicyRows = useMemo(() => {
    return policyRows.filter((p) => {
      for (const filter of filters) {
        if (filter.field === "RefillCycle") {
          const rc = (p.refillCycle || "yearly").toLowerCase();
          const target = filter.value.toLowerCase();
          if (filter.condition === "eq" && rc !== target) return false;
          if (filter.condition === "neq" && rc === target) return false;
        }
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const name = (p.name || "").toLowerCase();
        const code = (p.code || "").toLowerCase();
        const rules = (p.rules || "").toLowerCase();

        if (searchContext === "name") {
          if (!name.includes(q)) return false;
        } else if (searchContext === "code") {
          if (!code.includes(q)) return false;
        } else {
          if (!name.includes(q) && !code.includes(q) && !rules.includes(q)) return false;
        }
      }
      return true;
    });
  }, [policyRows, filters, searchQuery, searchContext]);

  if (!isEnabled) return null;

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-background">
      <PageHeader
        title="My Leaves"
        breadcrumbs={[
          { label: "Time Off", href: "/dayoff/calendar" },
        ]}
        showAdd={true}
        addText="Apply for Leave"
        onAddClick={() => handleOpenApply()}
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
          {/* Subheader Toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card p-4 rounded-2xl border border-border/60 shadow-xs">
            <div>
              <h2 className="font-bold text-sm text-foreground">Leave Policies & Entitlements</h2>
              <p className="text-xs text-muted-foreground">
                Your leave allowances, refill cycles, deduction rules, and available balances for year {year}
              </p>
            </div>

            <button
              onClick={() => handleOpenApply()}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-xs cursor-pointer self-start sm:self-auto"
            >
              <Plus className="w-3.5 h-3.5" />
              Apply for Leave
            </button>
          </div>

          {/* Leave Policies List View Table */}
          <div className="bg-card rounded-2xl border border-border shadow-xs overflow-hidden">
            {loading ? (
              <div className="flex justify-center items-center py-24">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            ) : filteredPolicyRows.length === 0 ? (
              <div className="py-16 text-center text-sm text-muted-foreground">
                No leave policies available matching the current search.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-border bg-muted/40 text-muted-foreground uppercase text-[10px] tracking-wider whitespace-nowrap">
                      <th className="py-3.5 px-6 font-semibold">Policy Name</th>
                      <th className="py-3.5 px-6 font-semibold">Code</th>
                      <th className="py-3.5 px-6 font-semibold text-center">Allocation</th>
                      <th className="py-3.5 px-6 font-semibold text-center">Used</th>
                      <th className="py-3.5 px-6 font-semibold text-center min-w-[140px]">Available Balance</th>
                      <th className="py-3.5 px-6 font-semibold text-center">Refill Cycle</th>
                      <th className="py-3.5 px-6 font-semibold text-center">Salary Cut</th>
                      <th className="py-3.5 px-6 font-semibold text-center">Carry Forward</th>
                      <th className="py-3.5 px-6 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50 text-foreground">
                    {filteredPolicyRows.map((item) => (
                      <tr
                        key={item._id}
                        className="border-b border-border/50 hover:bg-muted/30 transition-colors"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div
                              className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0"
                              style={{
                                backgroundColor: `${item.color || "#3b82f6"}20`,
                                color: item.color || "#3b82f6",
                              }}
                            >
                              {item.name?.charAt(0) || "L"}
                            </div>
                            <div>
                              <div className="font-semibold text-foreground whitespace-nowrap">{item.name}</div>
                              {item.rules && (
                                <div className="text-[11px] text-muted-foreground truncate max-w-xs mt-0.5">
                                  {item.rules}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 font-mono font-medium text-muted-foreground whitespace-nowrap">
                          {item.code}
                        </td>
                        <td className="px-6 py-4 font-semibold text-foreground text-center whitespace-nowrap">
                          {item.totalAllocated} days
                        </td>
                        <td className="px-6 py-4 font-medium text-muted-foreground text-center whitespace-nowrap">
                          {item.used} days
                        </td>
                        <td className="px-6 py-4 text-center whitespace-nowrap">
                          <span className="inline-flex items-center justify-center px-3.5 py-1 rounded-full text-xs font-bold bg-primary/10 text-primary whitespace-nowrap shadow-xs">
                            {item.remaining} days left
                          </span>
                        </td>
                        <td className="px-6 py-4 capitalize text-muted-foreground font-medium text-center whitespace-nowrap">
                          {item.refillCycle || "Yearly"}
                        </td>
                        <td className="px-6 py-4 text-center whitespace-nowrap">
                          <span
                            className={`px-2.5 py-1 rounded-full text-xs font-semibold inline-block whitespace-nowrap ${
                              item.salaryDeductionPercent === 0
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                : item.salaryDeductionPercent === 100
                                ? "bg-red-500/10 text-red-600 dark:text-red-400"
                                : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                            }`}
                          >
                            {item.salaryDeductionPercent}%
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center whitespace-nowrap">
                          {item.canCarryForward ? (
                            <span className="text-emerald-600 dark:text-emerald-400 font-semibold whitespace-nowrap">
                              Yes {item.carryForwardLimit > 0 ? `(${item.carryForwardLimit}d)` : "(unlimited)"}
                            </span>
                          ) : (
                            <span className="text-muted-foreground whitespace-nowrap">No</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right whitespace-nowrap">
                          <button
                            onClick={() => handleOpenApply(item._id)}
                            className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-primary/10 hover:bg-primary text-primary hover:text-primary-foreground transition-all shadow-xs inline-flex items-center gap-1 cursor-pointer"
                          >
                            Apply
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      <ApplyLeaveDialog
        isOpen={isApplyOpen}
        onClose={() => {
          setIsApplyOpen(false);
          setSelectedApplyLeaveTypeId(null);
        }}
        selectedDate={null}
        initialLeaveTypeId={selectedApplyLeaveTypeId}
        onSuccess={() => loadData()}
      />
    </div>
  );
}
