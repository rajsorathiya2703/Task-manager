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
  modulePermissions: Record<string, ActionPerms>;
  fieldPermissions: Record<string, Record<string, FieldPerms>>;
  isLoading: boolean;
  refreshPermissions: () => Promise<void>;
  can: (module: string, action: "create" | "read" | "update" | "delete") => boolean;
  canField: (
    model: string,
    field: string,
    action: "read" | "write" | "update" | "delete"
  ) => boolean;
  showAccessDenied: (message?: string, title?: string) => void;
  closeAccessDenied: () => void;
}

const PermissionsContext = createContext<PermissionsContextType | undefined>(undefined);

export const PermissionsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [groups, setGroups] = useState<string[]>([]);
  const [modulePermissions, setModulePermissions] = useState<Record<string, ActionPerms>>({});
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
        setModulePermissions(data.modulePermissions || {});
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
      // If user is not assigned to any group, default to full access
      if (!groups || groups.length === 0) {
        return true;
      }

      const mod = modulePermissions[module];
      if (!mod) {
        // If module not explicitly restricted, check if any module permissions configured
        return true;
      }

      return mod[action] ?? true;
    },
    [groups, modulePermissions]
  );

  // Helper to check field-level permission
  const canField = useCallback(
    (
      model: string,
      field: string,
      action: "read" | "write" | "update" | "delete"
    ): boolean => {
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
    [groups, fieldPermissions]
  );

  return (
    <PermissionsContext.Provider
      value={{
        groups,
        modulePermissions,
        fieldPermissions,
        isLoading,
        refreshPermissions,
        can,
        canField,
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
