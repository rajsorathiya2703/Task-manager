"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
} from "react";
import { usePathname } from "next/navigation";
import { fetchMyPermissions, setAccessDeniedHandler } from "../lib/api";
import { AccessDeniedModal } from "../components/common/AccessDeniedModal";
import {
  ActionKey,
  ActionPerms,
  FieldPerms,
  ModuleKey,
  PermissionsContextType,
  PermissionsStatus,
  ScopeKey,
} from "../types/permissions";
import { AlertCircle, RefreshCw } from "lucide-react";

export type { ActionPerms, FieldPerms, PermissionsContextType };

const PermissionsContext = createContext<PermissionsContextType | undefined>(undefined);

const RETRY_DELAYS = [1000, 2000, 4000];

export const PermissionsProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [status, setStatus] = useState<PermissionsStatus>("loading");
  const [isStale, setIsStale] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const [groups, setGroups] = useState<string[]>([]);
  const [modulePermissions, setModulePermissions] = useState<Record<string, ActionPerms>>({});
  const [moduleScopes, setModuleScopes] = useState<Record<string, ScopeKey>>({});
  const [operationPermissions, setOperationPermissions] = useState<Record<string, ActionPerms>>({});
  const [fieldPermissions, setFieldPermissions] = useState<Record<string, Record<string, FieldPerms>>>({});
  const [version, setVersion] = useState<string>("");

  const versionRef = useRef<string>("");
  const isMountedRef = useRef<boolean>(true);
  const isFetchingRef = useRef<boolean>(false);
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

  // Core fetch logic with version comparison and retry
  const fetchWithRetry = useCallback(async (maxRetries = 0): Promise<any> => {
    let attempt = 0;
    while (attempt <= maxRetries) {
      try {
        const data = await fetchMyPermissions();
        return data;
      } catch (err: any) {
        if (err?.response?.status === 401) {
          if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
            window.location.href = "/login";
          }
          throw err;
        }

        if (attempt < maxRetries) {
          const delay = RETRY_DELAYS[attempt] || 4000;
          await new Promise((res) => setTimeout(res, delay));
          attempt++;
        } else {
          throw err;
        }
      }
    }
  }, []);

  const refreshPermissions = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (isPublicPage) {
        setStatus("ready");
        return;
      }

      if (isFetchingRef.current) return;
      isFetchingRef.current = true;

      const isSilent = opts?.silent ?? false;
      if (!isSilent && status !== "ready") {
        setStatus("loading");
      }

      try {
        // If not ready yet, retry up to 3 times
        const retryCount = status === "ready" ? 0 : 3;
        const data = await fetchWithRetry(retryCount);

        if (!isMountedRef.current) return;

        if (data) {
          const newVersion = data.version || "";
          if (!newVersion || newVersion !== versionRef.current) {
            versionRef.current = newVersion;
            setGroups(data.groups || []);
            setModulePermissions(data.modulePermissions || {});
            setModuleScopes(data.moduleScopes || {});
            setOperationPermissions(data.operationPermissions || {});
            setFieldPermissions(data.fieldPermissions || {});
            setVersion(newVersion);
          }
          setStatus("ready");
          setIsStale(false);
          setError(null);
        }
      } catch (err: any) {
        if (!isMountedRef.current) return;
        console.warn("[PermissionsContext] Failed to load user permissions", err);

        if (status === "ready") {
          // Already have cached permissions, silently flag as stale
          setIsStale(true);
        } else {
          // Initial load failed after all retries: fail closed
          setStatus("error");
          setError(err instanceof Error ? err : new Error(String(err)));
        }
      } finally {
        isFetchingRef.current = false;
      }
    },
    [isPublicPage, status, fetchWithRetry]
  );

  // Mount tracking
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // 1. Initial load on mount
  useEffect(() => {
    refreshPermissions();
  }, [refreshPermissions]);

  // 2. Route changes
  useEffect(() => {
    if (!isPublicPage && status === "ready") {
      refreshPermissions({ silent: true });
    }
  }, [pathname, isPublicPage, refreshPermissions, status]);

  // 3. Window focus, visibility change, 60s periodic timer, 403 event
  useEffect(() => {
    if (isPublicPage) return;

    const handleFocus = () => {
      refreshPermissions({ silent: true });
    };

    const handleVisibility = () => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        refreshPermissions({ silent: true });
      }
    };

    const handleForbidden = () => {
      refreshPermissions({ silent: true });
    };

    if (typeof window !== "undefined") {
      window.addEventListener("focus", handleFocus);
      window.addEventListener("antigravity:forbidden", handleForbidden);
    }
    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", handleVisibility);
    }

    // 60-second periodic refresh
    const interval = setInterval(() => {
      refreshPermissions({ silent: true });
    }, 60_000);

    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("focus", handleFocus);
        window.removeEventListener("antigravity:forbidden", handleForbidden);
      }
      if (typeof document !== "undefined") {
        document.removeEventListener("visibilitychange", handleVisibility);
      }
      clearInterval(interval);
    };
  }, [isPublicPage, refreshPermissions]);

  // FAIL-CLOSED: Helper to check module permission
  const can = useCallback(
    (module: ModuleKey | string, action: ActionKey): boolean => {
      // Fail closed: never grant access while loading or in error state
      if (status !== "ready") {
        return false;
      }

      // Full access comes ONLY from an "Administrators" group
      if (groups.some((g) => g.trim().toLowerCase() === "administrators")) {
        return true;
      }

      // Deny by default: If user is not assigned to any group, deny access
      if (!groups || groups.length === 0) {
        return false;
      }

      const mod = modulePermissions[module];
      if (!mod) {
        return false;
      }

      return Boolean(mod[action]);
    },
    [status, groups, modulePermissions]
  );

  // FAIL-CLOSED: Helper to check granular operation permission
  const canOperation = useCallback(
    (operation: string, action: ActionKey | "write"): boolean => {
      if (status !== "ready") {
        return false;
      }

      if (groups.some((g) => g.trim().toLowerCase() === "administrators")) {
        return true;
      }

      if (!groups || groups.length === 0) {
        return false;
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

      return false;
    },
    [status, groups, operationPermissions, modulePermissions]
  );

  // FAIL-CLOSED: Helper to check field-level permission
  const canField = useCallback(
    (model: string, field: string, action: ActionKey | "write"): boolean => {
      if (status !== "ready") {
        return false;
      }

      if (groups.some((g) => g.trim().toLowerCase() === "administrators")) {
        return true;
      }

      if (!groups || groups.length === 0) {
        return false;
      }

      const actKey = (action === "write" ? "create" : action) as ActionKey;

      // Fail-closed: User cannot perform field action if parent module permission is not granted
      if (!can(model, actKey)) {
        return false;
      }

      // Check compensation operation permissions for employee payroll fields
      const PAYROLL_FIELDS = [
        "baseSalary",
        "currency",
        "payFrequency",
        "bankAccountNumber",
        "bankRoutingNumber",
        "taxId",
      ];
      if (model === "employees" && PAYROLL_FIELDS.includes(field)) {
        const compPerm = operationPermissions["employees.compensation"];
        if (compPerm) {
          if (compPerm[actKey] === false) {
            return false;
          }
        }
      }

      // Check core operation permissions if applicable (e.g. tasks.core for tasks)
      const coreOpKey = `${model}.core`;
      if (operationPermissions[coreOpKey]) {
        const opActionKey = (action === "write" ? "write" : action) as keyof ActionPerms;
        if (operationPermissions[coreOpKey][opActionKey] === false) {
          return false;
        }
      }

      const modelPerms = fieldPermissions[model];
      if (!modelPerms) {
        return true;
      }

      const fieldPerm = modelPerms[field];
      if (!fieldPerm) {
        return true;
      }

      const fieldActionKey = action as keyof FieldPerms;
      return fieldPerm[fieldActionKey] ?? true;
    },
    [status, groups, fieldPermissions, operationPermissions, can]
  );

  // FAIL-CLOSED: Helper to resolve scope for a module
  const scopeOf = useCallback(
    (module: ModuleKey | string): ScopeKey => {
      if (status !== "ready") {
        return "own";
      }

      if (groups.some((g) => g.trim().toLowerCase() === "administrators")) {
        return "all";
      }

      return moduleScopes[module] || "own";
    },
    [status, groups, moduleScopes]
  );

  // FAIL-CLOSED: Helper to check if a specific field is editable
  const isFieldEditable = useCallback(
    (model: string, field: string): boolean => {
      if (status !== "ready") {
        return false;
      }
      return canField(model, field, "update");
    },
    [status, canField]
  );

  const isReady = status === "ready";
  const isLoading = status === "loading";

  return (
    <PermissionsContext.Provider
      value={{
        status,
        isReady,
        isLoading,
        isStale,
        error,
        groups,
        modulePermissions,
        moduleScopes,
        operationPermissions,
        fieldPermissions,
        version,
        refreshPermissions,
        can,
        canOperation,
        canField,
        scopeOf,
        isFieldEditable,
        showAccessDenied,
        closeAccessDenied,
      }}
    >
      {status === "error" && (
        <div className="w-full bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 text-xs text-amber-600 dark:text-amber-400 flex items-center justify-between z-50 sticky top-0 backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>
              Unable to sync latest permissions. Some features may be restricted.
            </span>
          </div>
          <button
            onClick={() => refreshPermissions()}
            className="flex items-center gap-1 font-semibold underline hover:text-amber-700 dark:hover:text-amber-300 transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3 h-3" />
            Retry
          </button>
        </div>
      )}

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
