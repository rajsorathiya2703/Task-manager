/**
 * Policy Compiler  (Phase 0 — P0-03)
 *
 * Pure function that converts a live Role[] snapshot into a
 * CompiledPolicyDocument — the immutable, machine-readable payload that the
 * PDP evaluates on every request.
 *
 * Design constraints:
 *   • No Mongoose imports — accepts a structural RoleLike interface so
 *     unit tests can pass plain objects without a running DB.
 *   • No NestJS decorators — this file is a pure TypeScript module.
 *   • No side-effects at module load time (safe for static analysis / tests).
 *
 * References:
 *   §5.1 — data models          (role + policy_document shape)
 *   §5.3 — compiled document    (conceptual JSON + evaluation order)
 *   §7   — multi-role merge     (OR for booleans, MAX for scope, UNION for ops)
 *   §8   — module vs field invariant
 *
 * Matches ACCESS_CONTROL_IMPLEMENTATION_PLAN.md.
 */

import { createHash } from 'crypto';
import { FieldDef, ModuleDef, MODULE_CATALOG } from './catalog';

// ─────────────────────────────────────────────────────────────────────────────
// Re-export catalog types so callers don't need a second import path
// ─────────────────────────────────────────────────────────────────────────────
export type { FieldDef, ModuleDef };

// ─────────────────────────────────────────────────────────────────────────────
// Scope helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Numeric rank used when comparing / merging scope values. */
const SCOPE_RANK: Record<string, number> = {
  none: 0,
  own: 1,
  team: 2,
  all: 3,
} as const;

export type ScopeType = 'none' | 'own' | 'team' | 'all';

/**
 * Returns whichever scope value has the higher rank.
 * Used during multi-role merge: widest scope wins (additive model).
 */
function maxScope(a: ScopeType, b: ScopeType): ScopeType {
  return SCOPE_RANK[a] >= SCOPE_RANK[b] ? a : b;
}

// ─────────────────────────────────────────────────────────────────────────────
// Input type — structural interface (no Mongoose coupling)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Structural interface accepted by compile().
 *
 * Real Mongoose RoleDocument objects satisfy this interface automatically
 * (structural typing). Unit tests can pass plain JS objects.
 */
export interface RoleLike {
  /** Mongoose _id — optional so plain objects without an id still compile. */
  _id?: { toString(): string } | string;
  name: string;
  slug: string;
  priority: number;
  isSystem: boolean;
  isActive: boolean;
  /** User ObjectId strings or objects with a toString() method. */
  members: Array<{ toString(): string } | string>;
  moduleGrants: Array<{
    module: string;
    create: boolean;
    read: boolean;
    update: boolean;
    delete: boolean;
    scope: ScopeType;
    operations?: string[];
  }>;
  fieldGrants: Array<{
    module: string;
    field: string;
    read: boolean;
    update: boolean;
  }>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Output types — what the PDP reads
// ─────────────────────────────────────────────────────────────────────────────

/**
 * A single field after inheritance from its module grant and §8 invariant
 * enforcement. Stored inside CompiledModuleGrant.fields for O(1) PDP lookup.
 */
export interface CompiledFieldGrant {
  field: string;
  /** True only when both this field and the parent module allow reading. */
  read: boolean;
  /**
   * True only when both the module allows update AND field.read is true AND
   * this field's own update flag is true.
   * Invariant: update ⊆ module.update ∩ field.read
   */
  update: boolean;
}

/**
 * A module grant with all fields resolved (inherited + invariant applied).
 * The `fields` map supports O(1) lookups in the PDP hot-path.
 */
export interface CompiledModuleGrant {
  module: string;
  create: boolean;
  read: boolean;
  update: boolean;
  delete: boolean;
  scope: ScopeType;
  operations: string[];
  /**
   * All fields registered for this module, keyed by field name.
   * Every catalog field appears here — absent raw FieldGrants inherit from
   * the module grant; invariant is applied on top.
   */
  fields: Record<string, CompiledFieldGrant>;
}

/**
 * A denormalised, plain-object role snapshot for the PDP.
 * All ObjectIds are converted to strings; no Mongoose Document methods.
 */
export interface CompiledRole {
  /** Role._id as a string. Empty string if the role had no _id (test stub). */
  id: string;
  name: string;
  slug: string;
  priority: number;
  isSystem: boolean;
  isActive: boolean;
  /** User._id strings — used by the PIP to look up a subject's roles. */
  members: string[];
  /**
   * Module grants keyed by module id for O(1) lookup.
   * Every module in the catalog has an entry (default all-false if not in role).
   */
  moduleGrants: Record<string, CompiledModuleGrant>;
}

/**
 * The full compiled policy document.
 *
 * This is what the compiler produces and what the PolicyDocument Mongoose
 * schema stores in its `roles`, `moduleCatalog`, and `fieldCatalog` Mixed[]
 * fields. The PDP reads only this object — never the live `roles` collection.
 */
export interface CompiledPolicyDocument {
  /** Monotonically increasing; bumped on every call to compile(). */
  version: number;
  /** UTC timestamp of this compilation. */
  compiledAt: Date;
  /**
   * SHA-256 hex digest of JSON.stringify(roles).
   * Lets the cache layer detect staleness without diffing the full payload.
   */
  hash: string;
  /** Denormalised snapshot of all active roles at compile time. */
  roles: CompiledRole[];
  /** Snapshot of MODULE_CATALOG at compile time. */
  moduleCatalog: ModuleDef[];
  /** Flat list of every FieldDef across all modules. */
  fieldCatalog: FieldDef[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Internal helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Convert an ObjectId-like value to a plain string.
 * Handles Mongoose ObjectId objects, strings, and undefined gracefully.
 */
function toStr(id: { toString(): string } | string | undefined): string {
  if (id === undefined || id === null) return '';
  return typeof id === 'string' ? id : id.toString();
}

/**
 * Resolve all field grants for one module on one role.
 *
 * Step-by-step:
 *   1. Start with every catalog field inheriting from the module grant.
 *   2. Apply explicit FieldGrant overrides for this module.
 *   3. Enforce §8 invariant:
 *        field.read   = field.read  && module.read
 *        field.update = field.update && module.update && field.read
 *
 * @param moduleId      - Catalog module identifier
 * @param modulegrant   - The resolved module-level booleans for this role
 * @param rawFieldGrants - All FieldGrant entries for this role (any module)
 * @param catalogFields  - The FieldDef[] from MODULE_CATALOG for this module
 */
function resolveFieldGrants(
  moduleId: string,
  modulegrant: { read: boolean; update: boolean },
  rawFieldGrants: RoleLike['fieldGrants'],
  catalogFields: FieldDef[],
): Record<string, CompiledFieldGrant> {
  // 1. Seed every field from the catalog with inherited module values.
  const result: Record<string, CompiledFieldGrant> = {};
  for (const f of catalogFields) {
    result[f.key] = {
      field: f.key,
      read: modulegrant.read,
      update: modulegrant.update,
    };
  }

  // 2. Apply explicit overrides from the role's fieldGrants for this module.
  for (const fg of rawFieldGrants) {
    if (fg.module !== moduleId) continue;
    if (!(fg.field in result)) {
      // Field exists in the grant but is not in the current catalog.
      // Still record it so stale grants don't silently disappear.
      result[fg.field] = {
        field: fg.field,
        read: fg.read,
        update: fg.update,
      };
    } else {
      result[fg.field].read = fg.read;
      result[fg.field].update = fg.update;
    }
  }

  // 3. Enforce §8 invariant on every field in the map.
  //    field.read   ⊆ module.read
  //    field.update ⊆ module.update ∩ field.read
  for (const key of Object.keys(result)) {
    const f = result[key];
    f.read = f.read && modulegrant.read;
    f.update = f.update && modulegrant.update && f.read;
  }

  return result;
}

/**
 * Denormalise a single role against the catalog.
 *
 * For every module in the catalog:
 *   - Locate the matching ModuleGrant in the role (default all-false if absent).
 *   - Call resolveFieldGrants to produce the fields map.
 *   - Build a CompiledModuleGrant.
 *
 * Result: a CompiledRole with no Mongoose types, ready for JSON serialisation.
 */
function denormaliseRole(role: RoleLike, catalog: ModuleDef[]): CompiledRole {
  const compiledModuleGrants: Record<string, CompiledModuleGrant> = {};

  for (const moduleDef of catalog) {
    // Find the role's raw grant for this module (may be absent → all false).
    const raw = role.moduleGrants.find((mg) => mg.module === moduleDef.id);

    const moduleGrant = {
      module: moduleDef.id,
      create: raw?.create ?? false,
      read: raw?.read ?? false,
      update: raw?.update ?? false,
      delete: raw?.delete ?? false,
      scope: (raw?.scope ?? 'none') as ScopeType,
      operations: raw?.operations ? [...raw.operations] : [],
    };

    const fields = resolveFieldGrants(
      moduleDef.id,
      { read: moduleGrant.read, update: moduleGrant.update },
      role.fieldGrants,
      moduleDef.fields,
    );

    compiledModuleGrants[moduleDef.id] = { ...moduleGrant, fields };
  }

  return {
    id: toStr(role._id),
    name: role.name,
    slug: role.slug,
    priority: role.priority,
    isSystem: role.isSystem,
    isActive: role.isActive,
    members: role.members.map(toStr),
    moduleGrants: compiledModuleGrants,
  };
}

/**
 * Compute a SHA-256 hex digest of the serialised compiled roles.
 * Deterministic for the same input; changes whenever any role changes.
 */
function computeHash(roles: CompiledRole[]): string {
  return createHash('sha256').update(JSON.stringify(roles)).digest('hex');
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Compile a set of roles into an immutable policy document snapshot.
 *
 * @param roles       - Live Role documents (or plain objects for tests).
 *                      Only roles where `isActive === true` are compiled.
 * @param catalog     - Module catalog. Defaults to MODULE_CATALOG from catalog.ts.
 *                      Pass a subset in unit tests for faster execution.
 * @param prevVersion - The version number of the last compiled document.
 *                      The returned document will have `prevVersion + 1`.
 *                      Defaults to 0 (first compile returns version 1).
 *
 * @returns A fully compiled, plain-object policy document ready to be
 *          persisted by the service layer and consumed by the PDP.
 *
 * @example
 * ```ts
 * const doc = compile(roles, MODULE_CATALOG, lastVersion);
 * await policyDocumentModel.create(doc);
 * ```
 */
export function compile(
  roles: RoleLike[],
  catalog: ModuleDef[] = MODULE_CATALOG,
  prevVersion = 0,
): CompiledPolicyDocument {
  // 1. Filter to active roles only.
  const activeRoles = roles.filter((r) => r.isActive);

  // 2. Denormalise each role against the catalog.
  const compiledRoles: CompiledRole[] = activeRoles.map((r) =>
    denormaliseRole(r, catalog),
  );

  // 3. Compute a content-addressed hash of the roles snapshot.
  const hash = computeHash(compiledRoles);

  // 4. Build a flat field catalog (all FieldDef entries across all modules).
  const fieldCatalog: FieldDef[] = catalog.flatMap((m) => m.fields);

  // 5. Return the compiled document. Persistence is the caller's responsibility.
  return {
    version: prevVersion + 1,
    compiledAt: new Date(),
    hash,
    roles: compiledRoles,
    moduleCatalog: catalog,
    fieldCatalog,
  };
}
