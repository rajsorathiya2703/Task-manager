"use client";

import { Laptop, Tablet, Smartphone, CheckCircle2, XCircle, Monitor } from "lucide-react";

export function MobileRestrictionNotice() {
  return (
    <div
      id="mobile-view-restriction"
      className="fixed inset-0 z-[99999] flex md:hidden flex-col items-center justify-center p-6 bg-background text-foreground overflow-y-auto"
      role="alert"
      aria-live="assertive"
    >
      <div className="w-full max-w-sm mx-auto bg-card border border-border/80 rounded-3xl p-7 shadow-2xl text-center space-y-6 animate-in fade-in zoom-in-95 duration-200">
        {/* Device Graphics */}
        <div className="relative flex items-center justify-center pt-2">
          <div className="w-20 h-20 rounded-3xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-inner">
            <Monitor className="w-10 h-10" />
          </div>
          <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-500 bg-background shadow-xs">
            <Smartphone className="w-4 h-4" />
          </div>
        </div>

        {/* Badge & Headings */}
        <div className="space-y-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold tracking-wide uppercase bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            Screen Size Notice
          </span>
          <h2 className="text-xl font-extrabold tracking-tight text-foreground">
            Desktop & Tablet Only
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Currently the mobile view is not available. Please open this website on a laptop, tablet, or larger device to access the full workspace.
          </p>
        </div>

        {/* Supported Devices Matrix */}
        <div className="bg-muted/40 border border-border/60 rounded-2xl p-4 text-xs space-y-2.5 text-left">
          <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
            Device Compatibility
          </div>

          <div className="flex items-center justify-between py-1 border-b border-border/40">
            <div className="flex items-center gap-2.5 font-medium text-foreground">
              <Laptop className="w-4 h-4 text-emerald-500" />
              <span>Laptop / PC</span>
            </div>
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Supported
            </span>
          </div>

          <div className="flex items-center justify-between py-1 border-b border-border/40">
            <div className="flex items-center gap-2.5 font-medium text-foreground">
              <Tablet className="w-4 h-4 text-emerald-500" />
              <span>Tablet (iPad / Galaxy)</span>
            </div>
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Supported
            </span>
          </div>

          <div className="flex items-center justify-between py-1">
            <div className="flex items-center gap-2.5 font-medium text-muted-foreground">
              <Smartphone className="w-4 h-4 text-rose-500" />
              <span>Mobile Phones</span>
            </div>
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-500">
              <XCircle className="w-3.5 h-3.5" />
              Not Available
            </span>
          </div>
        </div>

        {/* Footer Hint */}
        <div className="text-[11px] text-muted-foreground">
          Minimum recommended width: <span className="font-semibold text-foreground">768px</span>
        </div>
      </div>
    </div>
  );
}
