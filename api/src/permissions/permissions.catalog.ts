export interface CatalogModuleDef {
  key: string;
  label: string;
  desc: string;
  icon: string;
}

export interface CatalogOperationDef {
  key: string;
  module: string;
  label: string;
  description: string;
  category: string;
}

export interface CatalogFieldDef {
  key: string;
  label: string;
  category?: string;
  sensitive?: boolean;
}

export interface CatalogModelDef {
  label: string;
  fields: CatalogFieldDef[];
}

export interface PermissionCatalog {
  modules: CatalogModuleDef[];
  operations: CatalogOperationDef[];
  models: Record<string, CatalogModelDef>;
}

export const PERMISSION_CATALOG: PermissionCatalog = {
  modules: [
    { key: 'tasks', label: 'Tasks Management', desc: 'Create, assign, track, and complete tasks', icon: 'CheckSquare' },
    { key: 'projects', label: 'Projects Management', desc: 'Organize project timelines, teams, and milestones', icon: 'FolderKanban' },
    { key: 'employees', label: 'Employees & HR', desc: 'Manage employee profiles, contact info, and compensation', icon: 'UserCheck' },
    { key: 'teams', label: 'Teams Management', desc: 'Create teams, assign team leads, and coordinate members', icon: 'Users' },
    { key: 'dayoff', label: 'Time Off & Leaves', desc: 'Manage leave policies, approvals, calendar, and applications', icon: 'CalendarOff' },
    { key: 'reports', label: 'Reports & Analytics', desc: 'Access business reports, timeline summaries, and dashboards', icon: 'BarChart3' },
    { key: 'users', label: 'Users Management', desc: 'Manage user logins, authentication, and accounts', icon: 'UserCheck' },
    { key: 'user-groups', label: 'User Groups & Roles', desc: 'Configure access groups and permission policies', icon: 'Users' },
    { key: 'settings', label: 'System Administration', desc: 'Configure global preferences and settings', icon: 'Settings' },
  ],

  operations: [
    // Tasks Operations
    { key: 'tasks.core', module: 'tasks', label: 'Task Records', description: 'Create, view, update, and delete core task items', category: 'Records' },
    { key: 'tasks.comments', module: 'tasks', label: 'Comments & Discussions', description: 'Post, view, edit, and delete discussion comments on tasks', category: 'Collaboration' },
    { key: 'tasks.attachments', module: 'tasks', label: 'Attachments & Files', description: 'Upload, preview, download, and delete task document attachments', category: 'Resources' },
    { key: 'tasks.time_tracking', module: 'tasks', label: 'Time Tracking & Timers', description: 'Start/stop task timers and log billable work hours', category: 'Execution' },
    { key: 'tasks.assignment', module: 'tasks', label: 'Task Assignment & Members', description: 'Assign employees, change assignees, and invite members', category: 'Workflow' },

    // Projects Operations
    { key: 'projects.core', module: 'projects', label: 'Project Records', description: 'Create, view, modify, and delete projects', category: 'Records' },
    { key: 'projects.milestones', module: 'projects', label: 'Milestones & Timelines', description: 'Configure project start dates, target deadlines, and status', category: 'Planning' },
    { key: 'projects.team', module: 'projects', label: 'Team Allocation', description: 'Assign teams and project leaders to projects', category: 'Resources' },
    { key: 'projects.documents', module: 'projects', label: 'Project Files & Notes', description: 'Manage project documentation, assets, and discussion notes', category: 'Collaboration' },

    // Employees Operations
    { key: 'employees.directory', module: 'employees', label: 'Employee Directory', description: 'Access the employee roster and search employee profiles', category: 'Directory' },
    { key: 'employees.profile', module: 'employees', label: 'Profile Information', description: 'Manage personal details, contact numbers, and addresses', category: 'Personal' },
    { key: 'employees.compensation', module: 'employees', label: 'Compensation & Payroll', description: 'View and edit confidential salaries, bank info, and tax IDs', category: 'Payroll' },
    { key: 'employees.status', module: 'employees', label: 'Employment Lifecycle', description: 'Manage job roles, departments, active status, and termination', category: 'Employment' },

    // Teams Operations
    { key: 'teams.core', module: 'teams', label: 'Team Profiles', description: 'Create, view, edit, and delete teams', category: 'Records' },
    { key: 'teams.members', module: 'teams', label: 'Team Members', description: 'Add, remove, and manage members within teams', category: 'Membership' },
    { key: 'teams.leads', module: 'teams', label: 'Team Leadership', description: 'Assign and reassign designated team leads', category: 'Leadership' },

    // Time Off / Leaves Operations
    { key: 'dayoff.requests', module: 'dayoff', label: 'Leave Requests', description: 'Submit, view, edit, and cancel employee time off requests', category: 'Requests' },
    { key: 'dayoff.approvals', module: 'dayoff', label: 'Leave Approvals', description: 'Review, approve, or reject employee leave applications', category: 'Approvals' },
    { key: 'dayoff.policies', module: 'dayoff', label: 'Leave Policies & Types', description: 'Create, configure quotas, paid rules, and allocate balances', category: 'Policies' },
    { key: 'dayoff.calendar', module: 'dayoff', label: 'Leave Calendar & Balances', description: 'View the team holiday calendar and available day-off balances', category: 'Calendar' },

    // Reports Operations
    { key: 'reports.view', module: 'reports', label: 'Analytics & Dashboards', description: 'View visual performance metrics, velocity charts, and summaries', category: 'Analytics' },
    { key: 'reports.export', module: 'reports', label: 'Data Export', description: 'Export records and reports to CSV, Excel, or PDF', category: 'Export' },
    { key: 'reports.timesheets', module: 'reports', label: 'Timesheet Logs', description: 'Audit employee work logs, tracked timers, and project hours', category: 'Auditing' },

    // Users Operations
    { key: 'users.manage', module: 'users', label: 'User Accounts', description: 'Create, view, update, and manage user login credentials', category: 'Security' },
    { key: 'users.core', module: 'users', label: 'User Records', description: 'Core user account operations', category: 'Security' },

    // User Groups Operations
    { key: 'user-groups.manage', module: 'user-groups', label: 'User Groups & Roles', description: 'Create and configure access groups and permission policies', category: 'Access Control' },
    { key: 'user-groups.core', module: 'user-groups', label: 'Group Records', description: 'Core user group operations', category: 'Access Control' },

    // System Administration Operations
    { key: 'settings.users', module: 'settings', label: 'User Accounts (Legacy)', description: 'Create, view, update, and manage user login credentials', category: 'Security' },
    { key: 'settings.user_groups', module: 'settings', label: 'User Groups & Roles (Legacy)', description: 'Create and configure access groups and permission policies', category: 'Access Control' },
    { key: 'settings.system', module: 'settings', label: 'System Preferences', description: 'Modify system-wide configurations, branding, and integrations', category: 'Administration' },
  ],

  models: {
    tasks: {
      label: 'Tasks',
      fields: [
        { key: 'title', label: 'Title', category: 'Core Info' },
        { key: 'description', label: 'Description', category: 'Core Info' },
        { key: 'status', label: 'Status (To Do, In Progress, Done)', category: 'Progress' },
        { key: 'priority', label: 'Priority (Low, Medium, High, Urgent)', category: 'Progress' },
        { key: 'assignee', label: 'Assignee (Employee)', category: 'Assignment' },
        { key: 'dueDate', label: 'Due Date', category: 'Timeline' },
        { key: 'startDate', label: 'Start Date', category: 'Timeline' },
        { key: 'estimatedHours', label: 'Estimated Hours', category: 'Timeline' },
        { key: 'tags', label: 'Tags & Categories', category: 'Metadata' },
        { key: 'projectId', label: 'Project Linkage', category: 'Assignment' },
        { key: 'resources', label: 'File Attachments & Links', category: 'Resources' },
        { key: 'comments', label: 'Comments & Discussions', category: 'Activity' },
      ],
    },
    projects: {
      label: 'Projects',
      fields: [
        { key: 'name', label: 'Project Name', category: 'Core Info' },
        { key: 'description', label: 'Description', category: 'Core Info' },
        { key: 'status', label: 'Project Status', category: 'Progress' },
        { key: 'priority', label: 'Priority Level', category: 'Progress' },
        { key: 'teamId', label: 'Assigned Team', category: 'Assignment' },
        { key: 'startDate', label: 'Start Date', category: 'Timeline' },
        { key: 'dueDate', label: 'Target Due Date', category: 'Timeline' },
        { key: 'color', label: 'Color Theme', category: 'Appearance' },
        { key: 'comments', label: 'Project Comments', category: 'Activity' },
      ],
    },
    employees: {
      label: 'Employees',
      fields: [
        { key: 'fullName', label: 'Full Name (First, Middle, Last)', category: 'Personal' },
        { key: 'email', label: 'Email Address', category: 'Contact' },
        { key: 'role', label: 'Job Role / Title', category: 'Employment' },
        { key: 'department', label: 'Department', category: 'Employment' },
        { key: 'status', label: 'Status (Active, On Leave, Terminated)', category: 'Employment' },
        { key: 'personalNumber', label: 'Personal Mobile Number', category: 'Contact' },
        { key: 'houseContactNumber', label: 'Home / Emergency Phone', category: 'Contact' },
        { key: 'address', label: 'Residential Address', category: 'Personal' },
        { key: 'joiningDate', label: 'Joining Date', category: 'Employment' },
        { key: 'baseSalary', label: 'Base Salary Amount', category: 'Payroll (Confidential)', sensitive: true },
        { key: 'currency', label: 'Salary Currency', category: 'Payroll (Confidential)', sensitive: true },
        { key: 'payFrequency', label: 'Pay Frequency', category: 'Payroll (Confidential)', sensitive: true },
        { key: 'bankAccountNumber', label: 'Bank Account Number', category: 'Payroll (Confidential)', sensitive: true },
        { key: 'bankRoutingNumber', label: 'Bank Routing / IFSC', category: 'Payroll (Confidential)', sensitive: true },
        { key: 'taxId', label: 'Tax ID / SSN', category: 'Payroll (Confidential)', sensitive: true },
      ],
    },
    teams: {
      label: 'Teams',
      fields: [
        { key: 'name', label: 'Team Name', category: 'Core Info' },
        { key: 'description', label: 'Description', category: 'Core Info' },
        { key: 'teamLead', label: 'Team Lead Assignment', category: 'Leadership' },
        { key: 'members', label: 'Team Members', category: 'Membership' },
        { key: 'comments', label: 'Team Discussion Comments', category: 'Activity' },
      ],
    },
  },
};

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

export interface LegacyCatalogOperationDef {
  module: CatalogModule;
  operation: string;
}

export const CATALOG_OPERATIONS: LegacyCatalogOperationDef[] = PERMISSION_CATALOG.operations.map(
  (op) => ({
    module: op.module as CatalogModule,
    operation: op.key,
  }),
);

export const CATALOG_MODELS_AND_FIELDS: Record<string, string[]> = Object.fromEntries(
  Object.entries(PERMISSION_CATALOG.models).map(([model, def]) => [
    model,
    def.fields.map((f) => f.key),
  ]),
);
