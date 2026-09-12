"use client";

import { useState } from "react";
import { TrendingUp, Calendar } from "lucide-react";

interface CompletionTrendChartProps {
  data?: Array<{ date: string; completed: number }>;
}

export function CompletionTrendChart({ data = [] }: CompletionTrendChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const totalCompleted = data.reduce((sum, d) => sum + d.completed, 0);
  const maxVal = Math.max(...data.map((d) => d.completed), 5);

  const chartHeight = 180;
  const chartWidth = 500;
  const paddingX = 40;
  const paddingY = 20;

  const points = data.map((item, idx) => {
    const x =
      data.length > 1
        ? paddingX + (idx / (data.length - 1)) * (chartWidth - paddingX * 2)
        : chartWidth / 2;
    const y =
      chartHeight - paddingY - (item.completed / maxVal) * (chartHeight - paddingY * 2);
    return { x, y, item, idx };
  });

  const pathD = points.length
    ? points.reduce(
        (acc, p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`),
        ""
      )
    : "";

  const areaD = points.length
    ? `${pathD} L ${points[points.length - 1].x} ${chartHeight - paddingY} L ${points[0].x} ${chartHeight - paddingY} Z`
    : "";

  return (
    <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm flex flex-col h-full min-h-[300px]">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-500" />
            Completion Trend
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Daily throughput of completed tasks
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
            {totalCompleted} Total Completed
          </span>
        </div>
      </div>

      {data.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
          <Calendar className="w-8 h-8 mb-2 opacity-40" />
          <p className="text-xs">No completion data recorded in this period.</p>
        </div>
      ) : (
        <div className="relative flex-1 flex flex-col justify-end">
          <svg
            viewBox={`0 0 ${chartWidth} ${chartHeight}`}
            className="w-full h-48 overflow-visible"
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id="completionGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Grid lines */}
            {[0, 0.33, 0.66, 1].map((pct, i) => {
              const y = chartHeight - paddingY - pct * (chartHeight - paddingY * 2);
              return (
                <line
                  key={i}
                  x1={paddingX}
                  y1={y}
                  x2={chartWidth - paddingX}
                  y2={y}
                  stroke="currentColor"
                  className="text-border/40"
                  strokeDasharray="4 4"
                  strokeWidth="1"
                />
              );
            })}

            {/* Area */}
            {areaD && <path d={areaD} fill="url(#completionGrad)" />}

            {/* Line */}
            {pathD && (
              <path
                d={pathD}
                fill="none"
                stroke="#10b981"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}

            {/* Data Points */}
            {points.map((p) => {
              const isHovered = hoveredIndex === p.idx;
              return (
                <g key={p.idx}>
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={isHovered ? 6 : 4}
                    className="fill-card stroke-emerald-500 transition-all cursor-pointer"
                    strokeWidth={isHovered ? 3 : 2}
                    onMouseEnter={() => setHoveredIndex(p.idx)}
                    onMouseLeave={() => setHoveredIndex(null)}
                  />
                </g>
              );
            })}
          </svg>

          {/* Hover Tooltip display */}
          {hoveredIndex !== null && points[hoveredIndex] && (
            <div className="absolute top-2 right-2 bg-popover/90 backdrop-blur-md border border-border px-3 py-1.5 rounded-lg shadow-lg text-xs animate-in fade-in">
              <span className="font-semibold text-foreground">
                {points[hoveredIndex].item.date}:{" "}
              </span>
              <span className="text-emerald-500 font-bold">
                {points[hoveredIndex].item.completed} completed
              </span>
            </div>
          )}

          {/* X Axis Labels */}
          <div className="flex justify-between items-center px-4 pt-2 text-[10px] text-muted-foreground border-t border-border/40">
            <span>{data[0]?.date}</span>
            {data.length > 2 && <span>{data[Math.floor(data.length / 2)]?.date}</span>}
            <span>{data[data.length - 1]?.date}</span>
          </div>
        </div>
      )}
    </div>
  );
}
