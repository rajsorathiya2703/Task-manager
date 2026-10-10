"use client";

import React, { useState, useRef, useEffect } from "react";
import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";
import { api, fetchMyCompanies } from "../../lib/api";
import { useCompanyPath } from "../../lib/useCompanyPath";
import { useCompany } from "../../contexts/CompanyContext";
import {
  Building2,
  Check,
  Plus,
  KeyRound,
  ArrowRight,
  Settings,
  Sun,
  Moon,
  LogOut,
  ChevronDown,
  Loader2,
  X
} from "lucide-react";

interface UserProfileProps {
  user: {
    name?: string;
    email?: string;
    avatarUrl?: string;
  };
}

interface CompanyItem {
  slug: string;
  name: string;
  logoUrl?: string;
  isCompanyOwner: boolean;
}

export function UserProfile({ user }: UserProfileProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [companies, setCompanies] = useState<CompanyItem[]>([]);
  const [isLoadingCompanies, setIsLoadingCompanies] = useState(false);
  const [isJoinInputOpen, setIsJoinInputOpen] = useState(false);
  const [joinSlug, setJoinSlug] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const joinInputRef = useRef<HTMLInputElement>(null);
  const { setTheme, theme } = useTheme();
  const router = useRouter();
  const cp = useCompanyPath();
  const { slug: currentSlug } = useCompany();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setIsJoinInputOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setIsLoadingCompanies(true);
      fetchMyCompanies()
        .then((data) => {
          if (Array.isArray(data)) {
            setCompanies(data);
          }
        })
        .catch((err) => {
          console.error("Failed to load user companies:", err);
        })
        .finally(() => {
          setIsLoadingCompanies(false);
        });
    } else {
      setIsJoinInputOpen(false);
      setJoinSlug("");
    }
  }, [isOpen]);

  useEffect(() => {
    if (isJoinInputOpen && joinInputRef.current) {
      joinInputRef.current.focus();
    }
  }, [isJoinInputOpen]);

  const handleSwitchCompany = (targetSlug: string) => {
    const cleanTarget = targetSlug.trim().toLowerCase();
    const cleanCurrent = (currentSlug || "").trim().toLowerCase();

    if (cleanTarget === cleanCurrent) {
      setIsOpen(false);
      return;
    }

    try {
      localStorage.setItem("lastCompany", cleanTarget);
    } catch {}

    setIsOpen(false);
    // Reset company-specific client state on switch via full navigation
    window.location.href = `/${cleanTarget}/dashboard`;
  };

  const handleJoinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = joinSlug.trim().toLowerCase();
    if (!clean) return;
    setIsOpen(false);
    window.location.href = `/${clean}/join`;
  };

  const handleLogout = async () => {
    try {
      await api.post("/auth/logout");
      window.location.href = "/";
    } catch (e) {
      console.error("Logout failed", e);
      window.location.href = "/";
    }
  };

  const displayName = user?.name || "User";
  const displayEmail = user?.email || "No email";
  const firstLetter = displayName.charAt(0).toUpperCase();

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center w-full gap-2 px-2 py-1.5 rounded-lg hover:bg-muted/50 transition-colors"
      >
        <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center overflow-hidden shrink-0">
          {user?.avatarUrl ? (
            <img src={user.avatarUrl} alt={displayName} className="w-full h-full object-cover" />
          ) : (
            <span className="text-primary-foreground text-xs font-medium">{firstLetter}</span>
          )}
        </div>
        <div className="flex-1 text-left truncate">
          <p className="text-xs font-medium leading-none truncate text-foreground">{displayName}</p>
        </div>
        <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
      </button>

      {isOpen && (
        <div className="mt-2 w-full bg-card border border-border rounded-xl shadow-lg py-2 z-50">
          {/* User Profile Header */}
          <div className="flex flex-col items-center justify-center p-3 border-b border-border text-center">
            <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center overflow-hidden mb-2 shadow-xs">
              {user?.avatarUrl ? (
                <img src={user.avatarUrl} alt={displayName} className="w-full h-full object-cover" />
              ) : (
                <span className="text-primary-foreground text-base font-semibold">{firstLetter}</span>
              )}
            </div>
            <p className="text-xs font-semibold text-foreground truncate max-w-full px-2">{displayName}</p>
            <p className="text-[11px] text-muted-foreground truncate max-w-full px-2">{displayEmail}</p>
          </div>

          {/* Companies Section */}
          <div className="py-2 border-b border-border">
            <div className="px-3 pb-1 text-[10px] font-bold tracking-wider text-muted-foreground uppercase flex items-center justify-between">
              <span>Companies</span>
              {companies.length > 0 && (
                <span className="text-[9px] font-mono bg-muted px-1.5 py-0.2 rounded text-muted-foreground">
                  {companies.length}
                </span>
              )}
            </div>

            {isLoadingCompanies ? (
              <div className="flex items-center justify-center py-3 text-xs text-muted-foreground gap-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                <span>Loading workspaces...</span>
              </div>
            ) : (
              <div className="max-h-48 overflow-y-auto px-1.5 space-y-0.5">
                {companies.map((comp) => {
                  const isCurrent =
                    comp.slug.trim().toLowerCase() === (currentSlug || "").trim().toLowerCase();

                  return (
                    <button
                      key={comp.slug}
                      type="button"
                      onClick={() => handleSwitchCompany(comp.slug)}
                      className={`w-full flex items-center gap-2 px-2.5 py-1.5 text-xs rounded-lg transition-colors text-left ${
                        isCurrent
                          ? "bg-primary/10 text-primary font-medium"
                          : "text-foreground hover:bg-muted/60"
                      }`}
                    >
                      <div className="w-5 h-5 rounded-md bg-muted border border-border/60 flex items-center justify-center overflow-hidden shrink-0">
                        {comp.logoUrl ? (
                          <img src={comp.logoUrl} alt={comp.name} className="w-full h-full object-cover" />
                        ) : (
                          <Building2 className="w-3 h-3 text-muted-foreground" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="truncate">{comp.name}</span>
                          {comp.isCompanyOwner && (
                            <span className="text-[9px] font-semibold px-1 rounded bg-amber-500/15 text-amber-600 dark:text-amber-400 shrink-0">
                              Owner
                            </span>
                          )}
                        </div>
                      </div>

                      {isCurrent && (
                        <Check className="w-3.5 h-3.5 text-primary shrink-0 ml-auto" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Quick Actions: Join / Register */}
            <div className="px-1.5 pt-1.5 space-y-1">
              {isJoinInputOpen ? (
                <form onSubmit={handleJoinSubmit} className="flex items-center gap-1 px-1 py-1">
                  <input
                    ref={joinInputRef}
                    type="text"
                    value={joinSlug}
                    onChange={(e) => setJoinSlug(e.target.value)}
                    placeholder="company-slug"
                    className="flex-1 min-w-0 px-2 py-1 text-xs rounded-md border border-input bg-background text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <button
                    type="submit"
                    disabled={!joinSlug.trim()}
                    className="p-1.5 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 transition-colors"
                    title="Go to Join"
                  >
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsJoinInputOpen(false);
                      setJoinSlug("");
                    }}
                    className="p-1.5 rounded-md text-muted-foreground hover:bg-muted transition-colors"
                    title="Cancel"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </form>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsJoinInputOpen(true)}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-lg transition-colors text-left"
                >
                  <KeyRound className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <span>Join another company</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  window.location.href = "/register-company";
                }}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-lg transition-colors text-left"
              >
                <Plus className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <span>Register a company</span>
              </button>
            </div>
          </div>

          {/* Theme & Settings Section */}
          <div className="py-1">
            <button
              type="button"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="w-full flex items-center gap-2.5 px-3 py-1.5 text-xs text-foreground hover:bg-muted/50 transition-colors text-left"
            >
              {theme === "dark" ? (
                <>
                  <Sun className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <span>Light mode</span>
                </>
              ) : (
                <>
                  <Moon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <span>Dark mode</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                router.push("/my-account");
              }}
              className="w-full flex items-center gap-2.5 px-3 py-1.5 text-xs text-foreground hover:bg-muted/50 transition-colors text-left"
            >
              <Building2 className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <span>My companies</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                router.push(cp("/settings"));
              }}
              className="w-full flex items-center gap-2.5 px-3 py-1.5 text-xs text-foreground hover:bg-muted/50 transition-colors text-left"
            >
              <Settings className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <span>Settings</span>
            </button>
          </div>

          {/* Logout Section */}
          <div className="border-t border-border pt-1">
            <button
              type="button"
              onClick={handleLogout}
              className="w-full flex items-center gap-2.5 px-3 py-1.5 text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors text-left"
            >
              <LogOut className="w-3.5 h-3.5 shrink-0" />
              <span>Log out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
