/**
 * Permission Resolver — Pure function that evaluates a user's effective permissions
 * from their raw group documents using per-group OR semantics.
 *
 * Algorithm:
 *   For each group the user belongs to, evaluate independently:
 *     1. Does the group's modulePermission for this module allow the action?
 *     2. If field-level check: does the group allow the field action?
 *     3. If operation-level check: does the group allow the operation action?
 *
 *   Across groups: the MOST PERMISSIVE result wins (logical OR).
 *
 * This ensures that a restrictive rule in Group A does not override
 * a permissive rule in Group B.
 */

export interface PermissionCheck {
  module: string;
  action: 'create' | 'read' | 'update' | 'delete';
  model?: string;
  field?: string;
  operation?: string;
}

/** Minimal shape of a group document needed by the resolver. */
export interface GroupDoc {
  name: string;
  modulePermissions?: Array<{
    module: string;
    create: boolean;
    read: boolean;
    update: boolean;
    delete: boolean;
    scope?: string;
  }>;
  operationPermissions?: Array<{
    module: string;
    operation: string;
    read: boolean;
    write: boolean;
    update: boolean;
    delete: boolean;
  }>;
  fieldPermissions?: Array<{
    model: string;
    field: string;
    read: boolean;
    write: boolean;
    update: boolean;
    delete: boolean;
  }>;
}

export interface ResolverResult {
  allowed: boolean;
  scope: 'own' | 'team' | 'all';
  /** Which group(s) granted access. */
  grantedBy: string[];
}

const SCOPE_PRIORITY: Record<string, number> = { own: 0, team: 1, all: 2 };

function widestScope(a: string, b: string): 'own' | 'team' | 'all' {
  return (SCOPE_PRIORITY[a] ?? 0) >= (SCOPE_PRIORITY[b] ?? 0)
    ? (a as any)
    : (b as any);
}

/**
 * Evaluate whether a single group allows the given permission check.
 * Returns { allowed, scope } for that group.
 */
function evaluateGroup(
  group: GroupDoc,
  check: PermissionCheck,
): { allowed: boolean; scope: string } {
  const { module: modKey, action, model, field, operation } = check;

  // 1. Find the module permission entry for this module
  const modPerm = group.modulePermissions?.find((mp) => mp.module === modKey);
  if (!modPerm) {
    // This group says nothing about this module → not allowed by this group
    return { allowed: false, scope: 'own' };
  }

  // 2. Check module-level CRUD
  if (!modPerm[action]) {
    return { allowed: false, scope: modPerm.scope || 'own' };
  }

  // 3. If an operation is specified, check operation-level permission
  if (operation) {
    const opPerm = group.operationPermissions?.find((op) => op.operation === operation);
    if (opPerm) {
      // Map 'create' action to 'write' in operation permissions
      const opActionKey = action === 'create' ? 'write' : action;
      if (opPerm[opActionKey] === false) {
        return { allowed: false, scope: modPerm.scope || 'own' };
      }
    }
    // If no operation entry exists, fall through to module-level (allowed)
  }

  // 4. If field-level check, verify the field
  if (field && model) {
    const fieldPerm = group.fieldPermissions?.find(
      (fp) => fp.model === model && fp.field === field,
    );
    if (fieldPerm) {
      const fieldActionKey = action === 'create' ? 'write' : action;
      if (fieldPerm[fieldActionKey] === false) {
        return { allowed: false, scope: modPerm.scope || 'own' };
      }
    }
    // If no field entry exists, fall through (field is allowed by default in this group)
  }

  return { allowed: true, scope: modPerm.scope || 'own' };
}

/**
 * Resolve effective permissions for a user across all their groups.
 * Uses per-group OR semantics: if ANY group allows, the action is allowed.
 * The widest scope across granting groups wins.
 */
export function resolvePermission(
  groups: GroupDoc[],
  check: PermissionCheck,
): ResolverResult {
  if (groups.length === 0) {
    return { allowed: false, scope: 'own', grantedBy: [] };
  }

  let effectiveScope: 'own' | 'team' | 'all' = 'own';
  const grantedBy: string[] = [];

  for (const group of groups) {
    const result = evaluateGroup(group, check);
    if (result.allowed) {
      grantedBy.push(group.name);
      effectiveScope = widestScope(effectiveScope, result.scope);
    }
  }

  return {
    allowed: grantedBy.length > 0,
    scope: effectiveScope,
    grantedBy,
  };
}

/**
 * Resolve a user's full effective permissions summary (used by getUserPermissions).
 * Iterates all groups and builds the merged view with per-group OR semantics.
 */
export function resolveAllPermissions(groups: GroupDoc[]): {
  groups: string[];
  modulePermissions: Record<string, { create: boolean; read: boolean; update: boolean; delete: boolean; scope: string }>;
  operationPermissions: Record<string, { read: boolean; write: boolean; update: boolean; delete: boolean }>;
  fieldPermissions: Record<string, Record<string, { read: boolean; write: boolean; update: boolean; delete: boolean }>>;
} {
  const groupNames: string[] = [];
  const moduleMap: Record<string, { create: boolean; read: boolean; update: boolean; delete: boolean; scope: string }> = {};
  const operationMap: Record<string, { read: boolean; write: boolean; update: boolean; delete: boolean }> = {};
  const fieldMap: Record<string, Record<string, { read: boolean; write: boolean; update: boolean; delete: boolean }>> = {};

  for (const group of groups) {
    groupNames.push(group.name);

    // Module permissions — OR across groups
    if (group.modulePermissions) {
      for (const mp of group.modulePermissions) {
        if (!moduleMap[mp.module]) {
          moduleMap[mp.module] = { create: false, read: false, update: false, delete: false, scope: 'own' };
        }
        if (mp.create) moduleMap[mp.module].create = true;
        if (mp.read) moduleMap[mp.module].read = true;
        if (mp.update) moduleMap[mp.module].update = true;
        if (mp.delete) moduleMap[mp.module].delete = true;
        moduleMap[mp.module].scope = widestScope(moduleMap[mp.module].scope, mp.scope || 'own');
      }
    }

    // Operation permissions — OR across groups
    if (group.operationPermissions) {
      for (const op of group.operationPermissions) {
        if (!operationMap[op.operation]) {
          operationMap[op.operation] = { read: false, write: false, update: false, delete: false };
        }
        if (op.read) operationMap[op.operation].read = true;
        if (op.write) operationMap[op.operation].write = true;
        if (op.update) operationMap[op.operation].update = true;
        if (op.delete) operationMap[op.operation].delete = true;
      }
    }

    // Field permissions — per-group OR semantics:
    // If ANY group allows the field action, it is allowed.
    // We start with false and flip to true on any grant.
    if (group.fieldPermissions) {
      for (const fp of group.fieldPermissions) {
        if (!fieldMap[fp.model]) {
          fieldMap[fp.model] = {};
        }
        if (!fieldMap[fp.model][fp.field]) {
          fieldMap[fp.model][fp.field] = { read: false, write: false, update: false, delete: false };
        }
        if (fp.read) fieldMap[fp.model][fp.field].read = true;
        if (fp.write) fieldMap[fp.model][fp.field].write = true;
        if (fp.update) fieldMap[fp.model][fp.field].update = true;
        if (fp.delete) fieldMap[fp.model][fp.field].delete = true;
      }
    }
  }

  return {
    groups: groupNames,
    modulePermissions: moduleMap,
    operationPermissions: operationMap,
    fieldPermissions: fieldMap,
  };
}
