/**
 * Policy Decision Point (PDP) Engine (Phase 0 — P0-04)
 *
 * Pure function `can(subject, action, module, resource?, policy): Decision`.
 *
 * Implements:
 *   • Multi-role merge algorithm from §7 (additive OR across roles, MAX scope rank, UNION operations).
 *   • Module-vs-field invariant table from §8:
 *       field.read   ⊆ module.read
 *       field.update ⊆ module.update ∩ field.read
 *   • Record-level scope & relationship matching from §6.
 *
 * Constraints:
 *   • Pure TypeScript — zero database or network calls, deterministic.
 *   • Safe when modules, fields, or roles are missing (defaults to DENY).
 *
 * Matches ACCESS_CONTROL_IMPLEMENTATION_PLAN.md.
 */

import { findModule, FieldDef, ModuleDef, MODULE_CATALOG } from './catalog';
import {
  CompiledFieldGrant,
  CompiledModuleGrant,
  CompiledPolicyDocument,
  CompiledRole,
  ScopeType,
} from './policy.compiler';

// ─────────────────────────────────────────────────────────────────────────────
// Type Definitions
// ─────────────────────────────────────────────────────────────────────────────

export type { ScopeType };

/** Standard CRUD actions plus custom operation strings. */
export type ActionType =
  | 'create'
  | 'read'
  | 'update'
  | 'delete'
  | (string & {});

/**
 * Subject represents the authenticated user and their relational context.
 * Matches §4 & §5.3 in the access-control plan.
 */
export interface Subject {
  /** User ID (MongoDB ObjectId string). */
  userId: string;
  /** Optional email address for assignee email matching. */
  email?: string;
  /** Optional employee ID for employee self-matching. */
  employeeId?: string;
  /** Assigned role ObjectIds. */
  roleIds?: string[];
  /** Assigned role slugs or names (alternative lookup). */
  roles?: string[];
  /** IDs of teams the user belongs to. */
  teamIds?: string[];
  /** IDs of teams the user leads as teamLead. */
  leadingTeamIds?: string[];
  /** Optional break-glass system admin flag. */
  isSystemAdmin?: boolean;
}

/**
 * ResourceContext represents the target record when evaluating record-level scope.
 * Matches §4 & §6 in the access-control plan.
 */
export interface ResourceContext {
  id?: string;
  userId?: string;
  creatorId?: string;
  ownerId?: string;
  assigneeId?: string;
  assigneeEmail?: string;
  employeeId?: string;
  teamId?: string;
  teamIds?: string[];
  memberIds?: string[];
  members?: string[];
  applicantId?: string;
  [key: string]: unknown;
}

/**
 * Access decision returned by the PDP.
 * Matches §4, §8, and §9 in the access-control plan.
 */
export interface Decision {
  /** Whether the requested action is permitted. */
  allow: boolean;
  /** Reason explaining why access was denied (undefined if allowed). */
  reason?: string;
  /** Effective scope granted for the action ('none' | 'own' | 'team' | 'all'). */
  scope: ScopeType;
  /** All fields of the module that the subject is permitted to read. */
  readableFields: string[];
  /** All fields of the module that the subject is permitted to update. */
  updatableFields: string[];
  /** Fields that are forbidden to read (redacted from responses). */
  hiddenFields: string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Scope Rank & Helpers (§6.1)
// ─────────────────────────────────────────────────────────────────────────────

export const SCOPE_RANK: Record<ScopeType, number> = {
  none: 0,
  own: 1,
  team: 2,
  all: 3,
};

/**
 * Returns whichever scope has the higher rank.
 * When merging roles, widest scope wins (additive access model).
 */
export function maxScope(a: ScopeType, b: ScopeType): ScopeType {
  return SCOPE_RANK[a] >= SCOPE_RANK[b] ? a : b;
}

// ─────────────────────────────────────────────────────────────────────────────
// Subject Role Resolution
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Identifies all active roles applicable to the subject from the compiled policy.
 */
export function getSubjectRoles(
  subject: Subject,
  policy: CompiledPolicyDocument,
): CompiledRole[] {
  if (!policy || !policy.roles || !Array.isArray(policy.roles)) {
    return [];
  }

  const subjectId = subject.userId ? String(subject.userId) : '';
  const roleIdSet = new Set<string>();

  if (subject.roleIds && Array.isArray(subject.roleIds)) {
    for (const id of subject.roleIds) {
      if (id) roleIdSet.add(String(id));
    }
  }

  if (subject.roles && Array.isArray(subject.roles)) {
    for (const r of subject.roles) {
      if (r) roleIdSet.add(String(r));
    }
  }

  return policy.roles.filter((role) => {
    if (!role.isActive) return false;

    // Break-glass System Admin mapping (§5.1 & §7.2)
    if (
      subject.isSystemAdmin &&
      (role.slug === 'system-admin' || role.priority >= 1000)
    ) {
      return true;
    }

    // Role membership by User ID
    if (subjectId && role.members && role.members.includes(subjectId)) {
      return true;
    }

    // Role membership by role ID or slug
    if (role.id && roleIdSet.has(role.id)) {
      return true;
    }
    if (role.slug && roleIdSet.has(role.slug)) {
      return true;
    }

    return false;
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Relationship & Scope Matching (§6.2, §6.3)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Checks if the resource belongs to the subject under the 'own' relationship.
 */
export function matchesOwnRelationship(
  subject: Subject,
  resource: ResourceContext,
): boolean {
  const uid = subject.userId ? String(subject.userId) : '';

  if (uid) {
    if (resource.userId && String(resource.userId) === uid) return true;
    if (resource.creatorId && String(resource.creatorId) === uid) return true;
    if (resource.ownerId && String(resource.ownerId) === uid) return true;
    if (resource.assigneeId && String(resource.assigneeId) === uid) return true;
    if (resource.applicantId && String(resource.applicantId) === uid) return true;

    if (
      Array.isArray(resource.memberIds) &&
      resource.memberIds.some((m) => String(m) === uid)
    ) {
      return true;
    }
    if (
      Array.isArray(resource.members) &&
      resource.members.some((m) => String(m) === uid)
    ) {
      return true;
    }
  }

  if (
    subject.email &&
    resource.assigneeEmail &&
    resource.assigneeEmail.toLowerCase() === subject.email.toLowerCase()
  ) {
    return true;
  }

  if (
    subject.employeeId &&
    resource.employeeId &&
    String(resource.employeeId) === String(subject.employeeId)
  ) {
    return true;
  }

  return false;
}

/**
 * Checks if the resource belongs to the subject's team under the 'team' relationship.
 */
export function matchesTeamRelationship(
  subject: Subject,
  resource: ResourceContext,
): boolean {
  // Team scope includes own records
  if (matchesOwnRelationship(subject, resource)) {
    return true;
  }

  const teamIds = subject.teamIds?.map(String) ?? [];
  const leadingTeamIds = subject.leadingTeamIds?.map(String) ?? [];
  const subjectAllTeams = new Set([...teamIds, ...leadingTeamIds]);

  if (subjectAllTeams.size === 0) {
    return false;
  }

  if (resource.teamId && subjectAllTeams.has(String(resource.teamId))) {
    return true;
  }

  if (Array.isArray(resource.teamIds)) {
    for (const t of resource.teamIds) {
      if (subjectAllTeams.has(String(t))) return true;
    }
  }

  return false;
}

/**
 * Evaluates whether a given resource falls within the granted scope.
 */
export function isResourceInScope(
  scope: ScopeType,
  subject: Subject,
  resource: ResourceContext,
): boolean {
  switch (scope) {
    case 'none':
      return false;
    case 'all':
      return true;
    case 'team':
      return matchesTeamRelationship(subject, resource);
    case 'own':
      return matchesOwnRelationship(subject, resource);
    default:
      return false;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Multi-Role Merge & Invariant Resolution (§7 & §8)
// ─────────────────────────────────────────────────────────────────────────────

interface EffectiveModuleAccess {
  create: boolean;
  read: boolean;
  update: boolean;
  delete: boolean;
  operations: Set<string>;
  /** Scope rank for the specific action requested. */
  actionScope: ScopeType;
  /** Widest scope granted for read access. */
  readScope: ScopeType;
}

/**
 * Computes effective module permissions across all assigned roles.
 */
function mergeRolesForModule(
  roles: CompiledRole[],
  moduleId: string,
  action: string,
): EffectiveModuleAccess {
  let canCreate = false;
  let canRead = false;
  let canUpdate = false;
  let canDelete = false;
  const operations = new Set<string>();

  let actionScope: ScopeType = 'none';
  let readScope: ScopeType = 'none';

  for (const role of roles) {
    const grant = role.moduleGrants?.[moduleId];
    if (!grant) continue;

    // OR booleans across all roles (§7.1)
    if (grant.create) canCreate = true;
    if (grant.read) canRead = true;
    if (grant.update) canUpdate = true;
    if (grant.delete) canDelete = true;

    if (grant.operations && Array.isArray(grant.operations)) {
      for (const op of grant.operations) {
        operations.add(op);
      }
    }

    // Track read scope
    if (grant.read) {
      readScope = maxScope(readScope, grant.scope ?? 'none');
    }

    // Determine if this role grants the requested action
    let grantsRequestedAction = false;
    if (action === 'create' && grant.create) grantsRequestedAction = true;
    else if (action === 'read' && grant.read) grantsRequestedAction = true;
    else if (action === 'update' && (grant.update || (grant.operations && (grant.operations.includes('approve') || grant.operations.includes('reject'))))) grantsRequestedAction = true;
    else if (action === 'delete' && grant.delete) grantsRequestedAction = true;
    else if (grant.operations && grant.operations.includes(action)) grantsRequestedAction = true;
    else if (action === 'approve' && grant.update) grantsRequestedAction = true;

    if (grantsRequestedAction) {
      actionScope = maxScope(actionScope, grant.scope ?? 'none');
    }
  }

  return {
    create: canCreate,
    read: canRead,
    update: canUpdate,
    delete: canDelete,
    operations,
    actionScope,
    readScope,
  };
}

/**
 * Resolves the catalog fields for a module and applies the §8 invariant table:
 *   field.read   ⊆ module.read
 *   field.update ⊆ module.update ∩ field.read
 *
 * Implements §7.1 field merge:
 *   read   = OR(field.read across roles)   // after inherit-from-module
 *   update = OR(field.update across roles)
 */
function resolveFieldsWithInvariants(
  roles: CompiledRole[],
  moduleId: string,
  moduleAccess: EffectiveModuleAccess,
  catalog: ModuleDef[],
): {
  readableFields: string[];
  updatableFields: string[];
  hiddenFields: string[];
} {
  const moduleDef = catalog.find((m) => m.id === moduleId) ?? findModule(moduleId);
  const catalogFields = moduleDef?.fields ?? [];

  // Collect all known field keys (catalog + any additional keys found in grants)
  const allFieldKeys = new Set<string>(catalogFields.map((f) => f.key));
  for (const role of roles) {
    const grant = role.moduleGrants?.[moduleId];
    if (grant?.fields) {
      for (const k of Object.keys(grant.fields)) {
        allFieldKeys.add(k);
      }
    }
  }

  const readableFields: string[] = [];
  const updatableFields: string[] = [];
  const hiddenFields: string[] = [];

  for (const key of allFieldKeys) {
    let rawFieldRead = false;
    let rawFieldUpdate = false;

    for (const role of roles) {
      const grant = role.moduleGrants?.[moduleId];
      if (!grant) continue;

      let roleFieldRead = false;
      let roleFieldUpdate = false;

      if (grant.fields && key in grant.fields) {
        roleFieldRead = grant.fields[key].read;
        roleFieldUpdate = grant.fields[key].update;
      } else {
        // Inherit from this role's module grant if omitted in raw grant
        roleFieldRead = grant.read;
        roleFieldUpdate = grant.update;
      }

      if (roleFieldRead) rawFieldRead = true;
      if (roleFieldUpdate) rawFieldUpdate = true;
    }

    // Enforce Invariant Table from §8:
    // 1. field.read = rawRead AND module.read
    const effectiveRead = moduleAccess.read && rawFieldRead;

    // 2. field.update = rawUpdate AND module.update AND field.read
    const effectiveUpdate = moduleAccess.update && effectiveRead && rawFieldUpdate;

    if (effectiveRead) {
      readableFields.push(key);
      if (effectiveUpdate) {
        updatableFields.push(key);
      }
    } else {
      hiddenFields.push(key);
    }
  }

  return { readableFields, updatableFields, hiddenFields };
}

// ─────────────────────────────────────────────────────────────────────────────
// Central PDP Entry Point: can()
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Pure function can(subject, action, module, resource?, policy): Decision.
 *
 * Evaluates whether a subject is permitted to perform the specified action
 * on a module (and optional resource) under the given compiled policy.
 *
 * @param subject  - Acting user identity and team context.
 * @param action   - 'create' | 'read' | 'update' | 'delete' | custom operation.
 * @param module   - Module ID ('tasks', 'projects', 'employees', etc.).
 * @param resource - Optional target record for record-level scope evaluation.
 * @param policy   - CompiledPolicyDocument snapshot (immutable).
 *
 * @returns Decision with allow, reason, scope, readableFields, updatableFields, hiddenFields.
 */
export function can(
  subject: Subject,
  action: ActionType,
  module: string,
  resource?: ResourceContext,
  policy?: CompiledPolicyDocument,
): Decision {
  // 1. Guard against missing or invalid policy
  if (!policy) {
    return {
      allow: false,
      reason: 'No policy document provided',
      scope: 'none',
      readableFields: [],
      updatableFields: [],
      hiddenFields: [],
    };
  }

  const catalog = policy.moduleCatalog ?? MODULE_CATALOG;

  // 2. Resolve matching active roles for subject (§5.3 step 2)
  const roles = getSubjectRoles(subject, policy);
  if (roles.length === 0) {
    const moduleDef = catalog.find((m) => m.id === module) ?? findModule(module);
    const allModuleFields = moduleDef?.fields.map((f) => f.key) ?? [];
    return {
      allow: false,
      reason: 'No active roles assigned to subject',
      scope: 'none',
      readableFields: [],
      updatableFields: [],
      hiddenFields: allModuleFields,
    };
  }

  // 3. Merge grants across roles (§7.1)
  const moduleAccess = mergeRolesForModule(roles, module, action);

  // 4. Resolve field sets enforcing §8 invariant
  const { readableFields, updatableFields, hiddenFields } =
    resolveFieldsWithInvariants(roles, module, moduleAccess, catalog);

  // 5. Evaluate module-level permission for the requested action
  let isActionAllowed = false;
  if (action === 'create') {
    isActionAllowed = moduleAccess.create;
  } else if (action === 'read') {
    isActionAllowed = moduleAccess.read;
  } else if (action === 'update') {
    isActionAllowed = moduleAccess.update;
  } else if (action === 'delete') {
    isActionAllowed = moduleAccess.delete;
  } else {
    // Custom operation (e.g. 'timer.start', 'approve', 'reject')
    isActionAllowed = moduleAccess.operations.has(action);
  }

  const effectiveScope = moduleAccess.actionScope;

  if (!isActionAllowed) {
    return {
      allow: false,
      reason: `Action '${action}' is not granted for module '${module}'`,
      scope: effectiveScope,
      readableFields,
      updatableFields,
      hiddenFields,
    };
  }

  // 6. Scope check if action is allowed
  if (effectiveScope === 'none') {
    return {
      allow: false,
      reason: `Scope is 'none' for action '${action}' on module '${module}'`,
      scope: 'none',
      readableFields,
      updatableFields,
      hiddenFields,
    };
  }

  // 7. Resource-level relationship check (§5.3 step 5 & §6.3)
  if (resource !== undefined && resource !== null) {
    const inScope = isResourceInScope(effectiveScope, subject, resource);
    if (!inScope) {
      return {
        allow: false,
        reason: `Resource is out of scope for action '${action}' (granted scope: '${effectiveScope}')`,
        scope: effectiveScope,
        readableFields,
        updatableFields,
        hiddenFields,
      };
    }
  }

  // 8. Action and scope permitted
  return {
    allow: true,
    scope: effectiveScope,
    readableFields,
    updatableFields,
    hiddenFields,
  };
}
