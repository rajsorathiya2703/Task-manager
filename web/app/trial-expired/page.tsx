"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Lock, Mail, LogOut, Building2, ShieldCheck, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/src/components/ui/Card";
import { Button } from "@/src/components/ui/Button";
import { api, fetchMySubscription } from "@/src/lib/api";

function TrialExpiredContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const companySlug = searchParams.get("company") || undefined;

  const [salesEmail, setSalesEmail] = useState<string>("sales@example.com");
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    let mounted = true;
    fetchMySubscription(companySlug)
      .then((data) => {
        if (!mounted) return;
        if (data?.salesEmail) {
          setSalesEmail(data.salesEmail);
        }
      })
      .catch(() => {
        // Fallback email remains default
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [companySlug]);

  const handleLogout = async () => {
    try {
      setLoggingOut(true);
      await api.post("/auth/logout");
      router.push("/login");
    } catch {
      router.push("/login");
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 sm:p-6 bg-background">
      <Card className="max-w-md w-full shadow-lg border-border/80">
        <CardContent className="flex flex-col items-center text-center p-6 sm:p-8 space-y-6">
          {/* Centered lock / clock icon */}
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shadow-xs">
            <Lock className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Free trial completed
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Your 14 day free trial is completed. To continue the service, contact our sales team.
            </p>
          </div>

          {/* Actions */}
          <div className="w-full space-y-3 pt-2">
            <a
              href={`mailto:${salesEmail}?subject=Task%20Manager%20Subscription%20Inquiry`}
              className="w-full inline-flex items-center justify-center rounded-full text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background h-11 px-6 py-2 bg-primary text-primary-foreground hover:bg-primary/90 gap-2 shadow-sm"
            >
              <Mail className="w-4 h-4" />
              <span>Contact sales ({salesEmail})</span>
            </a>

            <div className="flex flex-col sm:flex-row gap-2.5 w-full">
              <Button
                type="button"
                variant="secondary"
                fullWidth
                disabled={loggingOut}
                onClick={handleLogout}
                className="gap-2"
              >
                {loggingOut ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <LogOut className="w-4 h-4" />
                )}
                <span>Log out</span>
              </Button>

              <Link
                href="/select-company"
                className="w-full inline-flex items-center justify-center rounded-full text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background h-11 px-4 py-2 bg-background text-foreground border border-border hover:bg-muted/50 gap-2"
              >
                <Building2 className="w-4 h-4 text-muted-foreground" />
                <span>Switch company</span>
              </Link>
            </div>
          </div>

          {/* Safe data note */}
          <div className="pt-2 border-t border-border/60 w-full flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>Your data is safe and will be available once sales activates your plan.</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function TrialExpiredPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen w-full flex items-center justify-center bg-background">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      }
    >
      <TrialExpiredContent />
    </Suspense>
  );
}
