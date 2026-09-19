/**
 * PERMISSION_CATALOG — Single source of truth for all modules, operations, and fields.
 *
 * Every @RequirePermission decorator, DTO validation, chatbot TOOL_MODULE_MAP,
 * and the frontend group editor must reference this catalog.
 *
 * Adding a new module or operation here automatically makes it available
 * in the permission system — no other file needs to know the list.
 */
export const PERMISSION_CATALOG = {
  tasks: {
    label: 'Tasks',
    operations: ['tasks.comments', 'tasks.timer', 'tasks.upload'] as const,
    fields: {
      tasks: [
        'title',
        'description',
        'status',
        'priority',
        'dueDate',
        'startDate',
        'estimatedHours',
        'assignee',
        'tags',
        'projectId',
        'resources',
      ] as const,
    },
  },
  projects: {
    label: 'Projects',
    operations: [] as const,
    fields: {
      projects: ['name', 'status', 'teamId', 'dueDate'] as const,
    },
  },
  employees: {
    label: 'Employees',
    operations: [] as const,
    fields: {
      employees: ['role', 'department', 'baseSalary', 'bankAccountNumber', 'taxId'] as const,
    },
  },
  teams: {
    label: 'Teams',
    operations: [] as const,
    fields: {
      teams: ['name', 'members', 'teamLead'] as const,
    },
  },
  dayoff: {
    label: 'Day Off',
    operations: ['dayoff.apply', 'dayoff.approvals', 'dayoff.policies'] as const,
    fields: {},
  },
  reports: {
    label: 'Reports / Dashboard',
    operations: [] as const,
    fields: {},
  },
  users: {
    label: 'Users',
    operations: [] as const,
    fields: {},
  },
  'user-groups': {
    label: 'User Groups',
    operations: [] as const,
    fields: {},
  },
} as const;

/** Compile-time union of every valid module key. */
export type ModuleKey = keyof typeof PERMISSION_CATALOG;

/** Runtime array of every valid module key. */
export const MODULE_KEYS: ModuleKey[] = Object.keys(PERMISSION_CATALOG) as ModuleKey[];

/** All known operation strings across all modules. */
export const ALL_OPERATIONS: string[] = MODULE_KEYS.flatMap(
  (k) => [...PERMISSION_CATALOG[k].operations],
);
