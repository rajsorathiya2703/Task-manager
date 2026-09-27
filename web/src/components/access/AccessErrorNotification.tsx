"use client";

import React, { useState, useEffect, useCallback } from "react";
import { ShieldAlert, X } from "lucide-react";

export interface AccessDeniedDetail {
  id: string;
  message: string;
  module?: string;
  action?: string;
  code?: string;
  fields?: string[];
  url?: string;
  method?: string;
  timestamp: number;
}

export function AccessErrorNotification() {
  const [alerts, setAlerts] = useState<AccessDeniedDetail[]>([]);

  const removeAlert = useCallback((id: string) => {
    setAlerts((prev) => prev.filter((item) => item.id !== id));
  }, []);

  useEffect(() => {
    const handleAccessDenied = (event: Event) => {
      const customEvent = event as CustomEvent<AccessDeniedDetail>;
      const detail = customEvent.detail;
      if (!detail) return;

      setAlerts((prev) => {
        // Prevent duplicate toasts if the exact same message was shown within 2.5 seconds
        const isDuplicate = prev.some(
          (a) => a.message === detail.message && Date.now() - a.timestamp < 2500
        );
        if (isDuplicate) return prev;

        // Keep maximum 3 alerts visible at once
        return [...prev, detail].slice(-3);
      });

      // Auto dismiss after 6 seconds
      setTimeout(() => {
        removeAlert(detail.id);
      }, 6000);
    };

    window.addEventListener("app:access-denied", handleAccessDenied);
    return () => {
      window.removeEventListener("app:access-denied", handleAccessDenied);
    };
  }, [removeAlert]);

  if (alerts.length === 0) return null;

  return (
    <div
      className="fixed bottom-5 right-5 z-[99999] flex flex-col gap-2.5 max-w-md w-full px-4 sm:px-0 pointer-events-none"
      role="region"
      aria-label="Access Error Notifications"
    >
      {alerts.map((alert) => (
        <div
          key={alert.id}
          className="pointer-events-auto bg-card border border-red-500/30 dark:border-red-500/40 rounded-2xl p-4 shadow-2xl backdrop-blur-md bg-opacity-95 dark:bg-opacity-95 transition-all duration-200 animate-in slide-in-from-bottom-5 fade-in zoom-in-95 flex items-start gap-3.5"
          role="alert"
        >
          {/* Icon Badge */}
          <div className="w-9 h-9 rounded-xl bg-red-500/15 border border-red-500/25 flex items-center justify-center text-red-600 dark:text-red-400 shrink-0 mt-0.5 shadow-xs">
            <ShieldAlert className="w-5 h-5" />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0 pr-1">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="font-semibold text-xs text-red-600 dark:text-red-400 tracking-wide uppercase">
                403 Access Denied
              </span>
              {alert.module && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-medium bg-muted text-muted-foreground border border-border/60">
                  {alert.module}
                  {alert.action ? `:${alert.action}` : ""}
                </span>
              )}
              {alert.code === "FIELD_FORBIDDEN" && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/25">
                  Field Restricted
                </span>
              )}
            </div>

            <p className="text-xs text-foreground font-medium leading-relaxed break-words">
              {alert.message}
            </p>

            {alert.fields && alert.fields.length > 0 && (
              <div className="mt-1.5 flex items-center gap-1 flex-wrap text-[11px] text-muted-foreground">
                <span className="font-normal">Restricted fields:</span>
                {alert.fields.map((f) => (
                  <span
                    key={f}
                    className="font-mono px-1.5 py-0.5 rounded bg-muted text-foreground text-[10px] border border-border/50"
                  >
                    {f}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Dismiss button */}
          <button
            onClick={() => removeAlert(alert.id)}
            className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-muted transition-colors shrink-0 cursor-pointer"
            title="Dismiss notification"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
