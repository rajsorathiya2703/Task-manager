"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

export interface RecordNavigatorProps {
  current: number; // 1-based index (n)
  total: number;   // total count (m)
  onPrev: () => void;
  onNext: () => void;
  hasPrev?: boolean;
  hasNext?: boolean;
  disabled?: boolean;
  className?: string;
}

export function RecordNavigator({
  current,
  total,
  onPrev,
  onNext,
  hasPrev = current > 1,
  hasNext = current < total && total > 0,
  disabled = false,
  className = "",
}: RecordNavigatorProps) {
  if (total <= 0) return null;

  return (
    <div
      className={`inline-flex items-center border border-border rounded-md bg-card shadow-xs text-xs font-medium overflow-hidden select-none ${className}`}
    >
      {/* Previous Button (<) */}
      <button
        type="button"
        onClick={onPrev}
        disabled={disabled || !hasPrev}
        className="px-2 py-1.5 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors disabled:opacity-30 disabled:hover:bg-transparent disabled:cursor-not-allowed flex items-center justify-center cursor-pointer"
        title="Previous record"
      >
        <ChevronLeft className="w-3.5 h-3.5" />
      </button>

      {/* Divider */}
      <span className="w-[1px] h-3.5 bg-border/80" />

      {/* Record Counter (n / m) */}
      <span className="px-2.5 py-1 text-xs text-foreground font-medium whitespace-nowrap min-w-[54px] text-center">
        {current > 0 ? current : 1} / {total}
      </span>

      {/* Divider */}
      <span className="w-[1px] h-3.5 bg-border/80" />

      {/* Next Button (>) */}
      <button
        type="button"
        onClick={onNext}
        disabled={disabled || !hasNext}
        className="px-2 py-1.5 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors disabled:opacity-30 disabled:hover:bg-transparent disabled:cursor-not-allowed flex items-center justify-center cursor-pointer"
        title="Next record"
      >
        <ChevronRight className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
