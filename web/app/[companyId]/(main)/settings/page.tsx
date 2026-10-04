"use client";

import React, { use, useEffect, useState } from "react";
import { fetchCompany, fetchMe } from "@/src/lib/api";
import { useCompany } from "@/src/contexts/CompanyContext";
import { CompanySettingsForm } from "@/src/components/company/CompanySettingsForm";
import { Loader2, AlertCircle, Building2 } from "lucide-react";
import { Card, CardContent } from "@/src/components/ui/Card";

export default function SettingsPage({
  params,
}: {
  params: Promise<{ companyId: string }>;
}) {
  const { companyId } = use(params);
  const slug = (companyId || "").trim().toLowerCase();
  const { membership: contextMembership, user: contextUser } = useCompany();

  const [company, setCompany] = useState<any>(null);
  const [currentUser, setCurrentUser] = useState<any>(contextUser || null);
  const [isOwner, setIsOwner] = useState<boolean>(Boolean(contextMembership?.isCompanyOwner));
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadSettingsData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Fetch company profile & current user membership status in parallel
        const [companyData, meData] = await Promise.all([
          fetchCompany(slug).catch((err) => {
            console.error("Failed to load company profile:", err);
            return null;
          }),
          fetchMe(slug).catch(() => null),
        ]);

        if (!isMounted) return;

        if (!companyData) {
          setError("Failed to load workspace settings. Please verify access permissions.");
          setIsLoading(false);
          return;
        }

        setCompany(companyData);

        if (meData) {
          setCurrentUser(meData);
          const ownerFlag = Boolean(
            meData.membership?.isCompanyOwner ||
            meData.memberships?.find(
              (m: any) => m.companySlug?.toLowerCase() === slug.toLowerCase()
            )?.isCompanyOwner ||
            contextMembership?.isCompanyOwner
          );
          setIsOwner(ownerFlag);
        }
      } catch (err: any) {
        if (!isMounted) return;
        console.error("Settings load error:", err);
        setError("An unexpected error occurred while loading settings.");
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    if (slug) {
      loadSettingsData();
    }

    return () => {
      isMounted = false;
    };
  }, [slug, contextMembership]);

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[60vh] p-8">
        <Loader2 className="w-8 h-8 animate-spin text-primary mb-3" />
        <p className="text-xs text-muted-foreground">Loading workspace settings...</p>
      </div>
    );
  }

  if (error || !company) {
    return (
      <div className="flex-1 p-8 max-w-xl mx-auto flex items-center justify-center min-h-[60vh]">
        <Card className="rounded-2xl border-border bg-card w-full shadow-sm text-center">
          <CardContent className="p-8 space-y-4 flex flex-col items-center">
            <div className="w-12 h-12 rounded-2xl bg-red-500/10 text-red-500 border border-red-500/20 flex items-center justify-center">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">Settings Unavailable</h2>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                {error || "Unable to display settings for this company workspace."}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Settings
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Manage organization configuration, join policy, and workspace credentials for{" "}
            <strong className="text-foreground font-semibold">{company.name}</strong>.
          </p>
        </div>

        <CompanySettingsForm
          company={company}
          slug={slug}
          isOwner={isOwner}
          user={currentUser}
          onUpdateSuccess={(updated) => setCompany(updated)}
        />
      </div>
    </div>
  );
}
