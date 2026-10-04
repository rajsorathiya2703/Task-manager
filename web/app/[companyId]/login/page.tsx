"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { fetchCompanyPublicInfo, fetchMe, fetchMembershipStatus } from "@/src/lib/api";
import { LoginCard } from "@/src/components/auth/LoginCard";
import { Card, CardContent } from "@/src/components/ui/Card";
import { Button } from "@/src/components/ui/Button";
import { Building2, AlertTriangle, ArrowLeft, Plus, Loader2 } from "lucide-react";

export default function CompanyLoginPage({
  params,
}: {
  params: Promise<{ companyId: string }>;
}) {
  const { companyId } = use(params);
  const slug = (companyId || "").trim().toLowerCase();
  const router = useRouter();

  const [company, setCompany] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isNotFound, setIsNotFound] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const initLogin = async () => {
      try {
        setIsLoading(true);
        setIsNotFound(false);

        // 1. Fetch public company info
        const info = await fetchCompanyPublicInfo(slug);
        if (!isMounted) return;

        if (!info) {
          setIsNotFound(true);
          setIsLoading(false);
          return;
        }

        setCompany(info);

        // 2. Check if user is already signed in
        try {
          const me = await fetchMe(slug);
          if (!isMounted) return;

          if (me && me.authType !== "guest") {
            // Check membership status
            const status = await fetchMembershipStatus(slug);
            if (!isMounted) return;

            if (status?.isMember) {
              try {
                localStorage.setItem("lastCompany", slug);
              } catch {}
              router.replace(`/${slug}/dashboard`);
              return;
            } else {
              router.replace(`/${slug}/join`);
              return;
            }
          }
        } catch {
          // Unauthenticated or guest, show login card
        }
      } catch (err: any) {
        if (!isMounted) return;
        console.error("Failed to load company info for login:", err);
        setIsNotFound(true);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    if (slug) {
      initLogin();
    }

    return () => {
      isMounted = false;
    };
  }, [slug, router]);

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-background py-12 px-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary mb-3" />
        <p className="text-xs text-muted-foreground">Loading workspace information...</p>
      </div>
    );
  }

  // 404: Company Not Found Card
  if (isNotFound || !company) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-background py-12 px-4">
        <Card className="w-full max-w-md shadow-lg border-border">
          <CardContent className="flex flex-col items-center text-center p-8 space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center shadow-xs">
              <Building2 className="w-7 h-7" />
            </div>

            <div className="space-y-1.5">
              <h2 className="text-xl font-bold tracking-tight text-foreground">
                Company Not Found
              </h2>
              <p className="text-xs text-muted-foreground leading-relaxed">
                We couldn&apos;t find an active company workspace matching{" "}
                <span className="font-mono font-semibold text-foreground">/{slug}</span>.
                Please check the URL or create a new workspace.
              </p>
            </div>

            <div className="w-full pt-4 flex flex-col gap-2.5">
              <Link href="/register-company" className="w-full">
                <Button variant="primary" fullWidth className="gap-2 h-11 rounded-xl shadow-xs">
                  <Plus className="w-4 h-4" />
                  <span>Register Company</span>
                </Button>
              </Link>

              <Link href="/" className="w-full">
                <Button variant="secondary" fullWidth className="gap-2 h-11 rounded-xl">
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back to Home</span>
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background py-12 px-4">
      <LoginCard
        companyName={company.name}
        logoUrl={company.logoUrl}
        slug={slug}
      />
    </div>
  );
}
