"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { siteConfig } from "@/src/content/site";

export function SiteHeader() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  const isActive = (href: string) => {
    if (href === "/") {
      return pathname === "/";
    }
    return pathname.startsWith(href);
  };

  return (
    <header className="sticky top-0 z-40 h-16 border-b border-border/60 bg-background/80 backdrop-blur">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-full flex items-center justify-between">
        {/* Left: Logo mark + Brand name */}
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
                className={`h-16 inline-flex items-center border-b-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:rounded-sm ${
                  active
                    ? "text-foreground border-foreground font-semibold"
                    : "text-muted-foreground border-transparent hover:text-foreground"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Right: Actions (Desktop) */}
        <div className="hidden md:flex items-center gap-3">
          <Link
            href={siteConfig.cta.login.href}
            className="px-3.5 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {siteConfig.cta.login.label}
          </Link>
          <Link
            href={siteConfig.cta.trial.href}
            className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-full px-4 h-9 inline-flex items-center justify-center text-sm font-medium transition-colors shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            {siteConfig.cta.trial.label}
          </Link>
        </div>

        {/* Mobile Hamburger Button */}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="md:hidden p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors"
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
          className="md:hidden border-b border-border/60 bg-background/95 backdrop-blur px-4 pt-2 pb-6 shadow-lg"
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
                  className={`px-3 py-2.5 rounded-lg text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                    active
                      ? "bg-muted text-foreground font-semibold"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="flex flex-col gap-2 pt-2 border-t border-border/60">
            <Link
              href={siteConfig.cta.login.href}
              className="w-full text-center py-2.5 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {siteConfig.cta.login.label}
            </Link>
            <Link
              href={siteConfig.cta.trial.href}
              className="w-full text-center py-2.5 rounded-full bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              {siteConfig.cta.trial.label}
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
