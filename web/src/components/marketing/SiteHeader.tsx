"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { siteConfig } from "@/src/content/site";
import { fetchMe } from "@/src/lib/api";

export function SiteHeader() {
  const [isOpen, setIsOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const pathname = usePathname();

  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  useEffect(() => {
    let isMounted = true;
    fetchMe()
      .then((data) => {
        if (!isMounted) return;
        if (data && data.authType !== "guest") {
          setUser(data);
        } else {
          setUser(null);
        }
      })
      .catch(() => {
        if (isMounted) setUser(null);
      });

    return () => {
      isMounted = false;
    };
  }, [pathname]);

  const isActive = (href: string) => {
    if (href === "/") {
      return pathname === "/";
    }
    return pathname.startsWith(href);
  };

  return (
    <header className="sticky top-0 z-40 h-16 border-b border-[var(--home-border)] bg-[var(--home-surface)]/85 backdrop-blur-md transition-colors duration-300">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-full flex items-center justify-between">
        {/* Left: Logo mark + Brand name */}
        <Link
          href="/"
          className="flex items-center gap-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--home-primary)] rounded-lg py-1 px-1.5 -ml-1.5 transition-colors"
        >
          <div
            className="w-9 h-9 flex items-center justify-center shrink-0"
            aria-hidden="true"
          >
            <img
              src="/logo.png"
              alt="Pyramid Logo"
              className="w-full h-full object-contain"
            />
          </div>
          <span className="text-lg font-bold tracking-tight text-[var(--home-headline)]">
            {siteConfig.brand.name}
          </span>
        </Link>

        {/* Center: Desktop Nav */}
        <nav
          className="hidden md:flex items-center gap-6 h-full"
          aria-label="Main Navigation"
        >
          {siteConfig.nav.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`h-16 inline-flex items-center border-b-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--home-primary)] focus-visible:rounded-sm ${active
                  ? "text-[var(--home-headline)] border-[var(--home-primary)] font-semibold"
                  : "text-[var(--home-text-muted)] border-transparent hover:text-[var(--home-headline)]"
                  }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Right: Actions (Desktop) */}
        <div className="hidden md:flex items-center gap-3">
          {user ? (
            <Link
              href="/my-account"
              className="bg-[var(--home-primary)] text-[var(--home-on-primary)] hover:bg-[var(--home-primary-hover)] border border-[var(--home-border-subtle)] rounded-full px-5 h-9 inline-flex items-center justify-center text-sm font-semibold transition-all shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--home-primary)] focus-visible:ring-offset-2"
            >
              Go to account
            </Link>
          ) : (
            <>
              <Link
                href={siteConfig.cta.login.href}
                className="px-3.5 py-2 text-sm font-medium text-[var(--home-text-muted)] hover:text-[var(--home-headline)] hover:bg-[var(--home-surface-container)] rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--home-primary)]"
              >
                {siteConfig.cta.login.label}
              </Link>
              <Link
                href={siteConfig.cta.trial.href}
                className="bg-[var(--home-primary)] text-[var(--home-on-primary)] hover:bg-[var(--home-primary-hover)] border border-[var(--home-border-subtle)] rounded-full px-4 h-9 inline-flex items-center justify-center text-sm font-medium transition-all shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--home-primary)] focus-visible:ring-offset-2"
              >
                {siteConfig.cta.trial.label}
              </Link>
            </>
          )}
        </div>

        {/* Mobile Hamburger Button */}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="md:hidden p-2 rounded-lg text-[var(--home-text-muted)] hover:text-[var(--home-headline)] hover:bg-[var(--home-surface-container)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--home-primary)] transition-colors"
          aria-label={isOpen ? "Close menu" : "Open menu"}
          aria-expanded={isOpen}
          aria-controls="mobile-nav-panel"
        >
          {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile Nav Panel */}
      {isOpen && (
        <div
          id="mobile-nav-panel"
          className="md:hidden border-b border-[var(--home-border)] bg-[var(--home-surface)]/95 backdrop-blur-md px-4 pt-2 pb-6 shadow-lg"
        >
          <nav
            className="flex flex-col space-y-1 pb-4"
            aria-label="Mobile Navigation"
          >
            {siteConfig.nav.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-3 py-2.5 rounded-lg text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--home-primary)] ${active
                    ? "bg-[var(--home-surface-container)] text-[var(--home-headline)] font-semibold"
                    : "text-[var(--home-text-muted)] hover:text-[var(--home-headline)] hover:bg-[var(--home-surface-container)]"
                    }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="flex flex-col gap-2 pt-2 border-t border-[var(--home-border)]">
            {user ? (
              <Link
                href="/my-account"
                className="w-full text-center py-2.5 rounded-full bg-[var(--home-primary)] text-[var(--home-on-primary)] text-sm font-semibold hover:bg-[var(--home-primary-hover)] transition-colors shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--home-primary)] focus-visible:ring-offset-2"
              >
                Go to account
              </Link>
            ) : (
              <>
                <Link
                  href={siteConfig.cta.login.href}
                  className="w-full text-center py-2.5 rounded-lg border border-[var(--home-border)] text-sm font-medium text-[var(--home-headline)] hover:bg-[var(--home-surface-container)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--home-primary)]"
                >
                  {siteConfig.cta.login.label}
                </Link>
                <Link
                  href={siteConfig.cta.trial.href}
                  className="w-full text-center py-2.5 rounded-full bg-[var(--home-primary)] text-[var(--home-on-primary)] text-sm font-medium hover:bg-[var(--home-primary-hover)] transition-colors shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--home-primary)] focus-visible:ring-offset-2"
                >
                  {siteConfig.cta.trial.label}
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
