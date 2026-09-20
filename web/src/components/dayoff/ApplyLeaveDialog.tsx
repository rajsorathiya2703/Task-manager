"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  X,
  Calendar,
  CalendarDays,
  AlertCircle,
  CheckCircle2,
  Clock,
  ChevronDown,
  Check,
} from "lucide-react";
import { Popover } from "@headlessui/react";
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";
import { formatDisplayDate } from "../../lib/utils";
import { applyForDayOff, fetchLeaveTypes, fetchMyLeaveBalances } from "../../lib/api";

interface ApplyLeaveDialogProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate?: string | null; // format YYYY-MM-DD
  initialLeaveTypeId?: string | null;
  onSuccess?: () => void;
}

type DurationType = "full" | "half_morning" | "half_afternoon" | "range";

const formatDateToISO = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const parseISODate = (str?: string | null): Date | undefined => {
  if (!str) return undefined;
  const parts = str.split("-");
  if (parts.length === 3) {
    return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
  }
  const d = new Date(str);
  return isNaN(d.getTime()) ? undefined : d;
};

export function ApplyLeaveDialog({
  isOpen,
  onClose,
  selectedDate,
  initialLeaveTypeId,
  onSuccess,
}: ApplyLeaveDialogProps) {
  const [leaveTypes, setLeaveTypes] = useState<any[]>([]);
  const [balances, setBalances] = useState<any[]>([]);
  const [selectedLeaveTypeId, setSelectedLeaveTypeId] = useState<string>("");
  const [durationType, setDurationType] = useState<DurationType>("full");
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");
  const [reason, setReason] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Initialize dates and load options
  useEffect(() => {
    if (isOpen) {
      setError(null);
      setSuccessMessage(null);
      const initialDate = selectedDate || new Date().toISOString().split("T")[0];
      setFromDate(initialDate);
      setToDate(initialDate);
      setDurationType("full");
      setReason("");
      setDescription("");

      // Fetch active leave types and employee balances
      Promise.all([
        fetchLeaveTypes(true).catch(() => []),
        fetchMyLeaveBalances(new Date(initialDate).getFullYear()).catch(() => []),
      ]).then(([types, bals]) => {
        setLeaveTypes(types || []);
        setBalances(bals || []);
        if (initialLeaveTypeId && types?.some((t: any) => t._id === initialLeaveTypeId)) {
          setSelectedLeaveTypeId(initialLeaveTypeId);
        } else if (types && types.length > 0) {
          setSelectedLeaveTypeId(types[0]._id);
        }
      });
    }
  }, [isOpen, selectedDate, initialLeaveTypeId]);

  const selectedLeaveType = useMemo(() => {
    return leaveTypes.find((lt) => lt._id === selectedLeaveTypeId);
  }, [leaveTypes, selectedLeaveTypeId]);

  const selectedBalance = useMemo(() => {
    if (!selectedLeaveTypeId) return null;
    return balances.find((b: any) => {
      const bId = b.leaveType?._id || b.leaveTypeId?._id || b.leaveTypeId;
      return bId?.toString() === selectedLeaveTypeId.toString();
    });
  }, [balances, selectedLeaveTypeId]);

  // Handle duration type presets
  const handleDurationChange = (type: DurationType) => {
    setDurationType(type);
    if (type === "full" || type === "half_morning" || type === "half_afternoon") {
      setToDate(fromDate);
    }
  };

  // Quick Date presets
  const setQuickDate = (preset: "today" | "tomorrow" | "next_week") => {
    const d = new Date();
    if (preset === "tomorrow") {
      d.setDate(d.getDate() + 1);
    } else if (preset === "next_week") {
      // Find next Monday
      const day = d.getDay();
      const diff = d.getDate() + (day === 0 ? 1 : 8 - day);
      d.setDate(diff);
    }
    const dateStr = formatDateToISO(d);
    setFromDate(dateStr);
    if (durationType !== "range") {
      setToDate(dateStr);
    }
  };

  // Duration in days calculation
  const calculatedDays = useMemo(() => {
    if (
      durationType === "half_morning" ||
      durationType === "half_afternoon" ||
      selectedLeaveType?.code === "HALF_DAY"
    ) {
      return 0.5;
    }
    if (!fromDate || !toDate) return 1;
    const start = parseISODate(fromDate);
    const end = parseISODate(toDate);
    if (!start || !end || start > end) return 0;
    const diffMs = end.getTime() - start.getTime();
    return Math.round(diffMs / (1000 * 60 * 60 * 24)) + 1;
  }, [fromDate, toDate, durationType, selectedLeaveType]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (!selectedLeaveTypeId) {
      setError("Please select a leave type.");
      return;
    }
    if (!fromDate || !toDate) {
      setError("Please specify both From and To dates.");
      return;
    }
    if (new Date(fromDate) > new Date(toDate)) {
      setError("From Date cannot be later than To Date.");
      return;
    }
    if (!reason.trim()) {
      setError("Please enter a reason for the leave.");
      return;
    }

    const isHalf =
      durationType === "half_morning" ||
      durationType === "half_afternoon" ||
      selectedLeaveType?.code === "HALF_DAY";
    const sessionNote =
      durationType === "half_morning"
        ? " (Morning Half)"
        : durationType === "half_afternoon"
        ? " (Afternoon Half)"
        : "";

    try {
      setLoading(true);
      await applyForDayOff({
        leaveTypeId: selectedLeaveTypeId,
        fromDate,
        toDate: isHalf ? fromDate : toDate,
        reason: `${reason.trim()}${sessionNote}`,
        description: description.trim(),
        isHalfDay: isHalf,
      });

      setSuccessMessage(
        "Your leave application has been submitted! An approval email has been sent to the administrator."
      );
      setTimeout(() => {
        onSuccess?.();
        onClose();
      }, 1500);
    } catch (err: any) {
      const msg =
        err.response?.data?.message || err.message || "Failed to submit leave application.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl rounded-2xl border border-border bg-card shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">Apply for Day Off</h2>
              <p className="text-xs text-muted-foreground">Submit a leave request for administrative approval</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto flex-1">
          {error && (
            <div className="flex items-start gap-2.5 p-3.5 text-xs rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {successMessage && (
            <div className="flex items-start gap-2.5 p-3.5 text-xs rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Styled Leave Type Dropdown Selector */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-foreground uppercase tracking-wider">
                Leave Type <span className="text-red-500">*</span>
              </label>
              {selectedBalance && (
                <span className="text-xs text-muted-foreground font-medium">
                  Available: <strong className="text-primary font-bold">{selectedBalance.remaining}</strong> days left
                </span>
              )}
            </div>

            <Popover className="relative w-full">
              {({ open, close }) => (
                <>
                  <Popover.Button
                    type="button"
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl border bg-background text-foreground transition-all outline-none text-left cursor-pointer ${
                      open
                        ? "border-primary ring-2 ring-primary/20 shadow-xs"
                        : "border-border hover:border-border/80 hover:bg-muted/30"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {selectedLeaveType ? (
                        <>
                          <span
                            className="w-3 h-3 rounded-full shrink-0"
                            style={{ backgroundColor: selectedLeaveType.color || "#3b82f6" }}
                          />
                          <span className="text-sm font-semibold text-foreground truncate">
                            {selectedLeaveType.name}
                          </span>
                          {selectedLeaveType.code && (
                            <span className="font-mono text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded shrink-0">
                              {selectedLeaveType.code}
                            </span>
                          )}
                        </>
                      ) : (
                        <span className="text-sm text-muted-foreground">Select a leave type...</span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {selectedLeaveType && (
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            selectedLeaveType.salaryDeductionPercent === 0
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                              : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                          }`}
                        >
                          {selectedLeaveType.salaryDeductionPercent === 0
                            ? "Paid"
                            : `${selectedLeaveType.salaryDeductionPercent}% cut`}
                        </span>
                      )}
                      <ChevronDown
                        className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${
                          open ? "transform rotate-180 text-foreground" : ""
                        }`}
                      />
                    </div>
                  </Popover.Button>

                  <Popover.Panel
                    anchor="bottom start"
                    className="w-[var(--button-width)] min-w-[280px] bg-card border border-border rounded-2xl shadow-2xl z-50 p-2 outline-none max-h-64 overflow-y-auto mt-1"
                  >
                    <div className="space-y-1">
                      {leaveTypes.map((lt) => {
                        const isSelected = lt._id === selectedLeaveTypeId;
                        const bal = balances.find((b: any) => {
                          const bId = b.leaveType?._id || b.leaveTypeId?._id || b.leaveTypeId;
                          return bId?.toString() === lt._id?.toString();
                        });
                        const rem =
                          bal?.remaining !== undefined ? bal.remaining : lt.defaultAllocation;
                        const isPaid = lt.salaryDeductionPercent === 0;

                        return (
                          <button
                            key={lt._id}
                            type="button"
                            onClick={() => {
                              setSelectedLeaveTypeId(lt._id);
                              close();
                            }}
                            className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left transition-all cursor-pointer ${
                              isSelected
                                ? "bg-primary/10 text-primary font-bold shadow-xs"
                                : "hover:bg-muted/70 text-foreground"
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span
                                className="w-3 h-3 rounded-full shrink-0"
                                style={{ backgroundColor: lt.color || "#3b82f6" }}
                              />
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-xs font-semibold truncate">{lt.name}</span>
                                  {lt.code && (
                                    <span className="text-[10px] font-mono text-muted-foreground">
                                      ({lt.code})
                                    </span>
                                  )}
                                </div>
                                {lt.rules && (
                                  <div className="text-[10px] text-muted-foreground truncate max-w-xs mt-0.5">
                                    {lt.rules}
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                  isPaid
                                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                    : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                                }`}
                              >
                                {isPaid ? "Paid" : `${lt.salaryDeductionPercent}% cut`}
                              </span>
                              <span className="text-[11px] font-semibold text-muted-foreground">
                                {rem}d left
                              </span>
                              {isSelected && <Check className="w-3.5 h-3.5 text-primary ml-0.5" />}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </Popover.Panel>
                </>
              )}
            </Popover>

            {/* Selected Leave Type Context Pill */}
            {selectedLeaveType && (
              <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl bg-muted/40 border border-border/60 text-xs animate-in fade-in">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: selectedLeaveType.color || "#3b82f6" }}
                  />
                  <span className="font-semibold text-foreground truncate">
                    {selectedLeaveType.name}
                  </span>
                  {selectedLeaveType.code && (
                    <span className="font-mono text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded shrink-0">
                      {selectedLeaveType.code}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      selectedLeaveType.salaryDeductionPercent === 0
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                        : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                    }`}
                  >
                    {selectedLeaveType.salaryDeductionPercent === 0
                      ? "Paid Leave"
                      : `${selectedLeaveType.salaryDeductionPercent}% Salary Cut`}
                  </span>
                  <span className="text-[10px] text-muted-foreground bg-card border border-border px-2 py-0.5 rounded-full capitalize">
                    Refill: {selectedLeaveType.refillCycle || "Yearly"}
                  </span>
                  {selectedBalance && (
                    <span className="text-[11px] font-bold text-foreground">
                      {selectedBalance.remaining}d left
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Duration Preset Chips */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-foreground uppercase tracking-wider">
              Duration Mode
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: "full", label: "Full Day (1d)" },
                { id: "half_morning", label: "Morning (0.5d)" },
                { id: "half_afternoon", label: "Afternoon (0.5d)" },
                { id: "range", label: "Date Range" },
              ].map((chip) => (
                <button
                  key={chip.id}
                  type="button"
                  onClick={() => handleDurationChange(chip.id as DurationType)}
                  className={`
                    py-2 px-2.5 rounded-xl border text-xs font-semibold transition-all text-center cursor-pointer
                    ${
                      durationType === chip.id
                        ? "bg-foreground text-background border-foreground shadow-xs"
                        : "bg-card border-border/70 hover:bg-muted text-muted-foreground hover:text-foreground"
                    }
                  `}
                >
                  {chip.label}
                </button>
              ))}
            </div>
          </div>

          {/* Quick Date Presets */}
          <div className="flex items-center gap-2 text-xs">
            <span className="text-muted-foreground font-medium text-[11px]">Quick Jump:</span>
            <button
              type="button"
              onClick={() => setQuickDate("today")}
              className="px-2 py-0.5 rounded-md bg-muted text-muted-foreground hover:text-foreground text-[11px] font-medium transition-colors cursor-pointer"
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => setQuickDate("tomorrow")}
              className="px-2 py-0.5 rounded-md bg-muted text-muted-foreground hover:text-foreground text-[11px] font-medium transition-colors cursor-pointer"
            >
              Tomorrow
            </button>
            <button
              type="button"
              onClick={() => setQuickDate("next_week")}
              className="px-2 py-0.5 rounded-md bg-muted text-muted-foreground hover:text-foreground text-[11px] font-medium transition-colors cursor-pointer"
            >
              Next Week
            </button>
          </div>

          {/* Styled Date Picker (Popover + DayPicker) */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-foreground uppercase tracking-wider">
              {durationType === "range" ? "Date Range" : "Leave Date"} <span className="text-red-500">*</span>
            </label>

            {durationType !== "range" ? (
              /* Single Date Picker */
              <Popover className="relative w-full">
                {({ open, close }) => (
                  <>
                    <Popover.Button
                      type="button"
                      className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl border bg-background text-foreground transition-all outline-none text-left cursor-pointer ${
                        open
                          ? "border-primary ring-2 ring-primary/20 shadow-xs"
                          : "border-border hover:border-border/80 hover:bg-muted/30"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <CalendarDays className="w-4 h-4 text-primary shrink-0" />
                        <span className="text-sm font-semibold text-foreground">
                          {fromDate ? formatDisplayDate(fromDate) : "Select date..."}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-bold text-muted-foreground capitalize bg-muted px-2 py-0.5 rounded-md">
                          {durationType === "half_morning"
                            ? "Morning Half"
                            : durationType === "half_afternoon"
                            ? "Afternoon Half"
                            : "Full Day"}
                        </span>
                        <ChevronDown
                          className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${
                            open ? "transform rotate-180 text-foreground" : ""
                          }`}
                        />
                      </div>
                    </Popover.Button>

                    <Popover.Panel
                      anchor="bottom start"
                      className="bg-card border border-border rounded-2xl shadow-2xl z-50 p-3 outline-none mt-1"
                    >
                      <div className="px-2 py-1 mb-2 text-[11px] font-semibold text-muted-foreground border-b border-border flex items-center justify-between">
                        <span>Select Leave Date</span>
                        <span className="text-[10px] text-primary font-bold">
                          {formatDisplayDate(fromDate)}
                        </span>
                      </div>
                      <DayPicker
                        mode="single"
                        selected={parseISODate(fromDate)}
                        onSelect={(date) => {
                          if (date) {
                            const dStr = formatDateToISO(date);
                            setFromDate(dStr);
                            setToDate(dStr);
                            close();
                          }
                        }}
                        className="!m-0 text-xs"
                        style={
                          {
                            "--rdp-cell-size": "32px",
                            "--rdp-caption-font-size": "13px",
                            "--rdp-nav-height": "32px",
                          } as React.CSSProperties
                        }
                        modifiersClassNames={{
                          selected: "bg-primary text-primary-foreground font-bold rounded-full",
                        }}
                      />
                    </Popover.Panel>
                  </>
                )}
              </Popover>
            ) : (
              /* Date Range Picker */
              <Popover className="relative w-full">
                {({ open }) => (
                  <>
                    <Popover.Button
                      type="button"
                      className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl border bg-background text-foreground transition-all outline-none text-left cursor-pointer ${
                        open
                          ? "border-primary ring-2 ring-primary/20 shadow-xs"
                          : "border-border hover:border-border/80 hover:bg-muted/30"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <CalendarDays className="w-4 h-4 text-primary shrink-0" />
                        <span className="text-sm font-semibold text-foreground truncate">
                          {formatDisplayDate(fromDate, toDate) || "Select timeline..."}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[11px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                          {calculatedDays} day{calculatedDays !== 1 ? "s" : ""}
                        </span>
                        <ChevronDown
                          className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${
                            open ? "transform rotate-180 text-foreground" : ""
                          }`}
                        />
                      </div>
                    </Popover.Button>

                    <Popover.Panel
                      anchor="bottom start"
                      className="bg-card border border-border rounded-2xl shadow-2xl z-50 p-3 outline-none mt-1"
                    >
                      <div className="px-2 py-1 mb-2 text-[11px] font-semibold text-muted-foreground border-b border-border flex items-center justify-between">
                        <span>Select Start Date → End Date</span>
                        <span className="text-[10px] text-primary font-bold">
                          {calculatedDays} days selected
                        </span>
                      </div>
                      <DayPicker
                        mode="range"
                        selected={{
                          from: parseISODate(fromDate),
                          to: parseISODate(toDate),
                        }}
                        onSelect={(range: any) => {
                          if (range?.from) {
                            const fromStr = formatDateToISO(range.from);
                            setFromDate(fromStr);
                            if (range.to) {
                              setToDate(formatDateToISO(range.to));
                            } else {
                              setToDate(fromStr);
                            }
                          }
                        }}
                        className="!m-0 text-xs"
                        style={
                          {
                            "--rdp-cell-size": "32px",
                            "--rdp-caption-font-size": "13px",
                            "--rdp-nav-height": "32px",
                          } as React.CSSProperties
                        }
                        modifiersClassNames={{
                          selected: "bg-primary text-primary-foreground font-bold rounded-full",
                          range_start: "bg-primary text-primary-foreground font-bold rounded-l-full",
                          range_end: "bg-primary text-primary-foreground font-bold rounded-r-full",
                          range_middle: "bg-primary/10 text-foreground font-medium rounded-none",
                        }}
                      />
                    </Popover.Panel>
                  </>
                )}
              </Popover>
            )}
          </div>

          {/* Calculated Total Indicator */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-muted/40 border border-border/60 text-xs">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" />
              <span className="text-muted-foreground">Total requested duration:</span>
            </div>
            <span className="font-extrabold text-foreground text-sm">
              {calculatedDays} day{calculatedDays !== 1 ? "s" : ""}
            </span>
          </div>

          {/* Reason of Day Off */}
          <div>
            <label className="block text-xs font-bold text-foreground uppercase tracking-wider mb-1">
              Reason of Day Off <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Doctor's appointment, Personal emergency, Annual vacation"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-border bg-background text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all placeholder:text-muted-foreground"
              required
            />
          </div>

          {/* Additional Notes */}
          <div>
            <label className="block text-xs font-bold text-foreground uppercase tracking-wider mb-1">
              Short Description / Coverage Notes <span className="text-muted-foreground font-normal lowercase">(optional)</span>
            </label>
            <textarea
              rows={2}
              placeholder="Mention any task handover or emergency contact info..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-border bg-background text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all placeholder:text-muted-foreground resize-none"
            />
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-xs font-semibold rounded-xl border border-border hover:bg-muted text-foreground transition-colors disabled:opacity-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || Boolean(successMessage)}
              className="px-5 py-2 text-xs font-bold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-xs flex items-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {loading && <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />}
              Submit Leave Request
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
