"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ShieldAlert, ArrowLeft, Home, Lock } from "lucide-react";

export interface AccessDeniedProps {
  /** Machine identifier or human-readable label of the restricted module */
  module?: string;
  /** Action attempted (e.g. 'read', 'create', 'update', 'delete') */
  action?: string;
  /** Custom heading title */
  title?: string;
  /** Custom detailed message */
  message?: string;
  /** Whether to show the 'Go to Dashboard' button (default: true) */
  showHomeButton?: boolean;
  /** Whether to show the 'Go Back' button (default: true) */
  showBackButton?: boolean;
  /** Optional custom CSS classes */
  className?: string;
}

export function AccessDenied({
  module,
  action = "read",
  title = "Access Denied",
  message,
  showHomeButton = true,
  showBackButton = true,
  className = "",
}: AccessDeniedProps) {
  const router = useRouter();

  const formattedModuleName = module
    ? module.charAt(0).toUpperCase() + module.slice(1).replace(".", " ")
    : "this resource";

  const defaultMessage = message || (
    <>
      You do not have permission to {action === "read" ? "view" : action}{" "}
      <span className="font-semibold text-foreground">
        {formattedModuleName}
      </span>
      . Your role does not grant access to this module. Please contact your
      organization administrator if you need access.
    </>
  );

  return (
    <div
      className={`min-h-[60vh] w-full flex flex-col items-center justify-center p-6 text-center ${className}`}
      role="alert"
      aria-live="polite"
    >
      <div className="w-full max-w-md mx-auto bg-card border border-border/80 rounded-3xl p-8 shadow-xl text-center space-y-6 animate-in fade-in zoom-in-95 duration-200">
        {/* Shield Icon Graphic */}
        <div className="relative flex items-center justify-center pt-2">
          <div className="w-20 h-20 rounded-3xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 shadow-inner">
            <ShieldAlert className="w-10 h-10" />
          </div>
          <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-500 bg-background shadow-xs">
            <Lock className="w-4 h-4" />
          </div>
        </div>

        {/* Badge & Headings */}
        <div className="space-y-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold tracking-wide uppercase bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20">
            Permission Required
          </span>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            {title}
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {defaultMessage}
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          {showBackButton && (
            <button
              type="button"
              onClick={() => router.back()}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-border bg-background hover:bg-muted text-foreground text-sm font-medium transition-colors shadow-xs"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Go Back</span>
            </button>
          )}

          {showHomeButton && (
            <Link
              href="/dashboard"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-medium transition-colors shadow-xs"
            >
              <Home className="w-4 h-4" />
              <span>Dashboard</span>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
