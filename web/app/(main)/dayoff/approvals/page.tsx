"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { PageHeader, SearchContextItem } from "../../../../src/components/layout/PageHeader";
import { isDayOffModuleEnabled } from "../../../../src/lib/dayoff-feature";
import { fetchAllLeaveApplications, updateDayOffStatus } from "../../../../src/lib/api";
import {
  Check,
  X,
  Clock,
  CheckCircle2,
  XCircle,
  Ban,
  ClipboardCheck,
  Type,
  User,
  Users,
} from "lucide-react";
import { FilterRule, FilterFieldDefinition } from "../../../../src/components/common/FilterDropdown";

const searchContexts: SearchContextItem[] = [
  { key: "employee", label: "Employee Name / Email", icon: User },
  { key: "reason", label: "Reason", icon: Type },
];

export default function LeaveApprovalsPage() {
  const router = useRouter();
  const isEnabled = isDayOffModuleEnabled();

  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [statusFilter, setStatusFilter] = useState<string>("pending");
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [searchContext, setSearchContext] = useState<string>("all");
  const [filters, setFilters] = useState<FilterRule[]>([]);

  // Feature toggle redirect guard
  useEffect(() => {
    if (!isEnabled) {
      router.replace("/dashboard");
    }
  }, [isEnabled, router]);

  const loadData = useCallback(async () => {
    if (!isEnabled) return;
    try {
      setLoading(true);
      const data = await fetchAllLeaveApplications();
      setApplications(data || []);
    } catch (err) {
      console.error("Failed to load applications:", err);
    } finally {
      setLoading(false);
    }
  }, [isEnabled]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleApprove = async (id: string) => {
    try {
      setProcessingId(id);
      await updateDayOffStatus(id, "approved");
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to approve application.");
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (id: string) => {
    const reason = prompt("Enter a reason for declining this leave request (optional):");
    if (reason === null) return;

    try {
      setProcessingId(id);
      await updateDayOffStatus(id, "rejected", reason);
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to decline application.");
    } finally {
      setProcessingId(null);
    }
  };

  // Metrics counters
  const counts = useMemo(() => {
    const pending = applications.filter((a) => a.status === "pending").length;
    const approved = applications.filter((a) => a.status === "approved").length;
    const rejected = applications.filter((a) => a.status === "rejected").length;
    const total = applications.length;
    return { pending, approved, rejected, total };
  }, [applications]);

  // Filter fields configuration
  const filterFields: FilterFieldDefinition[] = useMemo(
    () => [
      {
        field: "Status",
        label: "Status",
        options: ["pending", "approved", "rejected", "cancelled"],
      },
    ],
    []
  );

  // Filter and search application data
  const filteredApplications = useMemo(() => {
    return applications.filter((app) => {
      // 1. Status Filter button
      if (statusFilter !== "all" && app.status !== statusFilter) {
        return false;
      }

      // 2. Extra Filters
      for (const filter of filters) {
        if (filter.field === "Status") {
          const s = (app.status || "pending").toLowerCase();
          const target = filter.value.toLowerCase();
          if (filter.condition === "eq" && s !== target) return false;
          if (filter.condition === "neq" && s === target) return false;
        }
      }

      // 3. Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const emp = app.employeeId;
        const empName = emp?.fullName
          ? `${emp.fullName.firstName || ""} ${emp.fullName.lastName || ""}`.toLowerCase()
          : "";
        const email = (emp?.email || "").toLowerCase();
        const reason = (app.reason || "").toLowerCase();
        const typeName = (app.leaveTypeId?.name || "").toLowerCase();

        if (searchContext === "employee") {
          if (!empName.includes(q) && !email.includes(q)) return false;
        } else if (searchContext === "reason") {
          if (!reason.includes(q)) return false;
        } else {
          if (!empName.includes(q) && !email.includes(q) && !reason.includes(q) && !typeName.includes(q)) {
            return false;
          }
        }
      }

      return true;
    });
  }, [applications, statusFilter, filters, searchQuery, searchContext]);

  if (!isEnabled) return null;

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-background">
      <PageHeader
        title="Leave Approvals Queue"
        breadcrumbs={[
          { label: "Configuration", href: "/configuration/team" },
          { label: "Approvals" },
        ]}
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
          {/* Top KPI Cards for Approver */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-card border border-amber-500/30 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Needs Action
                </span>
                <div className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-0.5">
                  {counts.pending}
                </div>
                <div className="text-[11px] text-muted-foreground mt-0.5">Pending approvals</div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500">
                <Clock className="w-5 h-5" />
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-card border border-emerald-500/30 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Approved
                </span>
                <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                  {counts.approved}
                </div>
                <div className="text-[11px] text-muted-foreground mt-0.5">Approved requests</div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-card border border-border/60 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Declined
                </span>
                <div className="text-2xl font-bold text-foreground mt-0.5">
                  {counts.rejected}
                </div>
                <div className="text-[11px] text-muted-foreground mt-0.5">Declined requests</div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center text-red-500">
                <XCircle className="w-5 h-5" />
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-card border border-border/60 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Total Submissions
                </span>
                <div className="text-2xl font-bold text-foreground mt-0.5">
                  {counts.total}
                </div>
                <div className="text-[11px] text-muted-foreground mt-0.5">All department requests</div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                <Users className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Quick Filter Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card p-4 rounded-2xl border border-border/60 shadow-xs">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                <ClipboardCheck className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-foreground">Review Requests</h3>
                <p className="text-xs text-muted-foreground">Direct 1-click Approve or Decline for managers</p>
              </div>
            </div>

            {/* Status Filter Chips */}
            <div className="flex items-center bg-muted p-1 rounded-xl border border-border/50 text-xs font-semibold">
              {[
                { key: "pending", label: `Pending (${counts.pending})` },
                { key: "approved", label: "Approved" },
                { key: "rejected", label: "Declined" },
                { key: "all", label: `All (${counts.total})` },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setStatusFilter(tab.key)}
                  className={`px-3.5 py-1.5 rounded-lg transition-all ${
                    statusFilter === tab.key
                      ? "bg-card text-foreground shadow-xs font-bold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Review Table */}
          <div className="bg-card rounded-2xl border border-border shadow-xs overflow-hidden">
            {loading ? (
              <div className="flex justify-center items-center py-24">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            ) : filteredApplications.length === 0 ? (
              <div className="py-20 text-center text-sm text-muted-foreground space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto text-muted-foreground/50">
                  <ClipboardCheck className="w-6 h-6" />
                </div>
                <div className="font-medium text-foreground">No applications in this queue</div>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  {statusFilter === "pending"
                    ? "Great news! All leave requests have been reviewed."
                    : "No leave requests match the selected status filter."}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-border bg-muted/40 text-muted-foreground uppercase text-[10px] tracking-wider">
                      <th className="py-3.5 px-6 font-semibold">Employee</th>
                      <th className="py-3.5 px-6 font-semibold">Leave Type</th>
                      <th className="py-3.5 px-6 font-semibold">Duration & Dates</th>
                      <th className="py-3.5 px-6 font-semibold">Reason</th>
                      <th className="py-3.5 px-6 font-semibold">Applied On</th>
                      <th className="py-3.5 px-6 font-semibold">Status</th>
                      <th className="py-3.5 px-6 font-semibold text-right">Review Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50 text-foreground">
                    {filteredApplications.map((app) => {
                      const emp = app.employeeId;
                      const empName = emp?.fullName
                        ? `${emp.fullName.firstName || ""} ${emp.fullName.lastName || ""}`.trim()
                        : emp?.email || "Employee";

                      const lt = app.leaveTypeId;
                      const fromStr = new Date(app.fromDate).toISOString().split("T")[0];
                      const toStr = new Date(app.toDate).toISOString().split("T")[0];
                      const isProcessing = processingId === app._id;

                      return (
                        <tr key={app._id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                          <td className="px-6 py-4">
                            <div className="font-semibold text-foreground">{empName}</div>
                            <div className="text-[11px] text-muted-foreground font-mono">{emp?.email || ""}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="inline-flex items-center gap-2">
                              <span
                                className="w-2.5 h-2.5 rounded-full shrink-0"
                                style={{ backgroundColor: lt?.color || "#3b82f6" }}
                              />
                              <span className="font-semibold text-foreground">{lt?.name || "Leave"}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="font-semibold text-foreground">
                              {app.daysCount} day{app.daysCount !== 1 ? "s" : ""}
                            </div>
                            <div className="font-mono text-muted-foreground text-[11px]">
                              {fromStr} {fromStr !== toStr ? `→ ${toStr}` : ""}
                            </div>
                          </td>
                          <td className="px-6 py-4 max-w-xs">
                            <div className="font-medium text-foreground truncate">{app.reason}</div>
                            {app.description && (
                              <div className="text-[11px] text-muted-foreground truncate">{app.description}</div>
                            )}
                          </td>
                          <td className="px-6 py-4 text-muted-foreground text-[11px]">
                            {new Date(app.createdAt).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={`px-2.5 py-1 rounded-full text-xs font-semibold inline-flex items-center gap-1.5 ${
                                app.status === "approved"
                                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                  : app.status === "pending"
                                  ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                                  : app.status === "rejected"
                                  ? "bg-red-500/10 text-red-600 dark:text-red-400"
                                  : "bg-muted text-muted-foreground"
                              }`}
                            >
                              {app.status === "approved" && <CheckCircle2 className="w-3.5 h-3.5" />}
                              {app.status === "pending" && <Clock className="w-3.5 h-3.5" />}
                              {app.status === "rejected" && <XCircle className="w-3.5 h-3.5" />}
                              {app.status === "cancelled" && <Ban className="w-3.5 h-3.5" />}
                              <span className="capitalize">{app.status}</span>
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            {app.status === "pending" ? (
                              <div className="inline-flex items-center gap-2">
                                <button
                                  onClick={() => handleApprove(app._id)}
                                  disabled={isProcessing}
                                  className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white transition-all shadow-xs inline-flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                                  title="Approve request"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                  Approve
                                </button>
                                <button
                                  onClick={() => handleReject(app._id)}
                                  disabled={isProcessing}
                                  className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-red-600 hover:bg-red-700 text-white transition-all shadow-xs inline-flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                                  title="Decline request"
                                >
                                  <X className="w-3.5 h-3.5" />
                                  Decline
                                </button>
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground italic">
                                {app.approvedBy ? `Reviewed by ${app.approvedBy}` : "Completed"}
                              </span>
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
    </div>
  );
}
