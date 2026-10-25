"use client";

import { useMemo } from "react";
import { History, Activity as ActivityIcon } from "lucide-react";

export interface ProjectActivityPanelProps {
  updates?: any[];
  projectId?: string;
}

function formatRelativeTime(dateInput: string | Date): string {
  try {
    const date = new Date(dateInput);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHours = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSec < 60) return "Just now";
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch {
    return "";
  }
}

export function ProjectActivityPanel({
  updates = [],
}: ProjectActivityPanelProps) {
  const sortedUpdates = useMemo(() => {
    return [...updates].sort((a, b) => {
      const timeA = new Date(a.timestamp || a.createdAt || Date.now()).getTime();
      const timeB = new Date(b.timestamp || b.createdAt || Date.now()).getTime();
      return timeB - timeA; // Most recent first
    });
  }, [updates]);

  const updateCount = sortedUpdates.length;

  return (
    <div className="flex flex-col h-full bg-background border-l border-border/60">
      {/* Activity Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/60 shrink-0">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-muted-foreground" />
          <h2 className="text-sm font-bold text-foreground">Activity</h2>
        </div>
        <div className="flex items-center gap-1.5 bg-muted/50 px-2.5 py-1 rounded-lg border border-border/50 text-xs font-semibold text-foreground">
          <span>Updates</span>
          <span className="w-4 h-4 rounded-full bg-primary/20 text-primary text-[10px] flex items-center justify-center font-bold">
            {updateCount}
          </span>
        </div>
      </div>

      {/* Updates Stream */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3.5">
        {sortedUpdates.length === 0 ? (
          <div className="border border-dashed border-border/80 rounded-2xl p-8 flex flex-col items-center justify-center text-center text-xs text-muted-foreground bg-card/30 space-y-2 mt-4">
            <div className="w-10 h-10 rounded-xl bg-muted/60 text-muted-foreground flex items-center justify-center">
              <ActivityIcon className="w-5 h-5 opacity-60" />
            </div>
            <p className="font-semibold text-foreground">No activity recorded yet.</p>
            <p className="text-[11px] text-muted-foreground max-w-[200px]">
              Status transitions, timeline adjustments, and field updates will appear here automatically.
            </p>
          </div>
        ) : (
          sortedUpdates.map((upd, idx) => {
            const userName = upd.user?.name || "System";
            const initial = userName.charAt(0).toUpperCase() || "U";
            const timestamp = upd.timestamp || upd.createdAt || Date.now();
            const timeAgo = formatRelativeTime(new Date(timestamp));

            return (
              <div key={upd._id || upd.id || idx} className="flex items-start gap-2.5 text-xs group">
                {/* User avatar badge */}
                <div className="w-6 h-6 rounded-md bg-carbon-black text-white dark:bg-muted dark:text-bright-snow font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5 border border-border/50 shadow-xs">
                  {initial}
                </div>

                {/* Content box */}
                <div className="flex-1 min-w-0 bg-card border border-border/80 rounded-xl p-3 shadow-xs">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-foreground text-xs truncate max-w-[150px]">
                      {userName}
                    </span>
                    <span className="text-[10px] text-muted-foreground shrink-0">{timeAgo}</span>
                  </div>

                  <div className="text-foreground text-xs leading-relaxed">
                    {upd.message || "Updated project details"}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
