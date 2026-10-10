import Link from "next/link";
import { Mail } from "lucide-react";
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
    <footer className="border-t border-border/60 bg-card">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 md:gap-12">
          {/* Column 1: Brand name + description */}
          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
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
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {siteConfig.brand.description}
            </p>
          </div>

          {/* Column 2: Product */}
          <div>
            <h3 className="text-sm font-semibold text-foreground tracking-wide">
              Product
            </h3>
            <ul className="mt-4 space-y-2.5 text-sm">
              {productLinks.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3: Company */}
          <div>
            <h3 className="text-sm font-semibold text-foreground tracking-wide">
              Company
            </h3>
            <ul className="mt-4 space-y-2.5 text-sm">
              {companyLinks.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 4: Connect */}
          <div>
            <h3 className="text-sm font-semibold text-foreground tracking-wide">
              Connect
            </h3>
            <ul className="mt-4 space-y-2.5 text-sm">
              <li>
                <a
                  href={`mailto:${siteConfig.contact.email}`}
                  className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm break-all"
                >
                  <Mail className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span>{siteConfig.contact.email}</span>
                </a>
              </li>
              <li>
                <a
                  href={siteConfig.contact.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm inline-block"
                >
                  LinkedIn
                </a>
              </li>
              <li>
                <a
                  href={siteConfig.contact.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm inline-block"
                >
                  Instagram
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 pt-8 border-t border-border/60">
          <p className="text-sm text-muted-foreground">
            © {currentYear} {siteConfig.brand.name}. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
