"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/src/components/layout/PageHeader";
import { EmployeeProfileStreakCard } from "@/src/components/dashboard/EmployeeProfileStreakCard";
import { EmployeeWorkingHoursChart } from "@/src/components/dashboard/EmployeeWorkingHoursChart";
import { KpiCardsGrid } from "@/src/components/dashboard/KpiCardsGrid";
import { CompletionTrendChart } from "@/src/components/dashboard/CompletionTrendChart";
import { StatusDistributionChart } from "@/src/components/dashboard/StatusDistributionChart";
import { LiveActivityFeed } from "@/src/components/dashboard/LiveActivityFeed";
import { fetchEmployeeActivity, fetchMe } from "@/src/lib/api";
import { Loader2, RefreshCw, ShieldAlert, ArrowRight, AlertCircle } from "lucide-react";

export default function DashboardPage() {
  const [range, setRange] = useState<"weekly" | "monthly">("weekly");
  const [data, setData] = useState<any>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isNonEmployee, setIsNonEmployee] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadDashboard = async (showSpinner = true) => {
    if (showSpinner) setLoading(true);
    else setIsRefreshing(true);

    try {
      // 1. Verify current user profile & employee status
      const me = await fetchMe();
      setCurrentUser(me);

      if (!me?.is_employee) {
        setIsNonEmployee(true);
        setData(null);
        setLoading(false);
        setIsRefreshing(false);
        return;
      }

      setIsNonEmployee(false);
      const res = await fetchEmployeeActivity(range);
      setData(res);
    } catch (err: any) {
      console.error("Failed to load dashboard activity", err);
      if (err?.response?.status === 403) {
        setIsNonEmployee(true);
        setData(null);
      }
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

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <Loader2 className="w-8 h-8 animate-spin text-primary mb-3" />
            <p className="text-sm font-medium">Computing aggregated analytics & activity heatmap...</p>
          </div>
        ) : isNonEmployee ? (
          /* Non-Employee Access Restriction State */
          <div className="flex flex-col items-center justify-center py-12 px-4">
            <div className="max-w-md w-full bg-card border border-border rounded-2xl p-8 shadow-sm text-center">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center mx-auto mb-4">
                <ShieldAlert className="w-7 h-7" />
              </div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-500 border border-amber-500/20 mb-3">
                Employee Profile Required
              </span>
              <h3 className="text-lg font-bold text-foreground mb-2">
                Dashboard Access Restricted
              </h3>
              <p className="text-sm text-muted-foreground mb-5 leading-relaxed">
                You are logged in as{" "}
                <span className="font-semibold text-foreground">
                  {currentUser?.email || currentUser?.name || "User"}
                </span>
                . The Activity Dashboard, streak heatmaps, and time logs are only available to users with an active employee profile.
              </p>

              <div className="bg-muted/40 border border-border/60 rounded-xl p-4 text-xs text-left text-muted-foreground mb-6 space-y-1.5">
                <div className="font-semibold text-foreground flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 text-primary" />
                  How to enable access:
                </div>
                <p>
                  Ask a workspace administrator to enable{" "}
                  <span className="font-medium text-foreground">Is Employee</span> on your user account, or create an Employee record with your email address under{" "}
                  <span className="font-medium text-foreground">Configuration &gt; Employees</span>.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-3">
                <Link
                  href="/tasks"
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-colors shadow-sm"
                >
                  Go to Tasks
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <button
                  onClick={() => loadDashboard(true)}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-border bg-card text-foreground font-medium text-sm hover:bg-muted transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  Check Again
                </button>
              </div>
            </div>
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

