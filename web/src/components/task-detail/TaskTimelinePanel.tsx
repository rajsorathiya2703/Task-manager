"use client";

import { ChevronDown, Clock, Play } from "lucide-react";
import { TimeEntry } from "../../lib/data";

interface TaskTimelinePanelProps {
  timeEntries?: any[];
  isTimerRunning?: boolean;
  timerStartedAt?: string | Date;
  timerUser?: { name: string; avatarUrl?: string; email?: string };
  estimatedHours?: number;
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function formatDateTime(dateInput?: string | Date): string {
  if (!dateInput) return "";
  try {
    const d = new Date(dateInput);
    return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }) +
      " (" + d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) + ")";
  } catch {
    return "";
  }
}

export function TaskTimelinePanel({
  timeEntries = [],
  isTimerRunning = false,
  timerStartedAt,
  timerUser,
  estimatedHours = 0,
}: TaskTimelinePanelProps) {
  const estimatedSec = estimatedHours * 3600;
  let accumulatedSec = 0;

  const processedEntries = timeEntries.map((entry) => {
    if (estimatedSec <= 0) return entry;
    const remainingSec = Math.max(0, estimatedSec - accumulatedSec);
    const durationSeconds = Math.min(entry.durationSeconds || 0, remainingSec);
    accumulatedSec += durationSeconds;

    let stopTime = entry.stopTime;
    if (durationSeconds < (entry.durationSeconds || 0) && entry.startTime) {
      stopTime = new Date(new Date(entry.startTime).getTime() + durationSeconds * 1000);
    }

    return {
      ...entry,
      durationSeconds,
      stopTime,
    };
  });

  const rawTotal = processedEntries.reduce((acc, entry) => acc + (entry.durationSeconds || 0), 0);
  const totalSeconds = estimatedSec > 0 ? Math.min(rawTotal, estimatedSec) : rawTotal;

  return (
    <div className="border border-border rounded-xl bg-card overflow-hidden shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-border text-sm font-semibold text-foreground cursor-pointer hover:bg-muted/30 transition-colors">
        <div className="flex items-center gap-2">
          <ChevronDown className="w-4 h-4" />
          <Clock className="w-4 h-4 text-primary" />
          Timeline
          {processedEntries.length > 0 && (
            <span className="text-xs px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground font-normal">
              {processedEntries.length}
            </span>
          )}
        </div>
        <div className="text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-900/50">
          {formatDuration(totalSeconds)}
        </div>
      </div>

      {/* List View */}
      <div className="p-3 space-y-3">
        {/* Active Direct Timer Indicator */}
        {isTimerRunning && timerStartedAt && (
          <div className="flex items-center gap-2.5 p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg animate-pulse">
            <div className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0">
              <Play className="w-3 h-3 fill-current ml-0.5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 truncate">
                Task Timer Running...
              </div>
              <div className="text-[10px] text-muted-foreground truncate">
                Started by {timerUser?.name || "User"} at {formatDateTime(timerStartedAt)}
              </div>
            </div>
          </div>
        )}

        {processedEntries.length === 0 && !isTimerRunning ? (
          <div className="text-xs text-muted-foreground py-3 text-center italic">
            No time entries recorded yet.
          </div>
        ) : (
          <div className="flex flex-col divide-y divide-border/40">
            {processedEntries.map((entry, index) => {
              const userName = entry.user?.name || entry.user?.email || "User";

              return (
                <div key={entry._id || index} className="py-2.5 first:pt-0 last:pb-0 flex items-start gap-2.5">
                  <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center shrink-0 text-muted-foreground text-[10px] font-bold border border-border/50 mt-0.5">
                    {entry.user?.avatarUrl ? (
                      <img src={entry.user.avatarUrl} alt={userName} className="w-full h-full rounded-full object-cover" />
                    ) : (
                      userName.charAt(0).toUpperCase()
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-xs font-semibold text-foreground truncate">{userName}</span>
                      </div>
                      <span className="text-[11px] font-bold text-primary shrink-0 bg-primary/10 px-1.5 py-0.5 rounded-sm">
                        {formatDuration(entry.durationSeconds)}
                      </span>
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-0.5 flex flex-col gap-0.5">
                      <div>Start: {formatDateTime(entry.startTime)}</div>
                      <div>Stop: {formatDateTime(entry.stopTime)}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
