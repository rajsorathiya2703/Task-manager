"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { usePathname } from "next/navigation";
import { fetchMyPermissions, setAccessDeniedHandler } from "../lib/api";
import { AccessDeniedModal } from "../components/common/AccessDeniedModal";

export interface ActionPerms {
  create: boolean;
  read: boolean;
  update: boolean;
  delete: boolean;
}

export interface FieldPerms {
  read: boolean;
  write: boolean;
  update: boolean;
  delete: boolean;
}

export interface PermissionsContextType {
  groups: string[];
  isSystemAdmin: boolean;
  modulePermissions: Record<string, ActionPerms>;
  operationPermissions: Record<string, ActionPerms>;
  fieldPermissions: Record<string, Record<string, FieldPerms>>;
  isLoading: boolean;
  refreshPermissions: () => Promise<void>;
  can: (module: string, action: "create" | "read" | "update" | "delete") => boolean;
  canOperation: (
    operation: string,
    action: "create" | "read" | "update" | "delete" | "write"
  ) => boolean;
  canField: (
    model: string,
    field: string,
    action: "read" | "write" | "update" | "delete"
  ) => boolean;
  isFieldEditable: (model: string, field: string) => boolean;
  showAccessDenied: (message?: string, title?: string) => void;
  closeAccessDenied: () => void;
}

const PermissionsContext = createContext<PermissionsContextType | undefined>(undefined);

export const PermissionsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [groups, setGroups] = useState<string[]>([]);
  const [isSystemAdmin, setIsSystemAdmin] = useState(false);
  const [modulePermissions, setModulePermissions] = useState<Record<string, ActionPerms>>({});
  const [operationPermissions, setOperationPermissions] = useState<Record<string, ActionPerms>>({});
  const [fieldPermissions, setFieldPermissions] = useState<Record<string, Record<string, FieldPerms>>>({});
  const [isLoading, setIsLoading] = useState(true);
  const pathname = usePathname();

  // Access Denied Modal State
  const [isAccessDeniedOpen, setIsAccessDeniedOpen] = useState(false);
  const [accessDeniedMessage, setAccessDeniedMessage] = useState<string | undefined>(undefined);
  const [accessDeniedTitle, setAccessDeniedTitle] = useState<string | undefined>(undefined);

  const showAccessDenied = useCallback((message?: string, title?: string) => {
    setAccessDeniedMessage(message);
    setAccessDeniedTitle(title || "Permission Required");
    setIsAccessDeniedOpen(true);
  }, []);

  const closeAccessDenied = useCallback(() => {
    setIsAccessDeniedOpen(false);
  }, []);

  // Register with api.ts interceptor
  useEffect(() => {
    setAccessDeniedHandler((msg) => {
      showAccessDenied(msg);
    });

    return () => {
      setAccessDeniedHandler(null);
    };
  }, [showAccessDenied]);

  const isPublicPage =
    pathname === "/login" ||
    pathname === "/register" ||
    pathname === "/" ||
    pathname.startsWith("/auth");

  const refreshPermissions = useCallback(async () => {
    if (isPublicPage) {
      setIsLoading(false);
      return;
    }

    try {
      const data = await fetchMyPermissions();
      if (data) {
        setGroups(data.groups || []);
        setIsSystemAdmin(data.is_system_admin === true);
        setModulePermissions(data.modulePermissions || {});
        setOperationPermissions(data.operationPermissions || {});
        setFieldPermissions(data.fieldPermissions || {});
      }
    } catch (err) {
      console.warn("Failed to load user permissions", err);
    } finally {
      setIsLoading(false);
    }
  }, [isPublicPage]);

  useEffect(() => {
    refreshPermissions();
  }, [refreshPermissions]);

  // Helper to check module permission
  const can = useCallback(
    (module: string, action: "create" | "read" | "update" | "delete"): boolean => {
      if (isSystemAdmin) {
        return true;
      }
      // If user is not assigned to any group, default to full access
      if (!groups || groups.length === 0) {
        return true;
      }

      const mod = modulePermissions[module];
      if (!mod) {
        // If module not explicitly restricted, default to allowed
        return true;
      }

      return mod[action] ?? true;
    },
    [isSystemAdmin, groups, modulePermissions]
  );

  // Helper to check granular operation permission (e.g., "tasks.comments", "dayoff.approvals")
  const canOperation = useCallback(
    (
      operation: string,
      action: "create" | "read" | "update" | "delete" | "write"
    ): boolean => {
      if (isSystemAdmin) {
        return true;
      }
      if (!groups || groups.length === 0) {
        return true;
      }

      const actionKey = (action === "write" ? "create" : action) as keyof ActionPerms;

      // 1. Direct operation match
      const op = operationPermissions[operation];
      if (op && op[actionKey] !== undefined) {
        return op[actionKey];
      }

      // 2. Fallback to parent module permission (e.g. "tasks.comments" -> "tasks")
      const moduleKey = operation.split(".")[0];
      const mod = modulePermissions[moduleKey];
      if (mod && mod[actionKey] !== undefined) {
        return mod[actionKey];
      }

      return true;
    },
    [isSystemAdmin, groups, operationPermissions, modulePermissions]
  );

  // Helper to check field-level permission
  const canField = useCallback(
    (
      model: string,
      field: string,
      action: "read" | "write" | "update" | "delete"
    ): boolean => {
      if (isSystemAdmin) {
        return true;
      }
      // If user is not assigned to any group, default to full access
      if (!groups || groups.length === 0) {
        return true;
      }

      const modelPerms = fieldPermissions[model];
      if (!modelPerms) {
        return true;
      }

      const fieldPerm = modelPerms[field];
      if (!fieldPerm) {
        return true;
      }

      return fieldPerm[action] ?? true;
    },
    [isSystemAdmin, groups, fieldPermissions]
  );

  // Helper to check if a field can be edited by the user
  const isFieldEditable = useCallback(
    (model: string, field: string): boolean => {
      if (isSystemAdmin) {
        return true;
      }
      if (!groups || groups.length === 0) {
        return true;
      }
      // If user cannot update the parent module at all, field is not editable
      if (!can(model, "update")) {
        return false;
      }
      // Check specific field update permission
      return canField(model, field, "update");
    },
    [isSystemAdmin, groups, can, canField]
  );

  return (
    <PermissionsContext.Provider
      value={{
        groups,
        isSystemAdmin,
        modulePermissions,
        operationPermissions,
        fieldPermissions,
        isLoading,
        refreshPermissions,
        can,
        canOperation,
        canField,
        isFieldEditable,
        showAccessDenied,
        closeAccessDenied,
      }}
    >
      {children}
      <AccessDeniedModal
        isOpen={isAccessDeniedOpen}
        onClose={closeAccessDenied}
        message={accessDeniedMessage}
        actionTitle={accessDeniedTitle}
      />
    </PermissionsContext.Provider>
  );
};

export const usePermissions = () => {
  const context = useContext(PermissionsContext);
  if (!context) {
    throw new Error("usePermissions must be used within a PermissionsProvider");
  }
  return context;
};
