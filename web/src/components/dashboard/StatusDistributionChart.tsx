"use client";

import { PieChart } from "lucide-react";

interface StatusDistributionChartProps {
  data?: Array<{ status: string; count: number; pct: number }>;
}

const STATUS_COLORS: Record<string, string> = {
  "To Do": "#94a3b8", // Slate
  "In Progress": "#3b82f6", // Blue
  "In Review": "#f59e0b", // Amber
  "Done": "#10b981", // Emerald
  "Blocked": "#ef4444", // Red
};

const FALLBACK_COLORS = ["#8b5cf6", "#ec4899", "#14b8a6", "#6366f1", "#f97316"];

export function StatusDistributionChart({ data = [] }: StatusDistributionChartProps) {
  const totalTasks = data.reduce((sum, d) => sum + d.count, 0);

  // Donut SVG constants
  const size = 160;
  const strokeWidth = 24;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  let accumulatedPct = 0;
  const slices = data.map((item, idx) => {
    const color =
      STATUS_COLORS[item.status] || FALLBACK_COLORS[idx % FALLBACK_COLORS.length];
    const strokeDasharray = `${(item.pct / 100) * circumference} ${circumference}`;
    const strokeDashoffset = -((accumulatedPct / 100) * circumference);
    accumulatedPct += item.pct;
    return { ...item, color, strokeDasharray, strokeDashoffset };
  });

  return (
    <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm flex flex-col h-full min-h-[300px]">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            <PieChart className="w-4 h-4 text-blue-500" />
            Status Distribution
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Active task statuses across workspace
          </p>
        </div>
      </div>

      {totalTasks === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
          <PieChart className="w-8 h-8 mb-2 opacity-40" />
          <p className="text-xs">No task distribution data available.</p>
        </div>
      ) : (
        <div className="flex-1 flex flex-col sm:flex-row items-center justify-around gap-6">
          {/* Donut Chart */}
          <div className="relative flex items-center justify-center shrink-0">
            <svg width={size} height={size} className="transform -rotate-90">
              {/* Background circle */}
              <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="transparent"
                stroke="currentColor"
                strokeWidth={strokeWidth}
                className="text-muted/30"
              />

              {/* Data arcs */}
              {slices.map((slice, i) => (
                <circle
                  key={i}
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  fill="transparent"
                  stroke={slice.color}
                  strokeWidth={strokeWidth}
                  strokeDasharray={slice.strokeDasharray}
                  strokeDashoffset={slice.strokeDashoffset}
                  strokeLinecap="butt"
                  className="transition-all duration-700"
                />
              ))}
            </svg>

            {/* Center counter */}
            <div className="absolute flex flex-col items-center justify-center text-center">
              <span className="text-2xl font-black text-foreground">{totalTasks}</span>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Tasks
              </span>
            </div>
          </div>

          {/* Legend */}
          <div className="flex flex-col gap-2.5 w-full sm:w-auto">
            {slices.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between gap-4 text-xs">
                <div className="flex items-center gap-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="font-medium text-foreground">{item.status}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-foreground">{item.count}</span>
                  <span className="text-muted-foreground text-[11px]">({item.pct}%)</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
