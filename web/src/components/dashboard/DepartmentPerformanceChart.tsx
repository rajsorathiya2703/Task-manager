"use client";

import { Building2 } from "lucide-react";

interface DepartmentPerformanceChartProps {
  data?: Array<{ department: string; tasksCompleted: number }>;
}

const DEPT_COLORS = [
  "from-indigo-500 to-purple-500",
  "from-blue-500 to-cyan-500",
  "from-emerald-500 to-teal-500",
  "from-amber-500 to-orange-500",
  "from-pink-500 to-rose-500",
  "from-violet-500 to-indigo-500",
];

export function DepartmentPerformanceChart({ data = [] }: DepartmentPerformanceChartProps) {
  const maxVal = Math.max(...data.map((d) => d.tasksCompleted), 1);

  return (
    <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            <Building2 className="w-4 h-4 text-indigo-500" />
            Department Performance
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Tasks completed grouped by department
          </p>
        </div>
      </div>

      {data.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
          <Building2 className="w-8 h-8 mb-2 opacity-40" />
          <p className="text-xs">No department performance data available.</p>
        </div>
      ) : (
        <div className="space-y-3.5 flex-1 flex flex-col justify-center">
          {data.map((item, idx) => {
            const pct = Math.round((item.tasksCompleted / maxVal) * 100);
            const colorClass = DEPT_COLORS[idx % DEPT_COLORS.length];

            return (
              <div key={item.department || idx} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-foreground truncate max-w-[180px]">
                    {item.department || "General"}
                  </span>
                  <span className="font-bold text-foreground bg-muted px-2 py-0.5 rounded-md text-[11px]">
                    {item.tasksCompleted} tasks
                  </span>
                </div>
                <div className="w-full h-2.5 bg-muted/60 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full bg-gradient-to-r ${colorClass} transition-all duration-500`}
                    style={{ width: `${Math.max(pct, 4)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
