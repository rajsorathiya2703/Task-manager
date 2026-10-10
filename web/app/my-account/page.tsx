"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Building2,
  Plus,
  LogOut,
  Search,
  Loader2,
  Sparkles,
} from "lucide-react";
import { siteConfig } from "@/src/content/site";
import { fetchMe, api } from "@/src/lib/api";
import {
  fetchMyCompanies,
  setActiveCompany,
  getWorkspaceUrl,
  Company,
} from "@/src/lib/company-api";
import { CompanyCard } from "@/src/components/account/CompanyCard";

export default function MyAccountPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function loadAccountData() {
      try {
        const userData = await fetchMe();
        if (!mounted) return;
        if (!userData) {
          router.replace("/login");
          return;
        }
        setUser(userData);

        const companyList = await fetchMyCompanies();
        if (!mounted) return;
        setCompanies(companyList || []);
      } catch (err) {
        if (!mounted) return;
        router.replace("/login");
      } finally {
        if (mounted) setIsLoading(false);
      }
    }

    loadAccountData();

    return () => {
      mounted = false;
    };
  }, [router]);

  const handleOpenCompany = (company: Company) => {
    setActiveCompany(company);
    router.push(getWorkspaceUrl(company));
  };

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      await api.post("/auth/logout");
      router.push("/login");
    } catch (err) {
      router.push("/login");
    } finally {
      setIsLoggingOut(false);
    }
  };

  const filteredCompanies = companies.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.industry.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top Bar */}
      <header className="sticky top-0 z-40 h-16 border-b border-border/60 bg-background/80 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-full flex items-center justify-between">
          {/* Brand Logo Link */}
          <Link
            href="/"
            className="flex items-center gap-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg py-1 px-1.5 -ml-1.5 transition-colors"
          >
            <div
              className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center shrink-0 shadow-sm"
              aria-hidden="true"
            >
              <svg
                className="w-4 h-4 text-primary-foreground"
                viewBox="0 0 24 24"
                fill="currentColor"
                stroke="none"
              >
                <path d="M12 2L2 20h20L12 2zm0 4.2L17.5 17H6.5L12 6.2z" />
              </svg>
            </div>
            <span className="text-lg font-bold tracking-tight text-foreground">
              {siteConfig.brand.name}
            </span>
          </Link>

          {/* Right User Bar */}
          <div className="flex items-center gap-3 sm:gap-5">
            {user && (
              <span className="text-sm font-medium text-muted-foreground hidden sm:inline">
                {user.name}
              </span>
            )}
            <Link
              href="/register-company"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs font-semibold text-foreground hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Register another company</span>
            </Link>
            <button
              type="button"
              disabled={isLoggingOut}
              onClick={handleLogout}
              className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Log out"
              title="Log out"
            >
              {isLoggingOut ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <LogOut className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-14 w-full space-y-8">
        {/* Header Heading */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              My account
            </h1>
            <p className="text-sm text-muted-foreground">
              Choose a company to open its workspace.
            </p>
          </div>

          {/* Search bar displayed only when user has > 6 companies */}
          {companies.length > 6 && (
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search companies..."
                className="w-full bg-muted/40 border border-border rounded-xl pl-10 pr-4 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all"
              />
            </div>
          )}
        </div>

        {/* Loading Skeletons */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((idx) => (
              <div
                key={idx}
                className="bg-card border border-border/60 rounded-2xl p-6 shadow-xs animate-pulse space-y-5"
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-muted/70" />
                  <div className="space-y-2 flex-1">
                    <div className="h-4 bg-muted/70 rounded w-3/4" />
                    <div className="h-3 bg-muted/50 rounded w-1/2" />
                  </div>
                </div>
                <div className="h-3 bg-muted/50 rounded w-2/3" />
                <div className="pt-3 border-t border-border/40 h-4 bg-muted/60 rounded w-1/3" />
              </div>
            ))}
          </div>
        ) : companies.length === 0 ? (
          /* Empty State */
          <div className="bg-card border border-border/70 rounded-3xl p-10 sm:p-14 text-center shadow-lg space-y-6 max-w-lg mx-auto">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center mx-auto shadow-xs">
              <Building2 className="w-8 h-8" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-bold tracking-tight text-foreground">
                No companies registered yet
              </h2>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed">
                You haven&apos;t created or joined an organization yet. Start your 14-day free trial today.
              </p>
            </div>
            <div>
              <Link
                href="/register-company"
                className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-full px-6 h-11 inline-flex items-center justify-center gap-2 text-sm font-medium transition-colors shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <Sparkles className="w-4 h-4" />
                <span>Register a company</span>
              </Link>
            </div>
          </div>
        ) : filteredCompanies.length === 0 ? (
          /* Search Empty State */
          <div className="bg-card border border-border/60 rounded-2xl p-10 text-center space-y-2">
            <p className="text-base font-semibold text-foreground">
              No matching companies found
            </p>
            <p className="text-sm text-muted-foreground">
              Try adjusting your search query.
            </p>
          </div>
        ) : (
          /* Companies Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCompanies.map((company) => (
              <CompanyCard
                key={company._id}
                company={company}
                onOpen={handleOpenCompany}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
