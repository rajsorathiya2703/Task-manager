"use client";

import { useState, useEffect } from "react";
import { format, startOfToday, endOfToday, startOfYesterday, endOfYesterday, startOfWeek, endOfWeek, startOfMonth, endOfMonth, parseISO } from "date-fns";
import { PageHeader } from "@/src/components/layout/PageHeader";
import { fetchTimeline } from "@/src/lib/api";
import { CompanyLink, useCompanyPath } from "@/src/lib/useCompanyPath";
import { ModuleGate, AccessDenied } from "@/src/components/access";
import { Loader2, Clock, Calendar, ArrowRight } from "lucide-react";

export default function TimelinePage() {
  const cp = useCompanyPath();
  const [filter, setFilter] = useState("today");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);

  useEffect(() => {
    loadTimeline();
  }, [filter, page]);

  const loadTimeline = async () => {
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

      const queryParams: any = { page };
      if (startDate && endDate) {
        queryParams.startDate = startDate;
        queryParams.endDate = endDate;
      }

      const resData = await fetchTimeline(queryParams);
      setData(resData);
    } catch (error: any) {
      console.error("Failed to fetch timeline", error);
      if (error?.response?.status === 403) {
        setAccessDenied(true);
      }
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
    <ModuleGate module="timeline">
      {accessDenied ? (
        <div className="flex flex-col h-full bg-background overflow-hidden items-center justify-center">
          <AccessDenied
            module="timeline"
            action="read"
            message="You do not have permission to view the timeline."
          />
        </div>
      ) : (
        <div className="flex flex-col h-full bg-background overflow-hidden">
          <PageHeader 
            title="Timeline" 
            breadcrumbs={[
              { label: "Timeline", href: cp("/timeline") }
            ]}
          />
          <div className="p-4 sm:p-6 lg:p-8 flex-1 overflow-y-auto custom-scrollbar">
            <div className="max-w-7xl mx-auto space-y-6">
              {/* Filter Pills */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar">
                {[
                  { key: "today", label: "Today" },
                  { key: "yesterday", label: "Yesterday" },
                  { key: "thisWeek", label: "This Week" },
                  { key: "thisMonth", label: "This Month" },
                  { key: "all", label: "All Time" },
                ].map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => { setFilter(key); setPage(1); }}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer shadow-xs ${
                      filter === key
                        ? "bg-carbon-black text-white dark:bg-bright-snow dark:text-carbon-black"
                        : "bg-card border border-border text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* Table Card */}
              <div className="bg-card border border-border rounded-xl overflow-hidden shadow-xs flex flex-col">
                <div className="overflow-x-auto custom-scrollbar">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs text-muted-foreground bg-muted/40 uppercase tracking-wider border-b border-border">
                      <tr>
                        <th className="px-6 py-3.5 font-semibold">Task</th>
                        <th className="px-6 py-3.5 font-semibold">Start Time</th>
                        <th className="px-6 py-3.5 font-semibold">Stop Time</th>
                        <th className="px-6 py-3.5 font-semibold text-right">Duration</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                      {loading ? (
                        <tr>
                          <td colSpan={4} className="px-6 py-12 text-center text-muted-foreground">
                            <div className="flex flex-col items-center justify-center gap-2">
                              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                              <span className="text-xs">Loading timeline logs...</span>
                            </div>
                          </td>
                        </tr>
                      ) : !data?.entries || data.entries.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-6 py-12 text-center text-muted-foreground">
                            <div className="flex flex-col items-center justify-center gap-1.5">
                              <Clock className="w-6 h-6 text-muted-foreground/60 mb-1" />
                              <span className="text-xs font-medium">No time logs found for this period.</span>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        data.entries.map((entry: any, i: number) => {
                          const startTime = entry.timeEntry?.startTime ? format(parseISO(entry.timeEntry.startTime), "MMM d, yyyy h:mm a") : "—";
                          const stopTime = entry.timeEntry?.stopTime ? format(parseISO(entry.timeEntry.stopTime), "MMM d, yyyy h:mm a") : "In Progress";
                          const durationSec = entry.timeEntry?.durationSeconds || 0;

                          return (
                            <tr key={i} className="hover:bg-muted/30 transition-colors">
                              <td className="px-6 py-4 font-semibold text-foreground">
                                <CompanyLink 
                                  href={`/tasks/${entry.taskId}`} 
                                  className="hover:text-primary transition-colors hover:underline inline-flex items-center gap-1.5"
                                >
                                  <span>{entry.title || "Untitled Task"}</span>
                                  <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                                </CompanyLink>
                              </td>
                              <td className="px-6 py-4 text-xs text-muted-foreground">
                                <div className="flex items-center gap-1.5">
                                  <Calendar className="w-3.5 h-3.5 text-muted-foreground/70" />
                                  <span>{startTime}</span>
                                </div>
                              </td>
                              <td className="px-6 py-4 text-xs text-muted-foreground">
                                <div className="flex items-center gap-1.5">
                                  <Calendar className="w-3.5 h-3.5 text-muted-foreground/70" />
                                  <span>{stopTime}</span>
                                </div>
                              </td>
                              <td className="px-6 py-4 text-right">
                                <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-muted/60 border border-border text-foreground font-semibold text-xs">
                                  {formatDuration(durationSec)}
                                </span>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
                
                {data && data.total > 0 && (
                  <div className="px-6 py-3.5 border-t border-border flex items-center justify-between bg-card shrink-0 text-xs">
                    <span className="text-muted-foreground font-medium">
                      Showing {((page - 1) * (data.limit || 10)) + 1} to {Math.min(page * (data.limit || 10), data.total)} of {data.total}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        disabled={page === 1}
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        className="px-3 py-1.5 border border-border bg-card rounded-lg font-medium text-foreground hover:bg-muted disabled:opacity-50 transition-colors cursor-pointer disabled:cursor-not-allowed shadow-xs"
                      >
                        Previous
                      </button>
                      <button
                        disabled={page * (data.limit || 10) >= data.total}
                        onClick={() => setPage(p => p + 1)}
                        className="px-3 py-1.5 border border-border bg-card rounded-lg font-medium text-foreground hover:bg-muted disabled:opacity-50 transition-colors cursor-pointer disabled:cursor-not-allowed shadow-xs"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </ModuleGate>
  );
}
