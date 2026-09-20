export const CATALOG_MODULES = [
  'tasks',
  'projects',
  'employees',
  'teams',
  'dayoff',
  'reports',
  'settings',
  'users',
  'user-groups',
] as const;

export type CatalogModule = typeof CATALOG_MODULES[number];

export interface CatalogOperationDef {
  module: CatalogModule;
  operation: string;
}

export const CATALOG_OPERATIONS: CatalogOperationDef[] = [
  // Tasks Operations
  { module: 'tasks', operation: 'tasks.core' },
  { module: 'tasks', operation: 'tasks.comments' },
  { module: 'tasks', operation: 'tasks.attachments' },
  { module: 'tasks', operation: 'tasks.time_tracking' },
  { module: 'tasks', operation: 'tasks.assignment' },

  // Projects Operations
  { module: 'projects', operation: 'projects.core' },
  { module: 'projects', operation: 'projects.milestones' },
  { module: 'projects', operation: 'projects.team' },
  { module: 'projects', operation: 'projects.documents' },

  // Employees Operations
  { module: 'employees', operation: 'employees.directory' },
  { module: 'employees', operation: 'employees.profile' },
  { module: 'employees', operation: 'employees.compensation' },
  { module: 'employees', operation: 'employees.status' },

  // Teams Operations
  { module: 'teams', operation: 'teams.core' },
  { module: 'teams', operation: 'teams.members' },
  { module: 'teams', operation: 'teams.leads' },

  // Time Off / Leaves Operations
  { module: 'dayoff', operation: 'dayoff.requests' },
  { module: 'dayoff', operation: 'dayoff.approvals' },
  { module: 'dayoff', operation: 'dayoff.policies' },
  { module: 'dayoff', operation: 'dayoff.calendar' },

  // Reports Operations
  { module: 'reports', operation: 'reports.view' },
  { module: 'reports', operation: 'reports.export' },
  { module: 'reports', operation: 'reports.timesheets' },

  // Users Operations
  { module: 'users', operation: 'users.manage' },
  { module: 'users', operation: 'users.core' },

  // User Groups Operations
  { module: 'user-groups', operation: 'user-groups.manage' },
  { module: 'user-groups', operation: 'user-groups.core' },

  // System Administration Operations (including legacy keys for full backward compatibility)
  { module: 'settings', operation: 'settings.system' },
  { module: 'settings', operation: 'settings.users' },
  { module: 'settings', operation: 'settings.user_groups' },
];

export const CATALOG_MODELS_AND_FIELDS: Record<string, string[]> = {
  tasks: [
    'title',
    'description',
    'status',
    'priority',
    'assignee',
    'dueDate',
    'startDate',
    'estimatedHours',
    'tags',
    'projectId',
    'resources',
    'comments',
  ],
  projects: [
    'name',
    'description',
    'status',
    'priority',
    'teamId',
    'startDate',
    'dueDate',
    'color',
    'comments',
  ],
  employees: [
    'fullName',
    'email',
    'role',
    'department',
    'status',
    'personalNumber',
    'houseContactNumber',
    'address',
    'joiningDate',
    'baseSalary',
    'currency',
    'payFrequency',
    'bankAccountNumber',
    'bankRoutingNumber',
    'taxId',
  ],
  teams: [
    'name',
    'description',
    'teamLead',
    'members',
    'comments',
  ],
};
