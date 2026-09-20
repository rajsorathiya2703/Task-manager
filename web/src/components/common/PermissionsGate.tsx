"use client";

import React from "react";
import { usePermissions } from "../../contexts/PermissionsContext";
import { ActionKey, ModuleKey } from "../../types/permissions";

export interface PermissionsGateProps {
  module?: ModuleKey | string;
  action?: ActionKey;
  operation?: string;
  operationAction?: ActionKey | "write";
  model?: string;
  field?: string;
  fieldAction?: ActionKey | "write";
  children: React.ReactNode;
  fallback?: React.ReactNode;
  loadingSkeleton?: React.ReactNode;
}

export const PermissionsGate: React.FC<PermissionsGateProps> = ({
  module,
  action = "read",
  operation,
  operationAction = "read",
  model,
  field,
  fieldAction = "read",
  children,
  fallback = null,
  loadingSkeleton,
}) => {
  const { can, canOperation, canField, status } = usePermissions();

  if (status === "loading") {
    if (loadingSkeleton !== undefined) {
      return <>{loadingSkeleton}</>;
    }
    return (
      <div className="animate-pulse bg-muted/60 rounded-md h-5 w-full min-w-[80px]" />
    );
  }

  // Field-level check
  if (model && field) {
    const hasFieldAccess = canField(model, field, fieldAction);
    if (!hasFieldAccess) {
      return <>{fallback}</>;
    }
  }

  // Operation-level check
  if (operation) {
    const hasOpAccess = canOperation(operation, operationAction);
    if (!hasOpAccess) {
      return <>{fallback}</>;
    }
  }

  // Module-level check
  if (module) {
    const hasModuleAccess = can(module, action);
    if (!hasModuleAccess) {
      return <>{fallback}</>;
    }
  }

  return <>{children}</>;
};
