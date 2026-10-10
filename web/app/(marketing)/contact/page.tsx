import type { Metadata } from "next";
import { Mail, Phone, MapPin, Clock, ExternalLink } from "lucide-react";
import { siteConfig } from "@/src/content/site";
import { ContactForm } from "@/src/components/marketing/ContactForm";

export const metadata: Metadata = {
  title: "Contact",
};

interface ContactPageProps {
  searchParams: Promise<{ subject?: string }>;
}

export default async function ContactPage({ searchParams }: ContactPageProps) {
  const params = await searchParams;
  const defaultSubject = params?.subject || "";

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-start">
        {/* Left Column: Contact Information */}
        <div className="lg:col-span-5 space-y-8">
          <div className="space-y-4">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-foreground">
              Get in touch
            </h1>
            <p className="text-muted-foreground text-base sm:text-lg leading-relaxed">
              Have questions about {siteConfig.brand.name}, onboarding your team, or custom pricing? We are here to help you get the most out of your workspace.
            </p>
          </div>

          <div className="space-y-4">
            {/* Email Card */}
            <div className="bg-card border border-border/60 rounded-2xl p-5 shadow-xs flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-muted border border-border/60 flex items-center justify-center text-foreground shrink-0 mt-0.5">
                <Mail className="w-5 h-5" />
              </div>
              <div className="space-y-1 min-w-0">
                <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  Email Us
                </div>
                <a
                  href={`mailto:${siteConfig.contact.email}`}
                  className="text-sm font-medium text-foreground hover:underline break-all transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-xs"
                >
                  {siteConfig.contact.email}
                </a>
              </div>
            </div>

            {/* Phone Card */}
            <div className="bg-card border border-border/60 rounded-2xl p-5 shadow-xs flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-muted border border-border/60 flex items-center justify-center text-foreground shrink-0 mt-0.5">
                <Phone className="w-5 h-5" />
              </div>
              <div className="space-y-1 min-w-0">
                <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  Call Us
                </div>
                <a
                  href={`tel:${siteConfig.contact.phone.replace(/[^+\d]/g, "")}`}
                  className="text-sm font-medium text-foreground hover:underline transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-xs"
                >
                  {siteConfig.contact.phone}
                </a>
              </div>
            </div>

            {/* Address Card */}
            <div className="bg-card border border-border/60 rounded-2xl p-5 shadow-xs flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-muted border border-border/60 flex items-center justify-center text-foreground shrink-0 mt-0.5">
                <MapPin className="w-5 h-5" />
              </div>
              <div className="space-y-1 min-w-0">
                <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  Office Location
                </div>
                <p className="text-sm text-foreground">
                  {siteConfig.contact.address}
                </p>
              </div>
            </div>

            {/* Operating Hours Card */}
            <div className="bg-card border border-border/60 rounded-2xl p-5 shadow-xs flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-muted border border-border/60 flex items-center justify-center text-foreground shrink-0 mt-0.5">
                <Clock className="w-5 h-5" />
              </div>
              <div className="space-y-1 min-w-0">
                <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  Support Hours
                </div>
                <p className="text-sm text-foreground">
                  {siteConfig.contact.hours}
                </p>
              </div>
            </div>

            {/* Social Links */}
            <div className="pt-2 flex flex-wrap items-center gap-4 text-sm font-semibold">
              <a
                href={siteConfig.contact.linkedin}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-xs"
              >
                <span>LinkedIn</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
              <span className="text-border">•</span>
              <a
                href={siteConfig.contact.instagram}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-xs"
              >
                <span>Instagram</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>

        {/* Right Column: Contact Form */}
        <div className="lg:col-span-7">
          <ContactForm defaultSubject={defaultSubject} />
        </div>
      </div>
    </div>
  );
}
