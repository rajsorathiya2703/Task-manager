"use client";

import React from "react";
import { Clock, AlertTriangle, Mail } from "lucide-react";

export interface TrialSubscription {
  status?: string;
  daysLeft?: number;
  trialEndsAt?: string | Date | null;
  salesEmail?: string;
}

export interface TrialBannerProps {
  subscription?: TrialSubscription | null;
}

export function TrialBanner({ subscription }: TrialBannerProps) {
  if (!subscription || subscription.status !== "trial") {
    return null;
  }

  const daysLeft =
    typeof subscription.daysLeft === "number" ? Math.max(0, subscription.daysLeft) : 0;
  const isUrgent = daysLeft <= 3;
  const salesEmail = subscription.salesEmail || "sales@example.com";

  let formattedDate = "";
  if (subscription.trialEndsAt) {
    try {
      const d = new Date(subscription.trialEndsAt);
      if (!isNaN(d.getTime())) {
        formattedDate = d.toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
          year: "numeric",
        });
      }
    } catch {
      formattedDate = "";
    }
  }

  const message = formattedDate
    ? `Free trial: ${daysLeft} day${daysLeft === 1 ? "" : "s"} left — contact sales to continue after ${formattedDate}`
    : `Free trial: ${daysLeft} day${daysLeft === 1 ? "" : "s"} left — contact sales to continue your subscription`;

  return (
    <div
      role="banner"
      className={`w-full py-2 px-4 text-xs font-medium border-b flex items-center justify-between gap-3 transition-colors ${
        isUrgent
          ? "bg-amber-500/10 border-amber-500/20 text-amber-700 dark:text-amber-300"
          : "bg-muted/70 border-border text-foreground"
      }`}
    >
      <div className="flex items-center gap-2 min-w-0">
        {isUrgent ? (
          <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
        ) : (
          <Clock className="w-3.5 h-3.5 text-primary shrink-0" />
        )}
        <span className="truncate">{message}</span>
      </div>

      <a
        href={`mailto:${salesEmail}?subject=Task%20Manager%20Subscription%20Inquiry`}
        className={`inline-flex items-center gap-1 shrink-0 font-semibold underline underline-offset-4 transition-colors ${
          isUrgent
            ? "text-amber-800 dark:text-amber-200 hover:text-amber-950 dark:hover:text-amber-100"
            : "text-primary hover:text-primary/80"
        }`}
      >
        <Mail className="w-3 h-3" />
        <span>Contact sales</span>
      </a>
    </div>
  );
}

export default TrialBanner;
