"use client";

import { useEffect, useState } from "react";
import { fetchMe } from "../../lib/api";
import { ShieldAlert, ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";

export function SystemAdminGuard({ children }: { children: React.ReactNode }) {
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    let mounted = true;
    fetchMe()
      .then((user) => {
        if (!mounted) return;
        // User is strictly system admin if is_system_admin === true
        if (user && user.is_system_admin === true) {
          setIsAuthorized(true);
        } else {
          setIsAuthorized(false);
        }
      })
      .catch((err) => {
        if (!mounted) return;
        console.error("SystemAdminGuard check error", err);
        setIsAuthorized(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  if (isAuthorized === null) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px] bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[500px] bg-background px-4 text-center">
        <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 mb-4 shadow-sm">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-foreground mb-2">Access Denied</h2>
        <p className="text-sm text-muted-foreground max-w-md mb-6 leading-relaxed">
          You do not have permission to access this page. System Administrator privileges are required.
        </p>
        <Link 
          href="/dashboard"
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-xs font-semibold rounded-lg hover:bg-primary/90 transition-colors shadow-sm cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Link>
      </div>
    );
  }

  return <>{children}</>;
}
