"use client";

import React from "react";
import { Plus, Edit2, Trash2, CheckCircle, XCircle, Tag } from "lucide-react";
import { deleteLeaveType } from "../../../lib/api";

interface LeaveTypeListProps {
  leaveTypes: any[];
  onAddNew: () => void;
  onEdit: (item: any) => void;
  onRefresh: () => void;
}

export function LeaveTypeList({
  leaveTypes,
  onAddNew,
  onEdit,
  onRefresh,
}: LeaveTypeListProps) {
  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete leave type "${name}"?`)) return;
    try {
      await deleteLeaveType(id);
      onRefresh();
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to delete leave type.");
    }
  };

  return (
    <div className="bg-card rounded-2xl border border-border shadow-xs overflow-hidden">
      {/* Table Header Controls */}
      <div className="px-6 py-4 bg-muted/30 border-b border-border flex items-center justify-between">
        <div>
          <h2 className="font-bold text-sm text-foreground">Configured Leave Types</h2>
          <p className="text-xs text-muted-foreground">
            Manage policies, refill frequency, deduction percentages, and eligibility
          </p>
        </div>
        <button
          onClick={onAddNew}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-xs"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Leave Type
        </button>
      </div>

      {leaveTypes.length === 0 ? (
        <div className="py-16 text-center text-sm text-muted-foreground">
          No leave types configured. Click "Add Leave Type" to set one up.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-muted-foreground uppercase text-[10px] tracking-wider">
                <th className="py-3.5 px-6 font-semibold">Type Name</th>
                <th className="py-3.5 px-6 font-semibold">Code</th>
                <th className="py-3.5 px-6 font-semibold">Allocation</th>
                <th className="py-3.5 px-6 font-semibold">Refill Cycle</th>
                <th className="py-3.5 px-6 font-semibold">Salary Cut</th>
                <th className="py-3.5 px-6 font-semibold">Carry Forward</th>
                <th className="py-3.5 px-6 font-semibold">Target Groups</th>
                <th className="py-3.5 px-6 font-semibold">Status</th>
                <th className="py-3.5 px-6 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50 text-foreground">
              {leaveTypes.map((item) => (
                <tr
                  key={item._id}
                  className="border-b border-border/50 hover:bg-muted/30 transition-colors cursor-pointer"
                  onClick={() => onEdit(item)}
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs"
                        style={{
                          backgroundColor: `${item.color || "#3b82f6"}20`,
                          color: item.color || "#3b82f6",
                        }}
                      >
                        {item.name?.charAt(0) || "L"}
                      </div>
                      <div>
                        <div className="font-semibold text-foreground">{item.name}</div>
                        {item.rules && (
                          <div className="text-[11px] text-muted-foreground truncate max-w-xs mt-0.5">
                            {item.rules}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 font-mono font-medium text-muted-foreground">
                    {item.code}
                  </td>
                  <td className="px-6 py-4 font-semibold text-foreground">
                    {item.defaultAllocation} days
                  </td>
                  <td className="px-6 py-4 capitalize text-muted-foreground font-medium">
                    {item.refillCycle || "Yearly"}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-semibold inline-block ${
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
                  <td className="px-6 py-4">
                    {item.canCarryForward ? (
                      <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                        Yes {item.carryForwardLimit > 0 ? `(${item.carryForwardLimit}d)` : "(unlimited)"}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">No</span>
                    )}
                  </td>
                  <td className="px-6 py-4 max-w-xs truncate text-muted-foreground">
                    {item.applicableUserGroups && item.applicableUserGroups.length > 0
                      ? item.applicableUserGroups.map((g: any) => g.name || "Group").join(", ")
                      : "All Groups"}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-semibold inline-flex items-center gap-1 ${
                        item.isActive
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {item.isActive ? (
                        <>
                          <CheckCircle className="w-3 h-3" /> Active
                        </>
                      ) : (
                        <>
                          <XCircle className="w-3 h-3" /> Disabled
                        </>
                      )}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="inline-flex items-center gap-2">
                      <button
                        onClick={() => onEdit(item)}
                        className="text-xs font-semibold text-primary hover:underline"
                      >
                        Edit
                      </button>
                      <span className="text-border">|</span>
                      <button
                        onClick={() => handleDelete(item._id, item.name)}
                        className="text-xs font-semibold text-red-600 dark:text-red-400 hover:underline"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
