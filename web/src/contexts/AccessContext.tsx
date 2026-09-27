"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import { usePathname } from "next/navigation";
import { fetchMe } from "../lib/api";

export type ActionType = "create" | "read" | "update" | "delete" | string;
export type ScopeType = "own" | "team" | "all" | "none";

export interface EffectiveRole {
  id: string;
  name: string;
  slug: string;
  priority: number;
  color: string;
}

export interface EffectiveFieldAccess {
  read: boolean;
  update: boolean;
}

export interface EffectiveModuleAccess {
  create: boolean;
  read: boolean;
  update: boolean;
  delete: boolean;
  scope: ScopeType;
  fields?: Record<string, EffectiveFieldAccess>;
  operations?: string[];
  [key: string]: any;
}

export interface AccessContextValue {
  /** Map of module ID to effective permissions, scope, and field grants */
  access: Record<string, EffectiveModuleAccess>;
  /** User's assigned roles sorted by priority descending */
  roles: EffectiveRole[];
  /** Compiled policy version timestamp/counter from the backend */
  policyVersion: number;
  /** True if user has superuser / system admin privileges */
  isSystemAdmin: boolean;
  /** Loading state while initial /auth/me call is in flight */
  loading: boolean;
  /** Error encountered while fetching access info */
  error: Error | null;
  /** Raw user object returned from /auth/me */
  user: any | null;
  /**
   * Check if user can perform an action on a module.
   * System admins always return true.
   * Defaults action to 'read'.
   */
  can: (module: string, action?: ActionType) => boolean;
  /**
   * Check if user can read or update a specific field on a module.
   * Returns false if module-level action is denied.
   * Evaluates field grants if defined; defaults to true if field is unconstrained.
   */
  canField: (module: string, field: string, action?: "read" | "update") => boolean;
  /**
   * Get full module access metadata (create/read/update/delete, scope, fields).
   */
  getModuleAccess: (module: string) => EffectiveModuleAccess | null;
  /** Refresh the user and policy snapshot from /auth/me */
  refreshAccess: () => Promise<void>;
}

const PUBLIC_ROUTES = ["/login", "/register", "/"];

const defaultContextValue: AccessContextValue = {
  access: {},
  roles: [],
  policyVersion: 0,
  isSystemAdmin: false,
  loading: true,
  error: null,
  user: null,
  can: () => false,
  canField: () => false,
  getModuleAccess: () => null,
  refreshAccess: async () => {},
};

export const AccessContext = createContext<AccessContextValue>(defaultContextValue);

export const AccessProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<any | null>(null);
  const [access, setAccess] = useState<Record<string, EffectiveModuleAccess>>({});
  const [roles, setRoles] = useState<EffectiveRole[]>([]);
  const [policyVersion, setPolicyVersion] = useState<number>(0);
  const [isSystemAdmin, setIsSystemAdmin] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  const pathname = usePathname();
  const isPublicRoute = PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname?.startsWith(route + "/")
  );

  const refreshAccess = useCallback(async () => {
    try {
      setError(null);
      const data = await fetchMe();
      if (!data) {
        setUser(null);
        setAccess({});
        setRoles([]);
        setPolicyVersion(0);
        setIsSystemAdmin(false);
        return;
      }

      setUser(data);
      setAccess(data.access || {});
      setRoles(data.roles || []);
      setPolicyVersion(data.policyVersion ?? 0);

      const sysAdmin = Boolean(
        data.is_system_admin === true ||
          data.roles?.some(
            (r: any) => r.slug === "system-admin" || (r.priority ?? 0) >= 1000
          )
      );
      setIsSystemAdmin(sysAdmin);
    } catch (err: any) {
      // 401 or public route network failures are expected during unauthenticated browsing
      if (err?.response?.status !== 401 && !isPublicRoute) {
        console.error("[AccessContext] Failed to fetch access metadata:", err);
      }
      setError(err);
      setUser(null);
      setAccess({});
      setRoles([]);
      setPolicyVersion(0);
      setIsSystemAdmin(false);
    } finally {
      setLoading(false);
    }
  }, [isPublicRoute]);

  useEffect(() => {
    refreshAccess();
  }, [pathname, refreshAccess]);

  const can = useCallback(
    (module: string, action: ActionType = "read"): boolean => {
      if (isSystemAdmin) return true;

      const mod = access[module];
      if (!mod) return false;

      if (action === "create" || action === "read" || action === "update" || action === "delete") {
        return Boolean(mod[action]);
      }

      // Check custom operation or flag
      if (typeof mod[action] === "boolean") {
        return mod[action];
      }

      if (Array.isArray(mod.operations) && mod.operations.includes(action)) {
        return true;
      }

      return false;
    },
    [access, isSystemAdmin]
  );

  const canField = useCallback(
    (module: string, field: string, action: "read" | "update" = "read"): boolean => {
      if (isSystemAdmin) return true;

      // Module-level permission is a prerequisite for reading/updating fields
      const moduleAction = action === "update" ? "update" : "read";
      if (!can(module, moduleAction)) {
        return false;
      }

      const mod = access[module];
      const fieldAccess = mod?.fields?.[field];

      if (fieldAccess && typeof fieldAccess[action] === "boolean") {
        return fieldAccess[action];
      }

      // If the field is not restricted in field grants, default to module permission (true)
      return true;
    },
    [access, isSystemAdmin, can]
  );

  const getModuleAccess = useCallback(
    (module: string): EffectiveModuleAccess | null => {
      return access[module] || null;
    },
    [access]
  );

  const contextValue = useMemo<AccessContextValue>(
    () => ({
      access,
      roles,
      policyVersion,
      isSystemAdmin,
      loading,
      error,
      user,
      can,
      canField,
      getModuleAccess,
      refreshAccess,
    }),
    [
      access,
      roles,
      policyVersion,
      isSystemAdmin,
      loading,
      error,
      user,
      can,
      canField,
      getModuleAccess,
      refreshAccess,
    ]
  );

  return (
    <AccessContext.Provider value={contextValue}>
      {children}
    </AccessContext.Provider>
  );
};

/**
 * Hook to access the full AccessContext state and helpers.
 */
export const useAccess = (): AccessContextValue => {
  return useContext(AccessContext);
};

export const useAccessControl = useAccess;

/**
 * Convenience hook to get the EffectiveModuleAccess for a single module.
 */
export const useModuleAccess = (module: string): EffectiveModuleAccess | null => {
  const { getModuleAccess } = useAccess();
  return getModuleAccess(module);
};
