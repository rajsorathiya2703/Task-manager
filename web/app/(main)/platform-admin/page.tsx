"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Search,
  RefreshCw,
  MoreVertical,
  Check,
  CalendarPlus,
  Ban,
  Loader2,
  X,
  Mail,
  Globe,
  Users,
  ShieldAlert,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/src/components/layout/PageHeader";
import { Sidebar } from "@/src/components/layout/Sidebar";
import { SidebarProvider } from "@/src/components/layout/SidebarContext";
import { ChatbotProvider } from "@/src/components/chatbot/ChatbotContext";
import {
  fetchMe,
  fetchPlatformStats,
  fetchPlatformCompanies,
  activateCompany,
  extendCompanyTrial,
  suspendCompany,
} from "@/src/lib/api";

interface PlatformStats {
  totalCompanies: number;
  onTrial: number;
  trialExpired: number;
  converted: number;
  suspended: number;
}

interface PlatformCompany {
  _id: string;
  name: string;
  slug?: string;
  industry?: string;
  country?: string;
  contactEmail?: string;
  declaredEmployeeCount?: string | number;
  actualEmployeeCount: number;
  status: string;
  effectiveStatus?: string;
  trialStartedAt?: string | Date;
  trialEndsAt?: string | Date;
  daysLeft?: number;
  convertedAt?: string | Date;
  createdAt: string | Date;
}

type StatusFilter = "all" | "trial" | "trial_expired" | "active" | "suspended";

export default function PlatformAdminPage() {
  const router = useRouter();

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);

  const [stats, setStats] = useState<PlatformStats>({
    totalCompanies: 0,
    onTrial: 0,
    trialExpired: 0,
    converted: 0,
    suspended: 0,
  });

  const [companies, setCompanies] = useState<PlatformCompany[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<StatusFilter>("all");

  // Action state
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Modal / Prompt for Extend Trial
  const [extendModalCompany, setExtendModalCompany] = useState<PlatformCompany | null>(null);
  const [extendDaysInput, setExtendDaysInput] = useState<string>("14");

  const loadData = async () => {
    try {
      const [statsRes, companiesRes] = await Promise.all([
        fetchPlatformStats(),
        fetchPlatformCompanies(),
      ]);
      setStats(statsRes || {
        totalCompanies: 0,
        onTrial: 0,
        trialExpired: 0,
        converted: 0,
        suspended: 0,
      });
      setCompanies(Array.isArray(companiesRes) ? companiesRes : []);
    } catch (err: any) {
      if (err?.response?.status === 403) {
        toast.error("Access denied. Platform admin privileges required.");
        router.replace("/dashboard");
      } else {
        toast.error("Failed to load platform data. Please try again.");
      }
    } finally {
      setLoadingData(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    let mounted = true;

    fetchMe(undefined, { fresh: true })
      .then(async (user) => {
        if (!mounted) return;
        if (!user || !user.isPlatformAdmin) {
          setIsAuthorized(false);
          router.replace("/dashboard");
          return;
        }

        setIsAuthorized(true);
        setCurrentUser(user);
        await loadData();
      })
      .catch(() => {
        if (!mounted) return;
        setIsAuthorized(false);
        router.replace("/dashboard");
      });

    return () => {
      mounted = false;
    };
  }, [router]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
  };

  // Actions
  const handleActivate = async (comp: PlatformCompany) => {
    const confirmed = window.confirm(
      `Activate subscription for "${comp.name}"?\nThis grants full paid access to this workspace.`
    );
    if (!confirmed) return;

    try {
      setActionLoadingId(comp._id);
      await activateCompany(comp._id);
      toast.success(`"${comp.name}" activated successfully.`);
      await loadData();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to activate company.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleOpenExtendModal = (comp: PlatformCompany) => {
    setExtendModalCompany(comp);
    setExtendDaysInput("14");
  };

  const handleConfirmExtend = async () => {
    if (!extendModalCompany) return;
    const days = parseInt(extendDaysInput, 10);
    if (isNaN(days) || days < 1 || days > 365) {
      toast.error("Please enter a valid number of days between 1 and 365.");
      return;
    }

    try {
      setActionLoadingId(extendModalCompany._id);
      await extendCompanyTrial(extendModalCompany._id, days);
      toast.success(`Extended trial by ${days} day(s) for "${extendModalCompany.name}".`);
      setExtendModalCompany(null);
      await loadData();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to extend trial.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleSuspend = async (comp: PlatformCompany) => {
    const confirmed = window.confirm(
      `Suspend "${comp.name}"?\nMembers will be blocked from accessing this workspace until reactivated.`
    );
    if (!confirmed) return;

    try {
      setActionLoadingId(comp._id);
      await suspendCompany(comp._id);
      toast.success(`"${comp.name}" has been suspended.`);
      await loadData();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to suspend company.");
    } finally {
      setActionLoadingId(null);
    }
  };

  // Filtered companies
  const filteredCompanies = useMemo(() => {
    return companies.filter((c) => {
      // Status filter
      const compStatus = (c.effectiveStatus || c.status || "").toLowerCase();
      if (selectedStatus === "trial") {
        if (compStatus !== "trial") return false;
      } else if (selectedStatus === "trial_expired") {
        if (compStatus !== "trial_expired" && compStatus !== "expired") return false;
      } else if (selectedStatus === "active") {
        if (compStatus !== "active") return false;
      } else if (selectedStatus === "suspended") {
        if (compStatus !== "suspended") return false;
      }

      // Search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesName = (c.name || "").toLowerCase().includes(query);
        const matchesEmail = (c.contactEmail || "").toLowerCase().includes(query);
        const matchesSlug = (c.slug || "").toLowerCase().includes(query);
        if (!matchesName && !matchesEmail && !matchesSlug) {
          return false;
        }
      }

      return true;
    });
  }, [companies, selectedStatus, searchQuery]);

  if (isAuthorized === null || loadingData) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-xs text-muted-foreground font-medium">
            Verifying platform permissions...
          </p>
        </div>
      </div>
    );
  }

  if (isAuthorized === false) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background p-4">
        <div className="max-w-md w-full text-center space-y-4">
          <ShieldAlert className="w-12 h-12 text-destructive mx-auto" />
          <h1 className="text-xl font-bold text-foreground">Access Restricted</h1>
          <p className="text-sm text-muted-foreground">
            This dashboard is reserved for platform administrators only. Redirecting to your dashboard...
          </p>
        </div>
      </div>
    );
  }

  const renderStatusBadge = (comp: PlatformCompany) => {
    const rawStatus = (comp.effectiveStatus || comp.status || "").toLowerCase();
    const daysLeft = typeof comp.daysLeft === "number" ? comp.daysLeft : 0;

    if (rawStatus === "active") {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          Active
        </span>
      );
    }

    if (rawStatus === "trial") {
      const isUrgent = daysLeft <= 3;
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${
            isUrgent
              ? "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20"
              : "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20"
          }`}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              isUrgent ? "bg-amber-500" : "bg-blue-500"
            }`}
          />
          Trial ({daysLeft}d left)
        </span>
      );
    }

    if (rawStatus === "trial_expired" || rawStatus === "expired") {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
          Expired
        </span>
      );
    }

    if (rawStatus === "suspended") {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-muted text-muted-foreground border border-border">
          <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground" />
          Suspended
        </span>
      );
    }

    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-muted text-muted-foreground">
        {comp.status}
      </span>
    );
  };

  const formatDate = (dateVal?: string | Date | null) => {
    if (!dateVal) return "—";
    try {
      const d = new Date(dateVal);
      if (isNaN(d.getTime())) return "—";
      return d.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return "—";
    }
  };

  return (
    <SidebarProvider>
      <ChatbotProvider>
        <div className="flex h-screen overflow-hidden bg-background">
          <Sidebar user={currentUser} />

          <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
            <PageHeader
              title="Company Dashboard"
              breadcrumbs={[{ label: "Platform Admin" }]}
              showAdd={false}
            />

            <main className="flex-1 flex flex-col min-w-0 overflow-y-auto relative p-4 sm:p-6 lg:p-8 space-y-6">
              {/* Header Info */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-foreground">
                    Platform Management
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    Monitor company subscriptions, trial lifecycles, and tenant access.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold border border-border bg-card hover:bg-muted/60 text-foreground transition-colors shadow-2xs self-start sm:self-auto"
                >
                  <RefreshCw
                    className={`w-3.5 h-3.5 text-muted-foreground ${
                      refreshing ? "animate-spin" : ""
                    }`}
                  />
                  <span>Refresh</span>
                </button>
              </div>

              {/* 4 KPI Cards (Style mirroring KpiCardsGrid.tsx) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* 1. Total Companies */}
                <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-card to-card/70 p-5 shadow-sm hover:shadow-md transition-all">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Total Companies
                    </span>
                    <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                      <Building2 className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="mt-3">
                    <div className="text-3xl font-extrabold tracking-tight text-foreground">
                      {stats.totalCompanies}
                    </div>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    All registered customer workspaces
                  </p>
                </div>

                {/* 2. On Free Trial */}
                <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-card to-card/70 p-5 shadow-sm hover:shadow-md transition-all">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      On Free Trial
                    </span>
                    <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400">
                      <Clock className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="mt-3">
                    <div className="text-3xl font-extrabold tracking-tight text-foreground">
                      {stats.onTrial}
                    </div>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Active 14-day evaluation periods
                  </p>
                </div>

                {/* 3. Trial Expired */}
                <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-card to-card/70 p-5 shadow-sm hover:shadow-md transition-all">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Trial Expired
                    </span>
                    <div className="w-9 h-9 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-600 dark:text-rose-400">
                      <AlertTriangle className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="mt-3">
                    <div className="text-3xl font-extrabold tracking-tight text-foreground">
                      {stats.trialExpired}
                    </div>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Requires sales follow-up or conversion
                  </p>
                </div>

                {/* 4. Converted to Paid */}
                <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-card to-card/70 p-5 shadow-sm hover:shadow-md transition-all">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Converted to Paid
                    </span>
                    <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="mt-3">
                    <div className="text-3xl font-extrabold tracking-tight text-foreground">
                      {stats.converted}
                    </div>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Paid active subscription accounts
                  </p>
                </div>
              </div>

              {/* Filter Controls & Search Box */}
              <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 pt-2">
                {/* Search Box */}
                <div className="relative flex-1 max-w-md">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by company name, slug, or email..."
                    className="w-full bg-card border border-border rounded-xl pl-9 pr-8 py-2 text-xs text-foreground placeholder:text-muted-foreground outline-none transition-all focus:border-primary focus:ring-1 focus:ring-primary/20 shadow-2xs"
                  />
                  <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Status Filter Chips */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
                  {(
                    [
                      { key: "all", label: "All" },
                      { key: "trial", label: "On Trial" },
                      { key: "trial_expired", label: "Expired" },
                      { key: "active", label: "Active" },
                      { key: "suspended", label: "Suspended" },
                    ] as const
                  ).map((chip) => {
                    const isSelected = selectedStatus === chip.key;
                    return (
                      <button
                        key={chip.key}
                        type="button"
                        onClick={() => setSelectedStatus(chip.key)}
                        className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all shrink-0 border ${
                          isSelected
                            ? "bg-primary text-primary-foreground border-primary shadow-xs"
                            : "bg-card border-border text-muted-foreground hover:text-foreground hover:bg-muted/50"
                        }`}
                      >
                        {chip.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Companies Table */}
              <div className="rounded-2xl border border-border/80 bg-card overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-border bg-muted/30 text-muted-foreground font-semibold">
                        <th className="py-3 px-4">Company</th>
                        <th className="py-3 px-4">Industry</th>
                        <th className="py-3 px-4">Country</th>
                        <th className="py-3 px-4">Contact Email</th>
                        <th className="py-3 px-4 text-center">Employees</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4">Trial Ends</th>
                        <th className="py-3 px-4">Registered</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60 text-foreground">
                      {filteredCompanies.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="py-12 text-center text-muted-foreground">
                            <Building2 className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
                            <p className="font-medium">No companies found matching criteria.</p>
                            {(searchQuery || selectedStatus !== "all") && (
                              <button
                                type="button"
                                onClick={() => {
                                  setSearchQuery("");
                                  setSelectedStatus("all");
                                }}
                                className="mt-2 text-xs text-primary font-semibold hover:underline"
                              >
                                Clear all filters
                              </button>
                            )}
                          </td>
                        </tr>
                      ) : (
                        filteredCompanies.map((comp) => {
                          const isLoading = actionLoadingId === comp._id;
                          return (
                            <tr
                              key={comp._id}
                              className="hover:bg-muted/20 transition-colors group"
                            >
                              {/* Company */}
                              <td className="py-3 px-4">
                                <div className="font-semibold text-foreground">
                                  {comp.name}
                                </div>
                                {comp.slug && (
                                  <div className="text-[11px] font-mono text-muted-foreground">
                                    /{comp.slug}
                                  </div>
                                )}
                              </td>

                              {/* Industry */}
                              <td className="py-3 px-4 text-muted-foreground">
                                {comp.industry || "—"}
                              </td>

                              {/* Country */}
                              <td className="py-3 px-4 text-muted-foreground">
                                {comp.country || "—"}
                              </td>

                              {/* Email */}
                              <td className="py-3 px-4">
                                {comp.contactEmail ? (
                                  <a
                                    href={`mailto:${comp.contactEmail}`}
                                    className="text-foreground hover:underline"
                                  >
                                    {comp.contactEmail}
                                  </a>
                                ) : (
                                  <span className="text-muted-foreground">—</span>
                                )}
                              </td>

                              {/* Employees (declared / actual) */}
                              <td className="py-3 px-4 text-center font-mono">
                                <span className="text-foreground font-semibold">
                                  {comp.declaredEmployeeCount || "—"}
                                </span>
                                <span className="text-muted-foreground"> / </span>
                                <span className="text-primary font-medium">
                                  {comp.actualEmployeeCount}
                                </span>
                              </td>

                              {/* Status Badge */}
                              <td className="py-3 px-4 whitespace-nowrap">
                                {renderStatusBadge(comp)}
                              </td>

                              {/* Trial Ends */}
                              <td className="py-3 px-4 text-muted-foreground whitespace-nowrap">
                                {formatDate(comp.trialEndsAt)}
                              </td>

                              {/* Registered */}
                              <td className="py-3 px-4 text-muted-foreground whitespace-nowrap">
                                {formatDate(comp.createdAt)}
                              </td>

                              {/* Actions */}
                              <td className="py-3 px-4 text-right whitespace-nowrap">
                                {isLoading ? (
                                  <Loader2 className="w-4 h-4 animate-spin text-primary inline-block" />
                                ) : (
                                  <div className="inline-flex items-center gap-1.5 justify-end">
                                    {/* Activate button */}
                                    <button
                                      type="button"
                                      onClick={() => handleActivate(comp)}
                                      title="Activate paid subscription"
                                      className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 transition-colors"
                                    >
                                      Activate
                                    </button>

                                    {/* Extend trial button */}
                                    <button
                                      type="button"
                                      onClick={() => handleOpenExtendModal(comp)}
                                      title="Extend free trial period"
                                      className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/30 transition-colors"
                                    >
                                      Extend
                                    </button>

                                    {/* Suspend button */}
                                    <button
                                      type="button"
                                      onClick={() => handleSuspend(comp)}
                                      title="Suspend company access"
                                      className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-destructive/10 hover:bg-destructive/20 text-destructive border border-destructive/30 transition-colors"
                                    >
                                      Suspend
                                    </button>
                                  </div>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="p-3 border-t border-border/60 bg-muted/20 text-xs text-muted-foreground flex items-center justify-between">
                  <span>
                    Showing {filteredCompanies.length} of {companies.length} companies
                  </span>
                  <span>Platform Superuser Mode</span>
                </div>
              </div>
            </main>
          </div>
        </div>

        {/* Extend Trial Modal */}
        {extendModalCompany && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-xs">
            <div className="max-w-sm w-full bg-card border border-border rounded-2xl p-6 shadow-xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center">
                    <CalendarPlus className="w-4 h-4" />
                  </div>
                  <h3 className="font-bold text-foreground text-sm">Extend Free Trial</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setExtendModalCompany(null)}
                  className="text-muted-foreground hover:text-foreground p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Extending trial for <strong className="text-foreground">{extendModalCompany.name}</strong>.
                  New trial expiration date will be calculated based on today or existing end date.
                </p>

                <div className="space-y-1 pt-1">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
                    Days to extend (1 - 365)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="365"
                    value={extendDaysInput}
                    onChange={(e) => setExtendDaysInput(e.target.value)}
                    className="w-full bg-muted/40 border border-border rounded-xl px-3.5 py-2 text-sm text-foreground outline-none transition-all focus:border-primary focus:ring-1 focus:ring-primary/20"
                    placeholder="14"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setExtendModalCompany(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold border border-border bg-card hover:bg-muted text-foreground transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmExtend}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-xs"
                >
                  Confirm Extension
                </button>
              </div>
            </div>
          </div>
        )}
      </ChatbotProvider>
    </SidebarProvider>
  );
}
