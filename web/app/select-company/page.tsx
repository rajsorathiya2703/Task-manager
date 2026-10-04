"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { 
  Building2, 
  ArrowRight, 
  Plus, 
  KeyRound, 
  LogOut, 
  Loader2, 
  ChevronRight,
  ShieldCheck,
  UserCheck
} from "lucide-react";
import { Card, CardContent } from "@/src/components/ui/Card";
import { Button } from "@/src/components/ui/Button";
import { fetchMyCompanies, fetchMe, api } from "@/src/lib/api";

interface CompanyItem {
  slug: string;
  name: string;
  logoUrl?: string;
  isCompanyOwner: boolean;
}

export default function SelectCompanyPage() {
  const router = useRouter();
  const [companies, setCompanies] = useState<CompanyItem[]>([]);
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isJoining, setIsJoining] = useState(false);
  const [joinSlug, setJoinSlug] = useState("");

  useEffect(() => {
    let isMounted = true;

    const init = async () => {
      try {
        setIsLoading(true);

        // 1. Verify authentication
        let me: any = null;
        try {
          me = await fetchMe();
        } catch {
          if (isMounted) {
            router.replace("/login");
          }
          return;
        }

        if (!isMounted) return;

        if (!me || me.authType === "guest") {
          router.replace("/login");
          return;
        }

        setUser(me);

        // 2. Fetch companies
        const list = await fetchMyCompanies();
        if (!isMounted) return;

        const activeList: CompanyItem[] = Array.isArray(list) ? list : [];

        if (activeList.length === 0) {
          router.replace("/register-company");
          return;
        }

        if (activeList.length === 1) {
          try {
            localStorage.setItem("lastCompany", activeList[0].slug);
          } catch {}
          window.location.href = `/${activeList[0].slug}/dashboard`;
          return;
        }

        setCompanies(activeList);
      } catch (err) {
        console.error("Failed to load companies for selection:", err);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    init();

    return () => {
      isMounted = false;
    };
  }, [router]);

  const handleSelectCompany = (slug: string) => {
    try {
      localStorage.setItem("lastCompany", slug);
    } catch {}
    // Reset client state via full page reload to the new tenant dashboard
    window.location.href = `/${slug}/dashboard`;
  };

  const handleJoinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = joinSlug.trim().toLowerCase();
    if (!clean) return;
    window.location.href = `/${clean}/join`;
  };

  const handleLogout = async () => {
    try {
      await api.post("/auth/logout");
      window.location.href = "/";
    } catch {
      window.location.href = "/";
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-background py-12 px-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary mb-3" />
        <p className="text-xs text-muted-foreground">Loading your workspaces...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background py-12 px-4 sm:px-6">
      <div className="w-full max-w-xl space-y-6">
        {/* Brand Header */}
        <div className="flex flex-col items-center justify-center text-center space-y-2">
          <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center mb-2 shadow-sm text-primary-foreground">
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2L2 20h20L12 2zm0 4.2L17.5 17H6.5L12 6.2z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Select Workspace
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-md">
            You are a member of multiple workspaces. Choose an organization to open your dashboard.
          </p>
        </div>

        {/* User Badge */}
        {user?.email && (
          <div className="flex items-center justify-between p-3 rounded-xl bg-card border border-border text-xs shadow-xs">
            <div className="flex items-center gap-2 min-w-0">
              <UserCheck className="w-4 h-4 text-muted-foreground shrink-0" />
              <span className="truncate text-muted-foreground">
                Signed in as <strong className="text-foreground font-medium">{user.email}</strong>
              </span>
            </div>
            <button
              onClick={handleLogout}
              className="text-xs text-muted-foreground hover:text-red-500 transition-colors shrink-0 ml-3 flex items-center gap-1"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Log out</span>
            </button>
          </div>
        )}

        {/* Company Cards List */}
        <div className="space-y-2.5">
          {companies.map((comp) => (
            <Card
              key={comp.slug}
              onClick={() => handleSelectCompany(comp.slug)}
              className="group cursor-pointer border border-border bg-card hover:border-primary/50 hover:shadow-md transition-all rounded-2xl"
            >
              <CardContent className="p-4 sm:p-5 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-12 h-12 rounded-xl bg-muted border border-border flex items-center justify-center overflow-hidden shrink-0 group-hover:scale-105 transition-transform">
                    {comp.logoUrl ? (
                      <img
                        src={comp.logoUrl}
                        alt={comp.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Building2 className="w-6 h-6 text-primary" />
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h2 className="text-base font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                        {comp.name}
                      </h2>
                      {comp.isCompanyOwner && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 uppercase tracking-wide shrink-0">
                          Owner
                        </span>
                      )}
                    </div>
                    <p className="text-xs font-mono text-muted-foreground truncate mt-0.5">
                      /{comp.slug}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <div className="w-8 h-8 rounded-full bg-muted/60 flex items-center justify-center text-muted-foreground group-hover:bg-primary group-hover:text-primary-foreground transition-all">
                    <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Actions Section */}
        <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Join Another Company */}
          {isJoining ? (
            <form
              onSubmit={handleJoinSubmit}
              className="p-3.5 rounded-2xl border border-primary/40 bg-card shadow-xs flex flex-col gap-2.5 sm:col-span-2"
            >
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-foreground flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-primary" />
                  <span>Enter company workspace slug:</span>
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setIsJoining(false);
                    setJoinSlug("");
                  }}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Cancel
                </button>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={joinSlug}
                  onChange={(e) => setJoinSlug(e.target.value)}
                  placeholder="e.g. acme-corp"
                  autoFocus
                  className="flex-1 px-3 py-2 text-xs font-mono rounded-xl border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <Button
                  type="submit"
                  variant="primary"
                  disabled={!joinSlug.trim()}
                  className="h-9 px-4 rounded-xl text-xs gap-1.5"
                >
                  <span>Continue</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => setIsJoining(true)}
              className="p-4 rounded-2xl border border-dashed border-border hover:border-primary/50 hover:bg-muted/30 transition-all flex items-center justify-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground group"
            >
              <KeyRound className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
              <span>Join another company</span>
            </button>
          )}

          {/* Register New Company */}
          <Link href="/register-company" className={isJoining ? "hidden" : "block"}>
            <button
              type="button"
              className="w-full p-4 rounded-2xl border border-dashed border-border hover:border-primary/50 hover:bg-muted/30 transition-all flex items-center justify-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground group"
            >
              <Plus className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
              <span>Register a company</span>
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}
