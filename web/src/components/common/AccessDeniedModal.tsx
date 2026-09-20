"use client";

import { ShieldAlert, X, Lock } from "lucide-react";

interface AccessDeniedModalProps {
  isOpen: boolean;
  onClose: () => void;
  message?: string;
  actionTitle?: string;
}

export function AccessDeniedModal({
  isOpen,
  onClose,
  message,
  actionTitle = "Permission Required",
}: AccessDeniedModalProps) {
  if (!isOpen) return null;

  const displayMessage =
    message ||
    "You do not have permission to perform this action. Please check your assigned user group permissions or contact your system administrator.";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-md bg-card border border-border/80 rounded-2xl shadow-2xl overflow-hidden p-6 animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
          title="Close"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header & Icon */}
        <div className="flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 shadow-sm mb-4">
            <ShieldAlert className="w-7 h-7" />
          </div>

          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-red-500 bg-red-500/10 px-2.5 py-0.5 rounded-full uppercase tracking-wider mb-2">
            <Lock className="w-3 h-3" /> Access Restricted
          </span>

          <h3 className="text-lg font-bold text-foreground tracking-tight">
            {actionTitle}
          </h3>

          {/* Error Message Box */}
          <div className="w-full mt-4 p-3.5 bg-muted/40 border border-border/60 rounded-xl text-left">
            <p className="text-xs font-medium text-foreground leading-relaxed">
              {displayMessage}
            </p>
          </div>

          {/* Advisory Note */}
          <p className="text-[11px] text-muted-foreground mt-4 text-center leading-normal">
            Your user group settings restrict this operation. If you believe this is in error, please contact your workspace administrator.
          </p>
        </div>

        {/* Action Button */}
        <div className="mt-6 flex items-center justify-center">
          <button
            onClick={onClose}
            className="w-full py-2.5 px-4 bg-primary text-primary-foreground font-medium text-xs rounded-xl shadow-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
          >
            Understood
          </button>
        </div>
      </div>
    </div>
  );
}
