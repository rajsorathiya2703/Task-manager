/**
 * Module & Field Catalog
 *
 * Single source of truth for every application module that participates in
 * access control. The role editor UI, the policy compiler, and the PDP all
 * read this file — never hard-code module identifiers anywhere else.
 *
 * To add a new module: append one entry to MODULE_CATALOG and wire the guard
 * on the corresponding controller (Phase 1). No schema changes needed.
 *
 * Matches §5.2 of ACCESS_CONTROL_IMPLEMENTATION_PLAN.md.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * A single field on a module's primary model that participates in
 * field-level access control.
 *
 * `sensitive: true` means the field is hidden by default on lower-privilege
 * roles (e.g. Employee, Team Leader). The role editor surfaces this as a
 * visual warning when enabling read/update on a sensitive field.
 */
export interface FieldDef {
  /** Mongoose / DTO field name used in API payloads and PATCH bodies. */
  key: string;
  /** Human-readable label shown in the role editor UI. */
  label: string;
  /**
   * When true the field is hidden by default on seed roles below Admin.
   * Examples: baseSalary, bankAccountNumber, taxId.
   */
  sensitive?: boolean;
}

/**
 * A registered application module.
 *
 * Every entry here maps to:
 *  - A `module` key in `ModuleGrant` (role.schema.ts)
 *  - A route guard on the corresponding NestJS controller (Phase 1)
 *  - A section in the role editor matrix (Phase 3 UI)
 */
export interface ModuleDef {
  /**
   * Stable machine identifier. Used as the key inside `ModuleGrant.module`
   * and `FieldGrant.module`. Never rename once seeded into the DB.
   * Sub-modules use dot notation: "dayoff.approvals".
   */
  id: string;
  /** Display name shown in the role editor and sidebar. */
  label: string;
  /** One-line description shown as a tooltip in the role editor. */
  description: string;
  /** Frontend routes this module guards (informational for the route map). */
  uiRoutes: string[];
  /** Mongoose model name (informational, used by PIP resolvers). */
  primaryModel: string;
  /**
   * Relationship resolver names available for this module.
   * The PIP (Policy Information Point) implements one resolver per entry.
   * Used by the PDP to decide record-level scope (Phase 1).
   */
  relationships: string[];
  /**
   * Actions available on this module beyond the default CRUD set.
   * Always includes 'create' | 'read' | 'update' | 'delete' unless the
   * module is read-only or approval-only (see dashboard, timeline, chatbot).
   * Extra operations: 'timer.start', 'timer.stop', 'approve', 'reject', etc.
   */
  actions: string[];
  /**
   * Fields from the module's primary model that are exposed for field-level
   * grants. Order determines display order in the role editor.
   */
  fields: FieldDef[];
}

// ---------------------------------------------------------------------------
// Module Catalog — 12 entries (§5.2)
// ---------------------------------------------------------------------------

export const MODULE_CATALOG: ModuleDef[] = [
  // ── 1. Dashboard ─────────────────────────────────────────────────────────
  {
    id: 'dashboard',
    label: 'Dashboard',
    description: 'Activity feed, task summary, and team overview widgets.',
    uiRoutes: ['/dashboard'],
    primaryModel: 'Aggregated',
    relationships: ['own', 'team', 'all'],
    actions: ['read'],
    fields: [
      { key: 'activityFeed', label: 'Activity Feed' },
      { key: 'taskSummary', label: 'Task Summary' },
      { key: 'teamSummary', label: 'Team Summary' },
    ],
  },

  // ── 2. Tasks ──────────────────────────────────────────────────────────────
  {
    id: 'tasks',
    label: 'Tasks',
    description: 'Create, view, and manage tasks. Includes timer and comments.',
    uiRoutes: ['/tasks', '/tasks/:id'],
    primaryModel: 'Task',
    relationships: [
      'owner',
      'assignee',
      'member',
      'project_team_member',
      'project_team_lead',
    ],
    actions: [
      'create',
      'read',
      'update',
      'delete',
      'timer.start',
      'timer.stop',
    ],
    fields: [
      { key: 'title', label: 'Title' },
      { key: 'description', label: 'Description' },
      { key: 'status', label: 'Status' },
      { key: 'priority', label: 'Priority' },
      { key: 'startDate', label: 'Start Date' },
      { key: 'dueDate', label: 'Due Date' },
      { key: 'estimatedHours', label: 'Estimated Hours' },
      { key: 'tags', label: 'Tags' },
      { key: 'assignee', label: 'Assignee' },
      { key: 'members', label: 'Members' },
      { key: 'projectId', label: 'Project' },
      { key: 'resources', label: 'Resources' },
      { key: 'comments', label: 'Comments' },
    ],
  },

  // ── 3. Projects ───────────────────────────────────────────────────────────
  {
    id: 'projects',
    label: 'Projects',
    description: 'Manage projects and link them to teams.',
    uiRoutes: ['/projects', '/projects/:id'],
    primaryModel: 'Project',
    relationships: ['owner', 'team_member', 'team_lead'],
    actions: ['create', 'read', 'update', 'delete'],
    fields: [
      { key: 'name', label: 'Name' },
      { key: 'description', label: 'Description' },
      { key: 'status', label: 'Status' },
      { key: 'priority', label: 'Priority' },
      { key: 'startDate', label: 'Start Date' },
      { key: 'dueDate', label: 'Due Date' },
      { key: 'color', label: 'Color' },
      { key: 'teamId', label: 'Team' },
    ],
  },

  // ── 4. Timeline ───────────────────────────────────────────────────────────
  {
    id: 'timeline',
    label: 'Timeline',
    description:
      'Calendar / Gantt view of tasks. Read-only; edits go through Tasks.',
    uiRoutes: ['/timeline'],
    primaryModel: 'Task',
    relationships: [
      'owner',
      'assignee',
      'member',
      'project_team_member',
      'project_team_lead',
    ],
    actions: ['read'],
    fields: [
      { key: 'title', label: 'Title' },
      { key: 'status', label: 'Status' },
      { key: 'priority', label: 'Priority' },
      { key: 'startDate', label: 'Start Date' },
      { key: 'dueDate', label: 'Due Date' },
      { key: 'assignee', label: 'Assignee' },
    ],
  },

  // ── 5. Teams ──────────────────────────────────────────────────────────────
  {
    id: 'teams',
    label: 'Teams',
    description: 'View and manage teams and their members.',
    uiRoutes: ['/configuration/team'],
    primaryModel: 'Team',
    relationships: ['member', 'team_lead'],
    actions: ['create', 'read', 'update', 'delete'],
    fields: [
      { key: 'name', label: 'Name' },
      { key: 'description', label: 'Description' },
      { key: 'members', label: 'Members' },
      { key: 'teamLead', label: 'Team Lead' },
    ],
  },

  // ── 6. Employees ──────────────────────────────────────────────────────────
  {
    id: 'employees',
    label: 'Employees',
    description: 'Employee profiles including payroll fields (sensitive).',
    uiRoutes: ['/configuration/employees'],
    primaryModel: 'Employee',
    relationships: ['self', 'team_member', 'all'],
    actions: ['create', 'read', 'update', 'delete'],
    fields: [
      { key: 'fullName', label: 'Full Name' },
      { key: 'email', label: 'Email' },
      { key: 'role', label: 'Job Title' },
      { key: 'department', label: 'Department' },
      { key: 'status', label: 'Status' },
      { key: 'joiningDate', label: 'Joining Date' },
      { key: 'address', label: 'Address' },
      { key: 'personalNumber', label: 'Personal Number' },
      { key: 'houseContactNumber', label: 'Contact Number' },
      // ── Payroll fields — sensitive: true (hidden by default below Admin) ──
      { key: 'baseSalary', label: 'Base Salary', sensitive: true },
      { key: 'currency', label: 'Currency', sensitive: true },
      { key: 'payFrequency', label: 'Pay Frequency', sensitive: true },
      { key: 'bankAccountNumber', label: 'Bank Account', sensitive: true },
      { key: 'bankRoutingNumber', label: 'Bank Routing Number', sensitive: true },
      { key: 'taxId', label: 'Tax ID', sensitive: true },
    ],
  },

  // ── 7. Users ──────────────────────────────────────────────────────────────
  {
    id: 'users',
    label: 'Users',
    description: 'Manage user accounts. Typically admin-only.',
    uiRoutes: ['/configuration/users'],
    primaryModel: 'User',
    relationships: ['self', 'all'],
    actions: ['read', 'update', 'delete'],
    fields: [
      { key: 'name', label: 'Name' },
      { key: 'email', label: 'Email' },
      { key: 'avatarUrl', label: 'Avatar' },
      { key: 'authType', label: 'Auth Type' },
      { key: 'is_employee', label: 'Is Employee' },
      { key: 'is_system_admin', label: 'System Admin' },
      { key: 'lastLoginAt', label: 'Last Login' },
    ],
  },

  // ── 8. Roles ──────────────────────────────────────────────────────────────
  {
    id: 'roles',
    label: 'Roles',
    description: 'Create and manage access-control roles. Admin-only.',
    uiRoutes: ['/configuration/roles', '/configuration/roles/:id'],
    primaryModel: 'Role',
    relationships: ['all'],
    actions: ['create', 'read', 'update', 'delete'],
    fields: [
      { key: 'name', label: 'Name' },
      { key: 'slug', label: 'Slug' },
      { key: 'description', label: 'Description' },
      { key: 'color', label: 'Color' },
      { key: 'priority', label: 'Priority' },
      { key: 'isSystem', label: 'System Role' },
      { key: 'isActive', label: 'Active' },
      { key: 'members', label: 'Members' },
      { key: 'moduleGrants', label: 'Module Grants' },
      { key: 'fieldGrants', label: 'Field Grants' },
    ],
  },

  // ── 9. Day Off (applications) ─────────────────────────────────────────────
  {
    id: 'dayoff',
    label: 'Day Off',
    description: 'Submit and manage leave applications.',
    uiRoutes: ['/dayoff/calendar', '/dayoff/requests', '/dayoff/history'],
    primaryModel: 'LeaveApplication',
    relationships: ['applicant', 'team_lead', 'all'],
    actions: ['create', 'read', 'update', 'delete', 'cancel'],
    fields: [
      { key: 'leaveTypeId', label: 'Leave Type' },
      { key: 'fromDate', label: 'From Date' },
      { key: 'toDate', label: 'To Date' },
      { key: 'daysCount', label: 'Days Count' },
      { key: 'reason', label: 'Reason' },
      { key: 'description', label: 'Description' },
      { key: 'status', label: 'Status' },
      { key: 'approvedBy', label: 'Approved By' },
      { key: 'rejectionReason', label: 'Rejection Reason' },
    ],
  },

  // ── 10. Day Off — Approvals ───────────────────────────────────────────────
  {
    id: 'dayoff.approvals',
    label: 'Day Off — Approvals',
    description: 'Approve or reject pending leave applications.',
    uiRoutes: ['/dayoff/approvals'],
    primaryModel: 'LeaveApplication',
    relationships: ['team_lead', 'manager', 'all'],
    actions: ['read', 'approve', 'reject'],
    fields: [
      { key: 'status', label: 'Status' },
      { key: 'approvedBy', label: 'Approved By' },
      { key: 'rejectionReason', label: 'Rejection Reason' },
      { key: 'approvedAt', label: 'Approved At' },
    ],
  },

  // ── 11. Day Off — Policies ────────────────────────────────────────────────
  {
    id: 'dayoff.policies',
    label: 'Day Off — Policies',
    description: 'Manage leave types, allocations, and carry-forward rules.',
    uiRoutes: ['/dayoff/policies', '/configuration/day-off'],
    primaryModel: 'LeaveType',
    relationships: ['all'],
    actions: ['create', 'read', 'update', 'delete'],
    fields: [
      { key: 'name', label: 'Name' },
      { key: 'code', label: 'Code' },
      { key: 'color', label: 'Color' },
      { key: 'canCarryForward', label: 'Carry Forward' },
      { key: 'carryForwardLimit', label: 'Carry Forward Limit' },
      { key: 'salaryDeductionPercent', label: 'Salary Deduction %' },
      { key: 'refillCycle', label: 'Refill Cycle' },
      { key: 'defaultAllocation', label: 'Default Allocation' },
      { key: 'rules', label: 'Rules' },
      { key: 'isActive', label: 'Active' },
    ],
  },

  // ── 12. Chatbot ───────────────────────────────────────────────────────────
  {
    id: 'chatbot',
    label: 'Chatbot',
    description:
      'AI copilot. Each tool inherits access from its target module. ' +
      'Grant "use" here to allow copilot access at all; per-tool checks ' +
      'still run against the corresponding module grant.',
    uiRoutes: [],
    primaryModel: 'None',
    relationships: [],
    actions: ['use'],
    fields: [],
  },
];

// ---------------------------------------------------------------------------
// Derived helpers (used by policy compiler and tests)
// ---------------------------------------------------------------------------

/**
 * Look up a module definition by its stable id.
 * Returns `undefined` if the id is not registered — treat as "no access".
 */
export function findModule(id: string): ModuleDef | undefined {
  return MODULE_CATALOG.find((m) => m.id === id);
}

/**
 * Return all field keys for a module (empty array if module not found).
 * Useful for the PDP field-inheritance logic.
 */
export function getModuleFields(moduleId: string): FieldDef[] {
  return findModule(moduleId)?.fields ?? [];
}

/**
 * Return the keys of sensitive fields for a module.
 * The policy compiler uses this to set `read: false` on seed roles
 * that should not see payroll data.
 */
export function getSensitiveFields(moduleId: string): string[] {
  return getModuleFields(moduleId)
    .filter((f) => f.sensitive)
    .map((f) => f.key);
}
