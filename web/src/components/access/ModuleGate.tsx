"use client";

import React from "react";
import { useAccess, ActionType } from "../../contexts/AccessContext";
import { AccessDenied } from "./AccessDenied";

export interface ModuleGateProps {
  /** The module machine identifier to check (e.g. 'tasks', 'projects', 'employees') */
  module: string;
  /** Action required on the module (defaults to 'read') */
  action?: ActionType;
  /** Content to render when access is granted */
  children: React.ReactNode;
  /** Optional custom fallback component when access is denied */
  fallback?: React.ReactNode;
  /** Optional custom loading placeholder while access snapshot is loading */
  loadingFallback?: React.ReactNode;
}

export function ModuleGate({
  module,
  action = "read",
  children,
  fallback,
  loadingFallback,
}: ModuleGateProps) {
  const { can, loading } = useAccess();

  if (loading) {
    if (loadingFallback) {
      return <>{loadingFallback}</>;
    }
    return (
      <div className="flex min-h-[40vh] w-full items-center justify-center">
        <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const isAllowed = can(module, action);

  if (!isAllowed) {
    if (fallback) {
      return <>{fallback}</>;
    }
    return <AccessDenied module={module} action={action} />;
  }

  return <>{children}</>;
}
