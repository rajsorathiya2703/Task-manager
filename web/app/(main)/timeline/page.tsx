"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { format, startOfToday, endOfToday, startOfYesterday, endOfYesterday, startOfWeek, endOfWeek, startOfMonth, endOfMonth, parseISO } from "date-fns";
import { PageHeader } from "@/src/components/layout/PageHeader";
import { api } from "@/src/lib/api";

export default function TimelinePage() {
  const [filter, setFilter] = useState("today");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTimeline();
  }, [filter, page]);

  const fetchTimeline = async () => {
    setLoading(true);
    try {
      let startDate = "";
      let endDate = "";

      const now = new Date();
      if (filter === "today") {
        startDate = startOfToday().toISOString();
        endDate = endOfToday().toISOString();
      } else if (filter === "yesterday") {
        startDate = startOfYesterday().toISOString();
        endDate = endOfYesterday().toISOString();
      } else if (filter === "thisWeek") {
        startDate = startOfWeek(now, { weekStartsOn: 1 }).toISOString();
        endDate = endOfWeek(now, { weekStartsOn: 1 }).toISOString();
      } else if (filter === "thisMonth") {
        startDate = startOfMonth(now).toISOString();
        endDate = endOfMonth(now).toISOString();
      }

      const queryParams = new URLSearchParams({ page: page.toString() });
      if (startDate && endDate) {
        queryParams.append("startDate", startDate);
        queryParams.append("endDate", endDate);
      }

      const res = await api.get(`/tasks/timeline?${queryParams.toString()}`);
      setData(res.data);
    } catch (error) {
      console.error("Failed to fetch timeline", error);
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  };

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden">
      <PageHeader title="Timeline" />
      <div className="p-6 flex-1 overflow-auto">
        <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
          {["today", "yesterday", "thisWeek", "thisMonth", "all"].map((f) => (
            <button
              key={f}
              onClick={() => { setFilter(f); setPage(1); }}
              className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${filter === f ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
            >
              {f === "today" ? "Today" : f === "yesterday" ? "Yesterday" : f === "thisWeek" ? "This Week" : f === "thisMonth" ? "This Month" : "All Time"}
            </button>
          ))}
        </div>

        <div className="bg-card border border-border rounded-lg overflow-hidden shadow-sm flex flex-col">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground bg-muted/50 uppercase border-b border-border">
                <tr>
                  <th className="px-6 py-3 font-medium">Task</th>
                  <th className="px-6 py-3 font-medium">Start Time</th>
                  <th className="px-6 py-3 font-medium">Stop Time</th>
                  <th className="px-6 py-3 font-medium text-right">Duration</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-muted-foreground">Loading...</td>
                  </tr>
                ) : data?.entries?.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-muted-foreground">No time logs found for this period.</td>
                  </tr>
                ) : (
                  data?.entries?.map((entry: any, i: number) => (
                    <tr key={i} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                      <td className="px-6 py-4 font-medium text-foreground">
                        <Link href={`/tasks/${entry.taskId}`} className="hover:underline">
                          {entry.title}
                        </Link>
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">{format(parseISO(entry.timeEntry.startTime), "MMM d, yyyy h:mm a")}</td>
                      <td className="px-6 py-4 text-muted-foreground">{format(parseISO(entry.timeEntry.stopTime), "MMM d, yyyy h:mm a")}</td>
                      <td className="px-6 py-4 text-right font-medium">{formatDuration(entry.timeEntry.durationSeconds)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          
          {data && data.total > 0 && (
            <div className="px-6 py-4 border-t border-border flex items-center justify-between bg-card shrink-0">
              <span className="text-sm text-muted-foreground">
                Showing {((page - 1) * data.limit) + 1} to {Math.min(page * data.limit, data.total)} of {data.total}
              </span>
              <div className="flex gap-2">
                <button
                  disabled={page === 1}
                  onClick={() => setPage(p => p - 1)}
                  className="px-3 py-1 border border-border rounded text-sm disabled:opacity-50 hover:bg-muted"
                >
                  Previous
                </button>
                <button
                  disabled={page * data.limit >= data.total}
                  onClick={() => setPage(p => p + 1)}
                  className="px-3 py-1 border border-border rounded text-sm disabled:opacity-50 hover:bg-muted"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
