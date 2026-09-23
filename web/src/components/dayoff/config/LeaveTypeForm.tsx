"use client";

import React, { useState } from "react";
import { ArrowLeft, Save, AlertCircle, CheckCircle2 } from "lucide-react";
import { createLeaveType, updateLeaveType } from "../../../lib/api";

interface LeaveTypeFormProps {
  initialData?: any | null;
  onBack: () => void;
  onSaved: () => void;
}

const COLOR_PRESETS = [
  "#10b981", // green
  "#3b82f6", // blue
  "#8b5cf6", // purple
  "#ec4899", // pink
  "#f59e0b", // amber
  "#ef4444", // red
  "#64748b", // slate
  "#06b6d4", // cyan
];

export function LeaveTypeForm({ initialData, onBack, onSaved }: LeaveTypeFormProps) {
  const isEditing = Boolean(initialData?._id);

  const [name, setName] = useState(initialData?.name || "");
  const [code, setCode] = useState(initialData?.code || "");
  const [color, setColor] = useState(initialData?.color || "#10b981");
  const [rules, setRules] = useState(initialData?.rules || "");
  const [canCarryForward, setCanCarryForward] = useState(Boolean(initialData?.canCarryForward));
  const [carryForwardLimit, setCarryForwardLimit] = useState<number>(initialData?.carryForwardLimit || 0);
  const [salaryDeductionPercent, setSalaryDeductionPercent] = useState<number>(
    initialData?.salaryDeductionPercent !== undefined ? initialData.salaryDeductionPercent : 0
  );
  const [refillCycle, setRefillCycle] = useState<string>(initialData?.refillCycle || "yearly");
  const [defaultAllocation, setDefaultAllocation] = useState<number>(
    initialData?.defaultAllocation !== undefined ? initialData.defaultAllocation : 12
  );
  const [isActive, setIsActive] = useState<boolean>(
    initialData?.isActive !== undefined ? initialData.isActive : true
  );

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleNameChange = (val: string) => {
    setName(val);
    if (!isEditing && !code) {
      setCode(val.toUpperCase().replace(/[^A-Z0-9]/g, "_"));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!name.trim()) {
      setError("Please provide a name for this leave type.");
      return;
    }

    const payload = {
      name: name.trim(),
      code: (code || name).trim().toUpperCase().replace(/[^A-Z0-9]/g, "_"),
      color,
      rules: rules.trim(),
      canCarryForward,
      carryForwardLimit: canCarryForward ? Number(carryForwardLimit) : 0,
      salaryDeductionPercent: Number(salaryDeductionPercent),
      refillCycle,
      defaultAllocation: Number(defaultAllocation),
      isActive,
    };

    try {
      setLoading(true);
      if (isEditing) {
        await updateLeaveType(initialData._id, payload);
        setSuccess("Leave Type updated successfully!");
      } else {
        await createLeaveType(payload);
        setSuccess("Leave Type created successfully!");
      }

      setTimeout(() => {
        onSaved();
      }, 1000);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || "Failed to save leave type.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-card border border-border rounded-xl shadow-xs overflow-hidden">
      {/* Form Top Navigation Bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/20">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            title="Back to List View"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h2 className="text-base font-bold text-foreground">
              {isEditing ? `Edit Leave Type: ${initialData.name}` : "New Leave Type"}
            </h2>
            <p className="text-xs text-muted-foreground">
              Configure allocation, deduction, and carry-forward rules
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onBack}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-border hover:bg-muted text-foreground transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-xs flex items-center gap-1.5 disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            {loading ? "Saving..." : isEditing ? "Save Changes" : "Create Type"}
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-6 max-w-3xl">
        {error && (
          <div className="flex items-center gap-2 p-3 text-xs rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="flex items-center gap-2 p-3 text-xs rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{success}</span>
          </div>
        )}

        {/* Basic Information */}
        <div className="space-y-4">
          <h3 className="text-xs font-bold text-foreground uppercase tracking-wider pb-1 border-b border-border/60">
            General Information
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">
                Leave Type Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Paid Leave, Medical Leave, Half Day Leave"
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">
                Unique Code
              </label>
              <input
                type="text"
                placeholder="e.g. PAID, MEDICAL, HALF_DAY"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-mono"
              />
            </div>
          </div>

          {/* Color Tag Picker */}
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">
              Calendar Color Tag
            </label>
            <div className="flex items-center gap-2 flex-wrap">
              {COLOR_PRESETS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-7 h-7 rounded-full transition-transform ${
                    color === c ? "scale-125 ring-2 ring-foreground ring-offset-2 ring-offset-background" : "hover:scale-110"
                  }`}
                  style={{ backgroundColor: c }}
                  title={c}
                />
              ))}
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-7 h-7 rounded-md cursor-pointer border border-border bg-transparent p-0.5"
                title="Custom color"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">
              Rule & Policy Description
            </label>
            <textarea
              rows={2}
              placeholder="Explain the eligibility, submission notice, or guidelines for this leave..."
              value={rules}
              onChange={(e) => setRules(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all resize-none"
            />
          </div>
        </div>

        {/* Allocation & Refill Rules */}
        <div className="space-y-4 pt-2">
          <h3 className="text-xs font-bold text-foreground uppercase tracking-wider pb-1 border-b border-border/60">
            Allocation & Refill Policy
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">
                Default Allocated Days
              </label>
              <input
                type="number"
                min="0"
                step="0.5"
                value={defaultAllocation}
                onChange={(e) => setDefaultAllocation(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
              />
              <p className="text-[11px] text-muted-foreground mt-1">
                Days assigned to each employee per refill cycle.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">
                Refill Cycle
              </label>
              <select
                value={refillCycle}
                onChange={(e) => setRefillCycle(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all capitalize"
              >
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="yearly">Yearly</option>
              </select>
              <p className="text-[11px] text-muted-foreground mt-1">
                When employee balance automatically refills.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">
                Salary Deduction (%)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={salaryDeductionPercent}
                  onChange={(e) => setSalaryDeductionPercent(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                />
                <span className="text-sm font-semibold text-muted-foreground">%</span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">
                0% = Paid, 50% = Half-day, 100% = Unpaid.
              </p>
            </div>
          </div>

          {/* Carry Forward Settings */}
          <div className="p-4 rounded-xl border border-border/80 bg-muted/20 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-foreground block">
                  Allow Carry Forward
                </span>
                <span className="text-[11px] text-muted-foreground block">
                  Unused balance carries forward to the next period
                </span>
              </div>
              <input
                type="checkbox"
                checked={canCarryForward}
                onChange={(e) => setCanCarryForward(e.target.checked)}
                className="w-4 h-4 rounded border-border text-primary focus:ring-primary/20 cursor-pointer"
              />
            </div>

            {canCarryForward && (
              <div className="pt-2 border-t border-border/40">
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Maximum Carry Forward Days Limit (0 = Unlimited)
                </label>
                <input
                  type="number"
                  min="0"
                  value={carryForwardLimit}
                  onChange={(e) => setCarryForwardLimit(Number(e.target.value))}
                  className="w-48 px-3 py-1.5 text-sm rounded-lg border border-border bg-background text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                />
              </div>
            )}
          </div>
        </div>

        {/* Active Toggle */}
        <div className="flex items-center justify-between p-4 rounded-xl border border-border/80 bg-muted/20">
          <div>
            <span className="text-xs font-semibold text-foreground block">
              Active Status
            </span>
            <span className="text-[11px] text-muted-foreground block">
              Inactive leave types are hidden from employees in the application dialog
            </span>
          </div>
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="w-4 h-4 rounded border-border text-primary focus:ring-primary/20 cursor-pointer"
          />
        </div>
      </form>
    </div>
  );
}
