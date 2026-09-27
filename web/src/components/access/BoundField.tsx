"use client";

import React from "react";
import { useAccess } from "../../contexts/AccessContext";

export interface BoundFieldRenderProps {
  /** True if the user has permission to update this field */
  canUpdate: boolean;
  /** True if the user has permission to read this field */
  canRead: boolean;
  /** Convenience flag: true when field should be disabled (!canUpdate) */
  disabled: boolean;
}

export interface BoundFieldProps {
  /** Application module identifier, e.g. 'tasks', 'employees', 'projects' */
  module: string;
  /** Field identifier on the module, e.g. 'priority', 'baseSalary', 'status' */
  field: string;
  /**
   * Children can be:
   * 1. A single React element (e.g. <input />, <button />, <Select />):
   *    If canUpdate is false, `disabled: true` is automatically injected into its props.
   * 2. A render function: ({ canUpdate, canRead, disabled }) => React.ReactNode
   * 3. Multiple child elements or general ReactNode.
   */
  children?: React.ReactNode | ((props: BoundFieldRenderProps) => React.ReactNode);
  /**
   * Optional custom fallback when read permission is denied.
   * Defaults to null (completely omitted from DOM per §10.5).
   */
  readFallback?: React.ReactNode;
  /**
   * Optional custom loading placeholder while AccessContext is in flight.
   * Defaults to null to avoid flashing sensitive fields before access resolves.
   */
  loadingFallback?: React.ReactNode;
  /**
   * Optional helper text or tooltip to surface when update is disabled per §10.4.
   */
  disabledMessage?: string;
}

/**
 * BoundField (Phase 2 — P2-03)
 *
 * Wraps form controls and data fields to enforce surgical field-level access control:
 *   - Read Gate (§10.5 & §10.8): If `canField(module, field, 'read')` is false, renders nothing (null).
 *   - Update Gate (§10.4 & §10.8): If `canField(module, field, 'update')` is false, marks the control disabled.
 *
 * Usage:
 *   // Direct element injection
 *   <BoundField module="tasks" field="priority">
 *     <input value={priority} onChange={...} />
 *   </BoundField>
 *
 *   // Render-prop pattern for complex controls or layouts
 *   <BoundField module="tasks" field="priority">
 *     {({ disabled }) => (
 *       <div>
 *         <PriorityDropdown disabled={disabled} />
 *         {disabled && <span className="text-xs text-muted-foreground">You cannot change priority.</span>}
 *       </div>
 *     )}
 *   </BoundField>
 *
 * Matches §10.4, §10.5, and §10.8 of ACCESS_CONTROL_IMPLEMENTATION_PLAN.md.
 */
export function BoundField({
  module,
  field,
  children,
  readFallback = null,
  loadingFallback = null,
  disabledMessage,
}: BoundFieldProps) {
  const { canField, loading } = useAccess();

  if (loading) {
    return <>{loadingFallback}</>;
  }

  const canRead = canField(module, field, "read");
  if (!canRead) {
    return <>{readFallback}</>;
  }

  const canUpdate = canField(module, field, "update");
  const disabled = !canUpdate;

  if (typeof children === "function") {
    return <>{children({ canUpdate, canRead: true, disabled })}</>;
  }

  if (React.isValidElement(children)) {
    const childProps = (children as any).props || {};
    const isChildDisabled = Boolean(childProps.disabled || disabled);
    const isChildAriaDisabled = Boolean(
      childProps["aria-disabled"] || disabled
    );

    return React.cloneElement(children as React.ReactElement<any>, {
      disabled: isChildDisabled,
      "aria-disabled": isChildAriaDisabled,
      title: disabled && disabledMessage ? disabledMessage : childProps.title,
    });
  }

  return <>{children}</>;
}
