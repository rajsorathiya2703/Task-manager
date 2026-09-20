import * as crypto from 'crypto';
import {
  CATALOG_MODULES,
  CatalogModule,
  CATALOG_OPERATIONS,
  CatalogOperationDef,
  LegacyCatalogOperationDef,
  CATALOG_MODELS_AND_FIELDS,
} from './permissions.catalog';

export type PermissionAction = 'create' | 'read' | 'update' | 'delete';
export type OperationAction = 'read' | 'write' | 'update' | 'delete';
export type PermissionScope = 'own' | 'team' | 'all';

export interface PermissionCheck {
  module: string;
  action: PermissionAction;
  operation?: string;
  model?: string;
  field?: string;
  fields?: string[];
  isDeletingValue?: boolean;
}

export interface ExplainGroupResult {
  group: string;
  allowed: boolean;
  reason: string;
  scope: PermissionScope;
}

export interface CanAnyResult {
  allowed: boolean;
  scope: PermissionScope;
  results: ExplainGroupResult[];
}

export interface EffectivePermissions {
  groups: string[];
  permissions: string[];
  modulePermissions: Record<string, { create: boolean; read: boolean; update: boolean; delete: boolean }>;
  moduleScopes: Record<string, PermissionScope>;
  operationPermissions: Record<string, { read: boolean; write: boolean; update: boolean; delete: boolean }>;
  fieldPermissions: Record<string, Record<string, { read: boolean; write: boolean; update: boolean; delete: boolean }>>;
  version: string;
}

export interface CatalogDescriptor {
  modules?: readonly string[] | string[];
  operations?: readonly (CatalogOperationDef | LegacyCatalogOperationDef)[] | (CatalogOperationDef | LegacyCatalogOperationDef)[];
  modelsAndFields?: Record<string, string[]>;
}

const COMPENSATION_FIELDS = [
  'baseSalary',
  'currency',
  'payFrequency',
  'bankAccountNumber',
  'bankRoutingNumber',
  'taxId',
];

/**
 * explainGroup: Evaluates permission check within ONE user group.
 *
 * Evaluation order inside one group:
 * 1. Module Gate: Group must permit module.action. Scope is determined here.
 * 2. Operation Rule (if operation specified): Action 'create' maps to 'write'.
 *    Only restricts what the module grants. Missing rule inherits from module gate.
 * 3. Field Rule (if field/fields specified): Action 'create' maps to 'write'.
 *    Only restricts what the module grants. Missing rule inherits from module gate.
 */
export function explainGroup(group: any, check: PermissionCheck): ExplainGroupResult {
  const groupName = group?.name || 'Unnamed Group';

  // ── Step 1: Module Gate ──────────────────────────────────────────────────
  const modulePerm = group?.modulePermissions?.find(
    (mp: any) => mp.module === check.module,
  );

  let moduleAllowed = false;
  let groupScope: PermissionScope = (modulePerm?.scope as PermissionScope) || 'own';

  if (modulePerm) {
    moduleAllowed = Boolean(modulePerm[check.action]);
  } else {
    // Legacy permissions string array fallback (e.g. "tasks:read", "tasks:manage")
    const legacyPerms: string[] = group?.permissions || [];
    const hasLegacyManage = legacyPerms.includes(`${check.module}:manage`);
    const hasLegacyAction = legacyPerms.includes(`${check.module}:${check.action}`);
    const hasLegacyView = check.action === 'read' && legacyPerms.includes(`${check.module}:view`);
    moduleAllowed = Boolean(hasLegacyManage || hasLegacyAction || hasLegacyView);

    // Backward-compatibility: settings module grants read access to users and user-groups
    if (
      !moduleAllowed &&
      check.action === 'read' &&
      (check.module === 'users' || check.module === 'user-groups')
    ) {
      const settingsPerm = group?.modulePermissions?.find((mp: any) => mp.module === 'settings');
      if (
        settingsPerm?.read === true ||
        legacyPerms.includes('settings:read') ||
        legacyPerms.includes('settings:view') ||
        legacyPerms.includes('settings:manage')
      ) {
        moduleAllowed = true;
      }
    }
  }

  if (!moduleAllowed) {
    return {
      group: groupName,
      allowed: false,
      reason: `Module '${check.module}' does not grant action '${check.action}' in group '${groupName}'`,
      scope: 'own',
    };
  }

  // ── Step 2: Operation Rule ───────────────────────────────────────────────
  if (check.operation) {
    const opAction: OperationAction = check.action === 'create' ? 'write' : check.action;
    const opRule = group?.operationPermissions?.find(
      (op: any) => op.operation === check.operation,
    );

    if (opRule) {
      if (opRule[opAction] === false) {
        return {
          group: groupName,
          allowed: false,
          reason: `Operation '${check.operation}' explicitly denies action '${check.action}' in group '${groupName}'`,
          scope: groupScope,
        };
      }
    } else {
      // Sensitive operations require explicit grant and do not inherit from module gate
      if (
        check.operation.startsWith('dayoff.approvals') ||
        check.operation.startsWith('dayoff.policies') ||
        check.operation.startsWith('settings.')
      ) {
        return {
          group: groupName,
          allowed: false,
          reason: `Sensitive operation '${check.operation}' requires explicit grant in group '${groupName}'`,
          scope: groupScope,
        };
      }
    }
  }

  // ── Step 3: Field Rule ───────────────────────────────────────────────────
  const modelKey = check.model || check.module;
  const fieldsToCheck: string[] = [];

  if (check.fields && Array.isArray(check.fields) && check.fields.length > 0) {
    fieldsToCheck.push(...check.fields);
  } else if (check.field) {
    fieldsToCheck.push(check.field);
  }

  if (fieldsToCheck.length > 0) {
    const fieldAction: OperationAction = check.action === 'create' ? 'write' : check.action;

    // Check sensitive employee compensation operation if applicable
    if (modelKey === 'employees') {
      const hasCompField = fieldsToCheck.some((f) => COMPENSATION_FIELDS.includes(f));
      if (hasCompField) {
        const compRule = group?.operationPermissions?.find(
          (op: any) => op.operation === 'employees.compensation',
        );
        if (compRule && compRule[fieldAction] === false) {
          return {
            group: groupName,
            allowed: false,
            reason: `Operation 'employees.compensation' denies action '${check.action}' on sensitive compensation fields in group '${groupName}'`,
            scope: groupScope,
          };
        }
      }
    }

    // Check individual field rules
    for (const fieldName of fieldsToCheck) {
      const fieldRule = group?.fieldPermissions?.find(
        (fp: any) => fp.model === modelKey && fp.field === fieldName,
      );

      if (fieldRule) {
        if (fieldRule[fieldAction] === false) {
          return {
            group: groupName,
            allowed: false,
            reason: `Field '${fieldName}' on model '${modelKey}' explicitly denies action '${check.action}' in group '${groupName}'`,
            scope: groupScope,
          };
        }

        if (check.action === 'update' && check.isDeletingValue && fieldRule.delete === false) {
          return {
            group: groupName,
            allowed: false,
            reason: `Field '${fieldName}' on model '${modelKey}' explicitly denies delete during update in group '${groupName}'`,
            scope: groupScope,
          };
        }
      }
      // If no explicit field rule, inherit from module gate (already allowed)
    }
  }

  // ── Step 4: Granted ──────────────────────────────────────────────────────
  return {
    group: groupName,
    allowed: true,
    reason: `Action '${check.action}' on '${check.module}' granted by group '${groupName}'`,
    scope: groupScope,
  };
}

/**
 * canAny: Evaluates permission check across multiple user groups.
 *
 * - Logical OR across groups: if ANY group grants permission, action is allowed.
 * - Widest scope among granting groups ('all' > 'team' > 'own').
 * - Returns structured results with per-group explanations.
 */
export function canAny(groups: any[], check: PermissionCheck): CanAnyResult {
  if (!groups || !Array.isArray(groups) || groups.length === 0) {
    return {
      allowed: false,
      scope: 'own',
      results: [],
    };
  }

  const results: ExplainGroupResult[] = groups.map((g) => explainGroup(g, check));
  const grantingResults = results.filter((r) => r.allowed);
  const allowed = grantingResults.length > 0;

  let scope: PermissionScope = 'own';
  if (allowed) {
    if (grantingResults.some((r) => r.scope === 'all')) {
      scope = 'all';
    } else if (grantingResults.some((r) => r.scope === 'team')) {
      scope = 'team';
    } else {
      scope = 'own';
    }
  }

  return {
    allowed,
    scope,
    results,
  };
}

/**
 * isUnrestricted: Checks if a user bypasses normal group-level permissions.
 *
 * - System administrators bypass all checks (true).
 * - Membership in 'Administrators' group bypasses all checks (true).
 * - User with no groups: controlled by PERMISSIONS_DENY_WHEN_NO_GROUP env flag.
 *   Default: false (allows full access to keep today's behaviour; logs a warning).
 * - Otherwise: returns false (enforce group permissions).
 */
export function isUnrestricted(user?: any, groups?: any[]): boolean {
  if (user?.is_system_admin === true) {
    return true;
  }

  if (groups && Array.isArray(groups)) {
    const hasAdminGroup = groups.some(
      (g) => (typeof g === 'string' ? g : g?.name)?.trim().toLowerCase() === 'administrators',
    );
    if (hasAdminGroup) {
      return true;
    }
  }

  if (!groups || groups.length === 0) {
    const denyWhenNoGroup = process.env.PERMISSIONS_DENY_WHEN_NO_GROUP === 'true';
    if (denyWhenNoGroup) {
      return false;
    }
    const userId = user?.id || user?._id || 'unknown';
    console.warn(
      `[Permissions] Warning: User '${userId}' has no assigned user groups. PERMISSIONS_DENY_WHEN_NO_GROUP is false, granting unrestricted access.`,
    );
    return true;
  }

  return false;
}

/**
 * resolveEffective: Generates effective permission matrices across catalog definitions.
 *
 * Evaluates every module, operation, and model field against the user's groups.
 * If a field has read=false, it is removed from the effective map.
 * Returns flat maps and a deterministic version hash.
 */
export function resolveEffective(
  groups: any[],
  catalogDescriptor?: CatalogDescriptor,
): EffectivePermissions {
  const catalogModules = catalogDescriptor?.modules || CATALOG_MODULES;
  const catalogOperations = catalogDescriptor?.operations || CATALOG_OPERATIONS;
  const catalogModelsAndFields = catalogDescriptor?.modelsAndFields || CATALOG_MODELS_AND_FIELDS;

  const groupNames: string[] = (groups || []).map((g) => g?.name || '').filter(Boolean);
  const permissionsSet = new Set<string>();

  for (const group of groups || []) {
    if (Array.isArray(group?.permissions)) {
      group.permissions.forEach((p: string) => permissionsSet.add(p));
    }
  }

  const modulePermissions: Record<string, { create: boolean; read: boolean; update: boolean; delete: boolean }> = {};
  const moduleScopes: Record<string, PermissionScope> = {};
  const operationPermissions: Record<string, { read: boolean; write: boolean; update: boolean; delete: boolean }> = {};
  const fieldPermissions: Record<string, Record<string, { read: boolean; write: boolean; update: boolean; delete: boolean }>> = {};

  const actions: PermissionAction[] = ['create', 'read', 'update', 'delete'];

  // 1. Evaluate all catalog modules
  for (const mod of catalogModules) {
    modulePermissions[mod] = { create: false, read: false, update: false, delete: false };
    let widestScope: PermissionScope = 'own';

    for (const act of actions) {
      const res = canAny(groups, { module: mod, action: act });
      modulePermissions[mod][act] = res.allowed;
      if (res.allowed) {
        if (res.scope === 'all') {
          widestScope = 'all';
        } else if (res.scope === 'team' && widestScope !== 'all') {
          widestScope = 'team';
        }
      }
    }
    moduleScopes[mod] = widestScope;
  }

  // 2. Evaluate all catalog operations
  for (const opDef of catalogOperations) {
    const opKeyName = (opDef as any).key || (opDef as any).operation;
    if (!opKeyName) continue;
    operationPermissions[opKeyName] = { read: false, write: false, update: false, delete: false };

    for (const act of actions) {
      const res = canAny(groups, {
        module: opDef.module,
        action: act,
        operation: opKeyName,
      });
      const opKey: OperationAction = act === 'create' ? 'write' : act;
      operationPermissions[opKeyName][opKey] = res.allowed;
    }
  }

  // 3. Evaluate all catalog models and fields
  for (const [modelKey, fields] of Object.entries(catalogModelsAndFields)) {
    fieldPermissions[modelKey] = {};

    for (const fieldName of fields) {
      // First check read permission
      const readRes = canAny(groups, {
        module: modelKey,
        action: 'read',
        model: modelKey,
        field: fieldName,
      });

      // If read is false, field is omitted from effective map
      if (!readRes.allowed) {
        continue;
      }

      const writeRes = canAny(groups, {
        module: modelKey,
        action: 'create',
        model: modelKey,
        field: fieldName,
      });

      const updateRes = canAny(groups, {
        module: modelKey,
        action: 'update',
        model: modelKey,
        field: fieldName,
      });

      const deleteRes = canAny(groups, {
        module: modelKey,
        action: 'delete',
        model: modelKey,
        field: fieldName,
      });

      fieldPermissions[modelKey][fieldName] = {
        read: true,
        write: writeRes.allowed,
        update: updateRes.allowed,
        delete: deleteRes.allowed,
      };
    }
  }

  // Generate deterministic version hash
  const canonicalPayload = JSON.stringify({
    groupNames: [...groupNames].sort(),
    modulePermissions,
    moduleScopes,
    operationPermissions,
    fieldPermissions,
  });

  const version = crypto.createHash('sha256').update(canonicalPayload).digest('hex').substring(0, 16);

  return {
    groups: groupNames,
    permissions: Array.from(permissionsSet),
    modulePermissions,
    moduleScopes,
    operationPermissions,
    fieldPermissions,
    version,
  };
}
