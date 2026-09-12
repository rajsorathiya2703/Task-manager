"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/src/components/layout/PageHeader";
import { EmployeeProfileStreakCard } from "@/src/components/dashboard/EmployeeProfileStreakCard";
import { EmployeeWorkingHoursChart } from "@/src/components/dashboard/EmployeeWorkingHoursChart";
import { KpiCardsGrid } from "@/src/components/dashboard/KpiCardsGrid";
import { CompletionTrendChart } from "@/src/components/dashboard/CompletionTrendChart";
import { StatusDistributionChart } from "@/src/components/dashboard/StatusDistributionChart";
import { LiveActivityFeed } from "@/src/components/dashboard/LiveActivityFeed";
import { fetchEmployeeActivity } from "@/src/lib/api";
import { Loader2, RefreshCw } from "lucide-react";

export default function DashboardPage() {
  const [range, setRange] = useState<"weekly" | "monthly">("weekly");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadDashboard = async (showSpinner = true) => {
    if (showSpinner) setLoading(true);
    else setIsRefreshing(true);

    try {
      const res = await fetchEmployeeActivity(range);
      setData(res);
    } catch (err) {
      console.error("Failed to load dashboard activity", err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadDashboard(true);
  }, [range]);

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden">
      <PageHeader title="Activity Dashboard" />

      <div className="p-6 flex-1 overflow-y-auto custom-scrollbar space-y-6">
        {/* Controls Toolbar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-card p-4 rounded-2xl border border-border/60 shadow-sm">
          <div>
            <h2 className="text-base font-bold text-foreground">Employee Activity Overview</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Aggregated productivity metrics, time logs & department analytics
            </p>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            {/* Weekly / Monthly Toggle */}
            <div className="flex items-center bg-muted p-1 rounded-xl border border-border/50 text-xs font-semibold">
              <button
                onClick={() => setRange("weekly")}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  range === "weekly"
                    ? "bg-card text-foreground shadow-sm font-bold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Weekly
              </button>
              <button
                onClick={() => setRange("monthly")}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  range === "monthly"
                    ? "bg-card text-foreground shadow-sm font-bold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Monthly
              </button>
            </div>

            {/* Refresh Button */}
            <button
              onClick={() => loadDashboard(false)}
              disabled={loading || isRefreshing}
              className="p-2 rounded-xl border border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground transition-colors shadow-sm disabled:opacity-50"
              title="Refresh dashboard data"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin text-primary" : ""}`} />
            </button>
          </div>
        </div>

        {loading && !data ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <Loader2 className="w-8 h-8 animate-spin text-primary mb-3" />
            <p className="text-sm font-medium">Computing aggregated analytics & activity heatmap...</p>
          </div>
        ) : (
          <>
            {/* 1. TOP SECTION: Employee Profile & GitHub-Style Heatmap */}
            <EmployeeProfileStreakCard
              selectedEmployee={data?.selectedEmployee}
              yearlyActivity={data?.employeeYearlyActivity}
            />

            {/* 2. Employee Daily Working Hours Chart */}
            <EmployeeWorkingHoursChart
              data={data?.employeeDailyHours}
              employeeName={data?.selectedEmployee?.name || "Employee"}
              range={range}
            />

            {/* 3. KPI Cards Grid */}
            <KpiCardsGrid kpis={data?.kpis} />

            {/* 4 & 5. Completion Trend + Status Distribution side by side */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">
              <CompletionTrendChart data={data?.completionTrend} />
              <StatusDistributionChart data={data?.statusDistribution} />
            </div>

            {/* 6. Sixth Row: Live Timers & Recent Activity */}
            <LiveActivityFeed
              liveNow={data?.liveNow}
              recentActivity={data?.recentActivity}
              selectedEmployee={data?.selectedEmployee}
            />
          </>
        )}
      </div>
    </div>
  );
}

