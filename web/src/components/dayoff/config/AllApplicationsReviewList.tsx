"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Check, X, Clock, CheckCircle2, XCircle, Ban, AlertCircle } from "lucide-react";
import { fetchAllLeaveApplications, updateDayOffStatus } from "../../../lib/api";

export function AllApplicationsReviewList() {
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [processingId, setProcessingId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchAllLeaveApplications(
        statusFilter !== "all" ? { status: statusFilter } : undefined
      );
      setApplications(data || []);
    } catch (err) {
      console.error("Failed to load applications:", err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

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
    if (reason === null) return; // User cancelled prompt

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

  return (
    <div className="space-y-4">
      {/* Top Filter */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-foreground">Employee Leave Applications</h2>
          <p className="text-xs text-muted-foreground">
            Review, approve, or decline employee leave requests across all departments
          </p>
        </div>

        <div className="flex items-center gap-1.5 bg-muted/50 p-0.5 rounded-lg border border-border text-xs">
          {["all", "pending", "approved", "rejected"].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1 rounded-md capitalize font-medium transition-all ${
                statusFilter === s
                  ? "bg-card text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-xl shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-16 flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : applications.length === 0 ? (
          <div className="py-16 text-center text-sm text-muted-foreground">
            No leave applications found for this filter.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-muted-foreground uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-4 font-semibold">Employee</th>
                  <th className="py-3 px-4 font-semibold">Leave Type</th>
                  <th className="py-3 px-4 font-semibold">Duration</th>
                  <th className="py-3 px-4 font-semibold">Reason</th>
                  <th className="py-3 px-4 font-semibold">Submitted</th>
                  <th className="py-3 px-4 font-semibold">Status</th>
                  <th className="py-3 px-4 font-semibold text-right">Review Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50 text-foreground">
                {applications.map((app) => {
                  const emp = app.employeeId;
                  const empName = emp?.fullName
                    ? `${emp.fullName.firstName || ""} ${emp.fullName.lastName || ""}`.trim()
                    : emp?.email || "Employee";

                  const lt = app.leaveTypeId;
                  const fromStr = new Date(app.fromDate).toISOString().split("T")[0];
                  const toStr = new Date(app.toDate).toISOString().split("T")[0];
                  const isProcessing = processingId === app._id;

                  return (
                    <tr key={app._id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-foreground">{empName}</div>
                        <div className="text-[11px] text-muted-foreground">{emp?.email || ""}</div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1.5 font-medium">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: lt?.color || "#3b82f6" }}
                          />
                          {lt?.name || "Leave"}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-mono text-muted-foreground">{fromStr} &rarr; {toStr}</div>
                        <div className="text-[11px] font-semibold text-foreground">
                          {app.daysCount} day{app.daysCount !== 1 ? "s" : ""}
                        </div>
                      </td>
                      <td className="py-3 px-4 max-w-xs">
                        <div className="truncate font-medium">{app.reason}</div>
                        {app.description && (
                          <div className="truncate text-muted-foreground text-[11px]">
                            {app.description}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-muted-foreground text-[11px]">
                        {new Date(app.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4">
                        {app.status === "approved" && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                            <CheckCircle2 className="w-3 h-3" />
                            Approved
                          </span>
                        )}
                        {app.status === "pending" && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/15 text-amber-600 dark:text-amber-400">
                            <Clock className="w-3 h-3" />
                            Pending
                          </span>
                        )}
                        {app.status === "rejected" && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-red-500/15 text-red-600 dark:text-red-400">
                            <XCircle className="w-3 h-3" />
                            Declined
                          </span>
                        )}
                        {app.status === "cancelled" && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-muted text-muted-foreground">
                            <Ban className="w-3 h-3" />
                            Cancelled
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {app.status === "pending" ? (
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              onClick={() => handleApprove(app._id)}
                              disabled={isProcessing}
                              className="px-2.5 py-1 text-[11px] font-semibold rounded-md bg-emerald-600 hover:bg-emerald-700 text-white transition-all shadow-xs flex items-center gap-1 disabled:opacity-50"
                              title="Approve leave"
                            >
                              <Check className="w-3 h-3" />
                              Approve
                            </button>
                            <button
                              onClick={() => handleReject(app._id)}
                              disabled={isProcessing}
                              className="px-2.5 py-1 text-[11px] font-semibold rounded-md bg-red-600 hover:bg-red-700 text-white transition-all shadow-xs flex items-center gap-1 disabled:opacity-50"
                              title="Decline leave"
                            >
                              <X className="w-3 h-3" />
                              Decline
                            </button>
                          </div>
                        ) : (
                          <span className="text-[11px] text-muted-foreground italic">
                            {app.approvedBy ? `by ${app.approvedBy}` : "Completed"}
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
  );
}
