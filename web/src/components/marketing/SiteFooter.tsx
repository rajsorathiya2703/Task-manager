"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Mail, Phone } from "lucide-react";
import { siteConfig } from "@/src/content/site";

export function SiteFooter() {
  const currentYear = new Date().getFullYear();

  const productNavHrefs = ["/services", "/pricing", "/help"];
  const companyNavHrefs = ["/about", "/contact"];

  const productLinks = productNavHrefs.map((href) => {
    const found = siteConfig.nav.find((item) => item.href === href);
    return {
      href,
      label: found ? found.label : href.replace("/", ""),
    };
  });

  const companyLinks = companyNavHrefs.map((href) => {
    const found = siteConfig.nav.find((item) => item.href === href);
    return {
      href,
      label: found ? found.label : href.replace("/", ""),
    };
  });

  return (
    <footer className="border-t border-[var(--home-border)] bg-[var(--home-surface-container)] text-[var(--home-text-body)] transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 md:gap-12">
          {/* Column 1: Brand name + description */}
          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
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
            </div>
            <p className="text-sm text-[var(--home-text-muted)] leading-relaxed">
              {siteConfig.brand.description}
            </p>
          </div>

          {/* Column 2: Product */}
          <div>
            <h3 className="text-sm font-semibold text-[var(--home-headline)] tracking-wide">
              Product
            </h3>
            <ul className="mt-4 space-y-2.5 text-sm">
              {productLinks.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="text-[var(--home-text-muted)] hover:text-[var(--home-headline)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--home-primary)] rounded-sm"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3: Company */}
          <div>
            <h3 className="text-sm font-semibold text-[var(--home-headline)] tracking-wide">
              Company
            </h3>
            <ul className="mt-4 space-y-2.5 text-sm">
              {companyLinks.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="text-[var(--home-text-muted)] hover:text-[var(--home-headline)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--home-primary)] rounded-sm"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 4: Connect */}
          <div>
            <h3 className="text-sm font-semibold text-[var(--home-headline)] tracking-wide">
              Connect
            </h3>
            <ul className="mt-4 space-y-2.5 text-sm">
              <li>
                <a
                  href={`mailto:${siteConfig.contact.email}`}
                  className="inline-flex items-center gap-2 text-[var(--home-text-muted)] hover:text-[var(--home-headline)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--home-primary)] rounded-sm break-all"
                >
                  <Mail className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span>{siteConfig.contact.email}</span>
                </a>
              </li>
              <li>
                <a
                  href={`tel:${siteConfig.contact.phone.replace(/[^\d+]/g, "")}`}
                  className="inline-flex items-center gap-2 text-[var(--home-text-muted)] hover:text-[var(--home-headline)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--home-primary)] rounded-sm"
                >
                  <Phone className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span>{siteConfig.contact.phone}</span>
                </a>
              </li>
              <li>
                <a
                  href={siteConfig.contact.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[var(--home-text-muted)] hover:text-[var(--home-headline)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--home-primary)] rounded-sm inline-block"
                >
                  LinkedIn
                </a>
              </li>
              <li>
                <a
                  href={siteConfig.contact.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[var(--home-text-muted)] hover:text-[var(--home-headline)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--home-primary)] rounded-sm inline-block"
                >
                  Instagram
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 pt-8 border-t border-[var(--home-border)]">
          <p className="text-sm text-[var(--home-text-muted)]">
            © {currentYear} {siteConfig.brand.name}. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
