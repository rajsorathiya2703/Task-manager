"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CompanyLink } from "@/src/lib/useCompanyPath";
import { PageHeader } from "@/src/components/layout/PageHeader";
import { EmployeeProfileStreakCard } from "@/src/components/dashboard/EmployeeProfileStreakCard";
import { EmployeeWorkingHoursChart } from "@/src/components/dashboard/EmployeeWorkingHoursChart";
import { KpiCardsGrid } from "@/src/components/dashboard/KpiCardsGrid";
import { CompletionTrendChart } from "@/src/components/dashboard/CompletionTrendChart";
import { StatusDistributionChart } from "@/src/components/dashboard/StatusDistributionChart";
import { LiveActivityFeed } from "@/src/components/dashboard/LiveActivityFeed";
import { fetchEmployeeActivity, fetchMe } from "@/src/lib/api";
import { useAccess } from "@/src/contexts/AccessContext";
import { useCompany } from "@/src/contexts/CompanyContext";
import { useSocket } from "@/src/contexts/SocketContext";
import { useCachedQuery } from "@/src/lib/useCachedQuery";
import { usePersistentState } from "@/src/lib/usePersistentState";
import {
  Loader2,
  RefreshCw,
  ShieldAlert,
  ArrowRight,
  Building2,
  AlertTriangle,
} from "lucide-react";

export default function DashboardPage() {
  const router = useRouter();
  const { slug, companyName, user: companyUser } = useCompany();
  const accessContext = useAccess();
  const { socket } = useSocket();

  // Persistent range preference (weekly vs monthly)
  const [range, setRange] = usePersistentState<"weekly" | "monthly">(
    slug ? `${slug}:dash_range` : "dash_range",
    "weekly",
  );

  const [accessState, setAccessState] = useState<"ok" | "no_company" | "forbidden" | "error">(
    !slug ? "no_company" : "ok",
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Component-level cached query for Dashboard analytics
  const {
    data,
    isLoading,
    isRefetching,
    refetch,
  } = useCachedQuery<any>({
    key: `dashboard:${slug || "_global"}:${range}`,
    loader: () => fetchEmployeeActivity(range),
    tags: ["dashboard"],
    tier: "session",
    ttl: 60 * 1000,
    enabled: Boolean(slug),
    onError: (err: any) => {
      console.error("Failed to load dashboard activity", err);
      const status = err?.response?.status;
      if (status === 401) {
        router.replace(slug ? `/${slug}/login` : "/login");
      } else if (status === 403) {
        setAccessState("forbidden");
      } else {
        setAccessState("error");
        setErrorMessage(
          err?.response?.data?.message || err?.message || "Failed to load dashboard data",
        );
      }
    },
    onSuccess: () => {
      setAccessState("ok");
      setErrorMessage(null);
    },
  });

  const currentUser = companyUser || accessContext.user;

  // Real-time socket event updates
  useEffect(() => {
    if (!socket || !slug) return;
    let t: ReturnType<typeof setTimeout>;

    const onRealtimeUpdate = () => {
      clearTimeout(t);
      t = setTimeout(() => {
        refetch(true);
      }, 1000);
    };

    const events = [
      "task:created",
      "task:updated",
      "task:deleted",
      "team:created",
      "team:updated",
      "team:deleted",
    ];
    events.forEach((e) => socket.on(e, onRealtimeUpdate));

    return () => {
      clearTimeout(t);
      events.forEach((e) => socket.off(e, onRealtimeUpdate));
    };
  }, [socket, slug, refetch]);

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
              onClick={() => refetch(true)}
              disabled={isLoading || isRefetching}
              className="p-2 rounded-xl border border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground transition-colors shadow-sm disabled:opacity-50"
              title="Refresh dashboard data"
            >
              <RefreshCw className={`w-4 h-4 ${isRefetching ? "animate-spin text-primary" : ""}`} />
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <Loader2 className="w-8 h-8 animate-spin text-primary mb-3" />
            <p className="text-sm font-medium">Computing aggregated analytics & activity heatmap...</p>
          </div>
        ) : accessState === "no_company" ? (
          /* No Active Company Selected State */
          <div className="flex flex-col items-center justify-center py-12 px-4">
            <div className="max-w-md w-full bg-card border border-border rounded-2xl p-8 shadow-sm text-center">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center mx-auto mb-4">
                <Building2 className="w-7 h-7" />
              </div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20 mb-3">
                Workspace Required
              </span>
              <h3 className="text-lg font-bold text-foreground mb-2">
                No Active Workspace
              </h3>
              <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
                No active company workspace is selected. Please select or join a company in your account.
              </p>
              <Link
                href="/my-account"
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-colors shadow-sm"
              >
                Go to My Account
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        ) : accessState === "forbidden" ? (
          /* 403 Forbidden: Workspace Access Pending / Restricted State */
          <div className="flex flex-col items-center justify-center py-12 px-4">
            <div className="max-w-md w-full bg-card border border-border rounded-2xl p-8 shadow-sm text-center">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center mx-auto mb-4">
                <ShieldAlert className="w-7 h-7" />
              </div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-500 border border-amber-500/20 mb-3">
                Access Pending
              </span>
              <h3 className="text-lg font-bold text-foreground mb-2">
                You don't have access to this workspace yet
              </h3>
              <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
                You are signed in as{" "}
                <span className="font-semibold text-foreground">
                  {currentUser?.email || currentUser?.name || "User"}
                </span>
                . Your account is pending role assignment or workspace administrator approval for{" "}
                <span className="font-semibold text-foreground">
                  {companyName || slug || "this workspace"}
                </span>
                . Please contact your workspace administrator to grant you access.
              </p>

              <div className="flex flex-col sm:flex-row items-center gap-3">
                <Link
                  href="/my-account"
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-colors shadow-sm"
                >
                  <Building2 className="w-4 h-4" />
                  Switch or Join Company
                </Link>
                <button
                  onClick={() => refetch(true)}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-border bg-card text-foreground font-medium text-sm hover:bg-muted transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  Retry Access
                </button>
              </div>
            </div>
          </div>
        ) : accessState === "error" ? (
          /* Error State */
          <div className="flex flex-col items-center justify-center py-12 px-4">
            <div className="max-w-md w-full bg-card border border-destructive/20 rounded-2xl p-8 shadow-sm text-center">
              <div className="w-14 h-14 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-bold text-foreground mb-2">Unable to Load Dashboard</h3>
              <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
                {errorMessage || "An unexpected error occurred while loading dashboard metrics."}
              </p>
              <button
                onClick={() => refetch(true)}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-colors shadow-sm"
              >
                <RefreshCw className="w-4 h-4" />
                Try Again
              </button>
            </div>
          </div>
        ) : (
          /* Full Activity Dashboard */
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
