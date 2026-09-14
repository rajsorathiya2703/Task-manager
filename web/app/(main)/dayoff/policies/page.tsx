"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { PageHeader, SearchContextItem } from "../../../../src/components/layout/PageHeader";
import { LeaveTypeList } from "../../../../src/components/dayoff/config/LeaveTypeList";
import { LeaveTypeForm } from "../../../../src/components/dayoff/config/LeaveTypeForm";
import { DayOffSettingsForm } from "../../../../src/components/dayoff/config/DayOffSettingsForm";
import { isDayOffModuleEnabled } from "../../../../src/lib/dayoff-feature";
import { fetchLeaveTypes } from "../../../../src/lib/api";
import { Sliders, ListFilter, Type, Tag, ArrowLeft } from "lucide-react";
import { FilterRule, FilterFieldDefinition } from "../../../../src/components/common/FilterDropdown";

const searchContexts: SearchContextItem[] = [
  { key: "name", label: "Leave Name", icon: Type },
  { key: "code", label: "Code", icon: Tag },
];

export default function LeavePoliciesPage() {
  const router = useRouter();
  const isEnabled = isDayOffModuleEnabled();

  const [activeTab, setActiveTab] = useState<"leaveTypes" | "settings">("leaveTypes");
  const [leaveTypeView, setLeaveTypeView] = useState<"list" | "form">("list");
  const [editingLeaveType, setEditingLeaveType] = useState<any | null>(null);

  const [leaveTypes, setLeaveTypes] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [searchContext, setSearchContext] = useState<string>("all");
  const [filters, setFilters] = useState<FilterRule[]>([]);

  // Feature toggle redirect guard
  useEffect(() => {
    if (!isEnabled) {
      router.replace("/dashboard");
    }
  }, [isEnabled, router]);

  const loadLeaveTypes = useCallback(async () => {
    if (!isEnabled) return;
    try {
      setLoading(true);
      const data = await fetchLeaveTypes();
      setLeaveTypes(data || []);
    } catch (err) {
      console.error("Failed to load leave types:", err);
    } finally {
      setLoading(false);
    }
  }, [isEnabled]);

  useEffect(() => {
    loadLeaveTypes();
  }, [loadLeaveTypes]);

  const handleAddNew = () => {
    setEditingLeaveType(null);
    setLeaveTypeView("form");
  };

  const handleEdit = (item: any) => {
    setEditingLeaveType(item);
    setLeaveTypeView("form");
  };

  const handleBackToList = () => {
    setEditingLeaveType(null);
    setLeaveTypeView("list");
    loadLeaveTypes();
  };

  const filterFields: FilterFieldDefinition[] = useMemo(
    () => [
      {
        field: "Status",
        label: "Status",
        options: ["Active", "Disabled"],
      },
      {
        field: "RefillCycle",
        label: "Refill Cycle",
        options: ["monthly", "quarterly", "yearly"],
      },
    ],
    []
  );

  const filteredLeaveTypes = useMemo(() => {
    return leaveTypes.filter((item) => {
      for (const filter of filters) {
        if (filter.field === "Status") {
          const s = item.isActive ? "active" : "disabled";
          const target = filter.value.toLowerCase();
          if (filter.condition === "eq" && s !== target) return false;
          if (filter.condition === "neq" && s === target) return false;
        } else if (filter.field === "RefillCycle") {
          const rc = (item.refillCycle || "yearly").toLowerCase();
          const target = filter.value.toLowerCase();
          if (filter.condition === "eq" && rc !== target) return false;
          if (filter.condition === "neq" && rc === target) return false;
        }
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const name = (item.name || "").toLowerCase();
        const code = (item.code || "").toLowerCase();

        if (searchContext === "name") {
          if (!name.includes(q)) return false;
        } else if (searchContext === "code") {
          if (!code.includes(q)) return false;
        } else {
          if (!name.includes(q) && !code.includes(q)) return false;
        }
      }

      return true;
    });
  }, [leaveTypes, filters, searchQuery, searchContext]);

  if (!isEnabled) return null;

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-background">
      <PageHeader
        title="Leave Policies & Settings"
        breadcrumbs={[
          { label: "Time Off", href: "/dayoff/calendar" },
          { label: "Leave Policies" },
        ]}
        showAdd={activeTab === "leaveTypes" && leaveTypeView === "list"}
        addText="New Leave Type"
        onAddClick={handleAddNew}
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
          {/* Segmented Toolbar Tabs */}
          <div className="flex items-center justify-between bg-card p-4 rounded-2xl border border-border/60 shadow-xs">
            <div className="flex items-center bg-muted p-1 rounded-xl border border-border/50 text-xs font-semibold">
              <button
                onClick={() => {
                  setActiveTab("leaveTypes");
                  setLeaveTypeView("list");
                }}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition-all ${
                  activeTab === "leaveTypes"
                    ? "bg-card text-foreground shadow-xs font-bold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <ListFilter className="w-3.5 h-3.5" />
                Leave Categories & Rules
              </button>

              <button
                onClick={() => setActiveTab("settings")}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition-all ${
                  activeTab === "settings"
                    ? "bg-card text-foreground shadow-xs font-bold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Sliders className="w-3.5 h-3.5" />
                Email & Notification Settings
              </button>
            </div>

            {activeTab === "leaveTypes" && leaveTypeView === "form" && (
              <button
                onClick={handleBackToList}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back to All Leave Types
              </button>
            )}
          </div>

          {/* Tab Content */}
          {activeTab === "leaveTypes" && (
            leaveTypeView === "list" ? (
              <LeaveTypeList
                leaveTypes={filteredLeaveTypes}
                onAddNew={handleAddNew}
                onEdit={handleEdit}
                onRefresh={loadLeaveTypes}
              />
            ) : (
              <LeaveTypeForm
                initialData={editingLeaveType}
                onBack={handleBackToList}
                onSaved={handleBackToList}
              />
            )
          )}

          {activeTab === "settings" && (
            <DayOffSettingsForm />
          )}
        </div>
      </div>
    </div>
  );
}
