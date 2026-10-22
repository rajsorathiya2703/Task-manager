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
  ArrowRight,
} from "lucide-react";
import { siteConfig } from "@/src/content/site";
import { fetchMe, api } from "@/src/lib/api";
import {
  fetchMyCompanies,
  setActiveCompany,
  getWorkspaceUrl,
  Company,
} from "@/src/lib/company-api";

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
    <div className="marketing-theme-scope relative min-h-screen flex flex-col bg-[var(--home-bg)] text-[var(--home-text-body)] transition-colors duration-300 overflow-hidden">
      {/* Decorative organic ambient shapes matching DESIGN (1) and DESIGN (2) */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-20 -right-20 w-[550px] h-[550px] rounded-full bg-[#dbe8df]/60 dark:bg-[#142d24]/50 blur-3xl -z-10 transition-colors duration-300"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-32 -left-20 w-[450px] h-[450px] rounded-full bg-[#dbe8df]/50 dark:bg-[#142d24]/40 blur-3xl -z-10 transition-colors duration-300"
      />

      {/* Top Header Bar */}
      <header className="sticky top-0 z-40 h-16 border-b border-black/8 dark:border-[#285A48] bg-[var(--home-surface)]/85 backdrop-blur-md transition-colors duration-300">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-full flex items-center justify-between">
          {/* Brand Logo Link */}
          <Link
            href="/"
            className="flex items-center gap-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#086948] dark:focus-visible:ring-[#8bd5b9] rounded-lg py-1 px-1.5 -ml-1.5 transition-colors"
          >
            <div
              className="w-8 h-8 flex items-center justify-center shrink-0"
              aria-hidden="true"
            >
              <img
                src="/logo.png"
                alt="Own Technology Logo"
                className="w-full h-full object-contain"
              />
            </div>
            <span className="text-base sm:text-lg font-bold tracking-tight text-[#161e12] dark:text-[#F3FDF8]">
              {siteConfig.brand.name}
            </span>
          </Link>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-3">
            <Link
              href="/register-company"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-black/10 dark:border-[#285A48] bg-white dark:bg-[#12211E] hover:bg-[#e6f4ed] dark:hover:bg-[#1B332B] text-xs font-semibold text-[#161e12] dark:text-[#E3F5EC] transition-all shadow-2xs"
            >
              <Plus className="w-3.5 h-3.5 text-[#086948] dark:text-[#8bd5b9]" />
              <span>Register another company</span>
            </Link>
            <button
              type="button"
              disabled={isLoggingOut}
              onClick={handleLogout}
              className="p-2 rounded-full border border-black/10 dark:border-[#285A48] text-[#4B5750] dark:text-[#86A99A] hover:text-[#161e12] dark:hover:text-[#F3FDF8] hover:bg-black/5 dark:hover:bg-[#1B332B] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#086948] dark:focus-visible:ring-[#8bd5b9] cursor-pointer"
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
        {/* Header Heading & User Pill (Matching the reference design) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="space-y-1.5">
            <h1 className="font-home-heading text-3xl sm:text-4xl lg:text-[42px] font-extrabold tracking-tight text-[#161e12] dark:text-[#F3FDF8] leading-tight">
              My account
            </h1>
            <p className="font-home-body text-sm sm:text-base text-[#4B5750] dark:text-[#86A99A]">
              Choose a company to open its workspace.
            </p>
          </div>

          {/* User Pill from reference design */}
          {user && (
            <div className="inline-flex items-center gap-3 bg-white dark:bg-[#12211E] border border-black/8 dark:border-[#285A48] rounded-full pl-2 pr-5 py-2 shadow-xs transition-colors self-start sm:self-auto">
              <div className="w-9 h-9 rounded-full bg-[#086948] dark:bg-[#8bd5b9] text-white dark:text-[#091413] font-bold text-sm flex items-center justify-center shrink-0 shadow-2xs">
                {user.name ? user.name.charAt(0).toUpperCase() : "U"}
              </div>
              <div className="text-left min-w-0">
                <div className="text-xs font-bold text-[#161e12] dark:text-[#F3FDF8] truncate font-home-body leading-tight">
                  {user.name}
                </div>
                <div className="text-[11px] text-[#4B5750] dark:text-[#86A99A] truncate font-home-body leading-tight">
                  {user.email}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Optional Search bar if > 5 companies */}
        {companies.length > 5 && (
          <div className="relative w-full max-w-xs">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#76786d] dark:text-[#86A99A]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search companies..."
              className="w-full bg-white dark:bg-[#12211E] border border-black/10 dark:border-[#285A48] rounded-full pl-10 pr-4 py-2 text-sm text-[#161e12] dark:text-[#F3FDF8] placeholder:text-[#76786d] dark:placeholder-[#86A99A] outline-none focus:border-[#086948] dark:focus:border-[#8bd5b9] focus:ring-2 focus:ring-[#086948]/15 dark:focus:ring-[#8bd5b9]/20 transition-all font-home-body"
            />
          </div>
        )}

        {/* Loading Skeletons */}
        {isLoading ? (
          <div className="bg-white dark:bg-[#12211E] border border-black/8 dark:border-[#285A48] rounded-[24px] sm:rounded-[28px] shadow-lg dark:shadow-[0_8px_32px_-4px_rgba(4,9,8,0.7)] overflow-hidden">
            <div className="p-6 border-b border-black/[0.06] dark:border-[#285A48] h-12 bg-black/[0.02] dark:bg-white/[0.02]" />
            {[1, 2, 3].map((idx) => (
              <div
                key={idx}
                className="grid grid-cols-12 items-center px-6 sm:px-8 py-5 border-b border-black/[0.06] dark:border-[#285A48] last:border-b-0 animate-pulse"
              >
                <div className="col-span-6 sm:col-span-7 flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-black/5 dark:bg-white/5" />
                  <div className="h-4 bg-black/5 dark:bg-white/5 rounded w-44" />
                </div>
                <div className="col-span-4 sm:col-span-3 flex justify-center">
                  <div className="h-6 bg-black/5 dark:bg-white/5 rounded-full w-20" />
                </div>
                <div className="col-span-2 flex justify-end">
                  <div className="w-9 h-9 rounded-full bg-black/5 dark:bg-white/5" />
                </div>
              </div>
            ))}
          </div>
        ) : companies.length === 0 ? (
          /* Empty State */
          <div className="bg-white dark:bg-[#12211E] border border-black/8 dark:border-[#285A48] rounded-[32px] p-10 sm:p-14 text-center shadow-lg dark:shadow-[0_8px_32px_-4px_rgba(4,9,8,0.7)] space-y-6 max-w-lg mx-auto">
            <div className="w-16 h-16 rounded-2xl bg-[#e6f4ed] dark:bg-[#1B332B] border border-[#cbe8d8] dark:border-[#285A48] text-[#086948] dark:text-[#8bd5b9] flex items-center justify-center mx-auto shadow-xs">
              <Building2 className="w-8 h-8" />
            </div>
            <div className="space-y-2">
              <h2 className="font-home-heading text-xl sm:text-2xl font-bold tracking-tight text-[#161e12] dark:text-[#F3FDF8]">
                No companies registered yet
              </h2>
              <p className="font-home-body text-sm text-[#4B5750] dark:text-[#86A99A] max-w-sm mx-auto leading-relaxed">
                You haven&apos;t created or joined an organization yet. Start your 14-day free trial today.
              </p>
            </div>
            <div>
              <Link
                href="/register-company"
                className="bg-[#161e12] hover:bg-[#2b3325] dark:bg-[#8bd5b9] dark:hover:bg-[#a6f2d4] text-white dark:text-[#091413] rounded-full px-7 h-11 inline-flex items-center justify-center gap-2 text-sm font-semibold transition-all shadow-md dark:shadow-[0_0_24px_rgba(139,213,185,0.25)]"
              >
                <Sparkles className="w-4 h-4" />
                <span>Register a company</span>
              </Link>
            </div>
          </div>
        ) : filteredCompanies.length === 0 ? (
          /* Search Empty State */
          <div className="bg-white dark:bg-[#12211E] border border-black/8 dark:border-[#285A48] rounded-[24px] p-10 text-center space-y-2">
            <p className="font-home-body text-base font-semibold text-[#161e12] dark:text-[#F3FDF8]">
              No matching companies found
            </p>
            <p className="font-home-body text-sm text-[#4B5750] dark:text-[#86A99A]">
              Try adjusting your search query.
            </p>
          </div>
        ) : (
          /* Minimal List View Table Card (Matching the reference design) */
          <div className="bg-white dark:bg-[#12211E] border border-black/8 dark:border-[#285A48] rounded-[24px] sm:rounded-[28px] shadow-lg dark:shadow-[0_8px_32px_-4px_rgba(4,9,8,0.7)] overflow-hidden transition-colors">
            {/* Table Header */}
            <div className="grid grid-cols-12 items-center px-6 sm:px-8 py-4 border-b border-black/[0.06] dark:border-[#285A48] text-[11px] font-bold font-home-mono tracking-wider text-[#76786d] dark:text-[#86A99A] uppercase">
              <div className="col-span-6 sm:col-span-7">COMPANY</div>
              <div className="col-span-4 sm:col-span-3 text-center">YOUR ROLE</div>
              <div className="col-span-2 text-right">WORKSPACE</div>
            </div>

            {/* Table Rows */}
            <div className="divide-y divide-black/[0.06] dark:divide-[#285A48]">
              {filteredCompanies.map((company) => {
                const initial = company.name
                  ? company.name.charAt(0).toUpperCase()
                  : "C";
                const role = (company.role || "member").toLowerCase();

                return (
                  <div
                    key={company._id}
                    role="button"
                    tabIndex={0}
                    onClick={() => handleOpenCompany(company)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        handleOpenCompany(company);
                      }
                    }}
                    className="group grid grid-cols-12 items-center px-6 sm:px-8 py-4 sm:py-5 hover:bg-[#f6faf7] dark:hover:bg-[#162723] transition-colors cursor-pointer focus-visible:outline-none focus-visible:bg-[#f6faf7] dark:focus-visible:bg-[#162723]"
                  >
                    {/* Company Column: Icon + Name */}
                    <div className="col-span-6 sm:col-span-7 flex items-center gap-3.5 min-w-0 pr-2">
                      <div className="w-10 h-10 rounded-xl bg-[#e6f4ed] dark:bg-[#1B332B] text-[#086948] dark:text-[#8bd5b9] border border-[#cbe8d8] dark:border-[#285A48] font-bold text-base flex items-center justify-center shrink-0 shadow-2xs transition-colors">
                        {initial}
                      </div>
                      <span className="text-sm sm:text-base font-bold text-[#161e12] dark:text-[#F3FDF8] truncate font-home-body tracking-tight">
                        {company.name}
                      </span>
                    </div>

                    {/* Role Column */}
                    <div className="col-span-4 sm:col-span-3 flex justify-center">
                      {role === "owner" ? (
                        <span className="px-3.5 py-1 rounded-full text-xs font-semibold bg-[#0C1511] text-white dark:bg-[#8bd5b9] dark:text-[#091413] shadow-2xs font-home-body">
                          Owner
                        </span>
                      ) : role === "admin" ? (
                        <span className="px-3.5 py-1 rounded-full text-xs font-semibold bg-[#e0f2ea] text-[#086948] border border-[#c6e6d6] dark:bg-[#1B332B] dark:text-[#8bd5b9] dark:border-[#285A48] shadow-2xs font-home-body">
                          Admin
                        </span>
                      ) : (
                        <span className="px-3.5 py-1 rounded-full text-xs font-semibold bg-[#f0f4f1] text-[#4B5750] border border-black/5 dark:bg-[#1B332B] dark:text-[#86A99A] dark:border-[#285A48] shadow-2xs font-home-body">
                          Member
                        </span>
                      )}
                    </div>

                    {/* Workspace Arrow Column */}
                    <div className="col-span-2 flex justify-end">
                      <div className="w-9 h-9 rounded-full border border-black/10 dark:border-[#285A48] bg-white dark:bg-[#12211E] flex items-center justify-center text-[#161e12] dark:text-[#E3F5EC] group-hover:border-black/30 dark:group-hover:border-[#8bd5b9] group-hover:bg-[#0C1511] group-hover:text-white dark:group-hover:bg-[#8bd5b9] dark:group-hover:text-[#091413] shadow-2xs transition-all">
                        <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

