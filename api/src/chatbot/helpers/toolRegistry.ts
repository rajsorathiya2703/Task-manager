import type Anthropic from '@anthropic-ai/sdk';
import { chatbotApiClient } from '../client/apiClient';

// ─────────────────────────────────────────────────────────────────────────────
// TOOL_MODULE_MAP — maps tool names to their module key as used in
// UserGroup.modulePermissions so the chatbot service can filter tools by RBAC.
// ─────────────────────────────────────────────────────────────────────────────
export const TOOL_MODULE_MAP: Record<string, string | null> = {
  get_me: null,
  // Tasks
  create_task: 'tasks', list_tasks: 'tasks', get_task: 'tasks',
  update_task: 'tasks', delete_task: 'tasks', duplicate_task: 'tasks',
  add_task_comment: 'tasks', start_timer: 'tasks', stop_timer: 'tasks', invite_member: 'tasks',
  // Projects
  create_project: 'projects', list_projects: 'projects', get_project: 'projects',
  update_project: 'projects', delete_project: 'projects',
  // Teams
  create_team: 'teams', list_teams: 'teams', get_team: 'teams',
  update_team: 'teams', get_active_tasks: 'teams',
  // Employees
  create_employee: 'employees', list_employees: 'employees',
  get_employee: 'employees', update_employee: 'employees',
  // Users
  list_users: 'users', update_user: 'users',
  // User Groups
  list_user_groups: 'user-groups', get_my_permissions: null, update_user_group: 'user-groups',
  // Dashboard
  get_employee_activity: 'dashboard',
};

// ─────────────────────────────────────────────────────────────────────────────
// TOOL_DEFINITIONS — Anthropic-compatible tool schemas for all 45+ tools.
// ─────────────────────────────────────────────────────────────────────────────
export const TOOL_DEFINITIONS: Anthropic.Tool[] = [
  {
    name: 'get_me',
    description: 'Get the currently authenticated user profile and role.',
    input_schema: { type: 'object' as const, properties: {}, required: [] },
  },
  // ── Tasks ───────────────────────────────────────────────────────────────
  {
    name: 'create_task',
    description: 'Create a new task. Always call list_projects first to resolve projectId and list_employees to resolve assignee.',
    input_schema: {
      type: 'object' as const,
      properties: {
        title: { type: 'string', description: 'Task title' },
        description: { type: 'string', description: 'Task description' },
        status: { type: 'string', enum: ['To Do', 'In Progress', 'Review', 'Done'], description: 'Task status' },
        priority: { type: 'string', enum: ['Low', 'Medium', 'High', 'Urgent'] },
        startDate: { type: 'string', description: 'ISO date string YYYY-MM-DD' },
        dueDate: { type: 'string', description: 'ISO date string YYYY-MM-DD' },
        estimatedHours: { type: 'number' },
        tags: { type: 'array', items: { type: 'string' } },
        projectId: { type: 'string', description: 'MongoDB ObjectId of the project' },
        assignee: { type: 'string', description: 'MongoDB ObjectId of the employee' },
      },
      required: ['title'],
    },
  },
  {
    name: 'list_tasks',
    description: 'List all tasks, optionally filtered by projectId.',
    input_schema: {
      type: 'object' as const,
      properties: { projectId: { type: 'string' } },
      required: [],
    },
  },
  {
    name: 'get_task',
    description: 'Get a task by its MongoDB ObjectId.',
    input_schema: {
      type: 'object' as const,
      properties: { id: { type: 'string' } },
      required: ['id'],
    },
  },
  {
    name: 'update_task',
    description: 'Update fields on an existing task.',
    input_schema: {
      type: 'object' as const,
      properties: {
        id: { type: 'string' },
        title: { type: 'string' }, description: { type: 'string' },
        status: { type: 'string', enum: ['To Do', 'In Progress', 'Review', 'Done'] },
        priority: { type: 'string', enum: ['Low', 'Medium', 'High', 'Urgent'] },
        dueDate: { type: 'string' }, assignee: { type: 'string' }, projectId: { type: 'string' },
      },
      required: ['id'],
    },
  },
  {
    name: 'delete_task',
    description: 'Delete a task permanently. Confirm with the user first.',
    input_schema: { type: 'object' as const, properties: { id: { type: 'string' } }, required: ['id'] },
  },
  {
    name: 'duplicate_task',
    description: 'Duplicate an existing task.',
    input_schema: { type: 'object' as const, properties: { id: { type: 'string' } }, required: ['id'] },
  },
  {
    name: 'add_task_comment',
    description: 'Add a comment to a task.',
    input_schema: {
      type: 'object' as const,
      properties: { taskId: { type: 'string' }, content: { type: 'string' } },
      required: ['taskId', 'content'],
    },
  },
  {
    name: 'start_timer',
    description: 'Start the time tracker for a task.',
    input_schema: { type: 'object' as const, properties: { taskId: { type: 'string' } }, required: ['taskId'] },
  },
  {
    name: 'stop_timer',
    description: 'Stop the active time tracker on a task.',
    input_schema: { type: 'object' as const, properties: { taskId: { type: 'string' } }, required: ['taskId'] },
  },
  {
    name: 'invite_member',
    description: 'Invite a collaborator to a task by email.',
    input_schema: {
      type: 'object' as const,
      properties: { taskId: { type: 'string' }, email: { type: 'string' }, name: { type: 'string' } },
      required: ['taskId', 'email'],
    },
  },
  // ── Projects ────────────────────────────────────────────────────────────
  {
    name: 'list_projects',
    description: 'List all accessible projects. Use this to resolve a project name to a projectId.',
    input_schema: { type: 'object' as const, properties: {}, required: [] },
  },
  {
    name: 'get_project',
    description: 'Get a project by its MongoDB ObjectId.',
    input_schema: { type: 'object' as const, properties: { id: { type: 'string' } }, required: ['id'] },
  },
  {
    name: 'create_project',
    description: 'Create a new project.',
    input_schema: {
      type: 'object' as const,
      properties: {
        name: { type: 'string' }, description: { type: 'string' },
        status: { type: 'string' }, priority: { type: 'string' },
        startDate: { type: 'string' }, dueDate: { type: 'string' }, teamId: { type: 'string' },
      },
      required: ['name'],
    },
  },
  {
    name: 'update_project',
    description: 'Update fields on an existing project.',
    input_schema: {
      type: 'object' as const,
      properties: {
        id: { type: 'string' }, name: { type: 'string' }, description: { type: 'string' },
        status: { type: 'string' }, priority: { type: 'string' }, dueDate: { type: 'string' },
      },
      required: ['id'],
    },
  },
  {
    name: 'delete_project',
    description: 'Delete a project permanently. Confirm first.',
    input_schema: { type: 'object' as const, properties: { id: { type: 'string' } }, required: ['id'] },
  },
  // ── Teams ────────────────────────────────────────────────────────────────
  {
    name: 'list_teams',
    description: 'List all teams.',
    input_schema: { type: 'object' as const, properties: {}, required: [] },
  },
  {
    name: 'get_team',
    description: 'Get a team by ObjectId.',
    input_schema: { type: 'object' as const, properties: { id: { type: 'string' } }, required: ['id'] },
  },
  {
    name: 'create_team',
    description: 'Create a new team.',
    input_schema: {
      type: 'object' as const,
      properties: { name: { type: 'string' }, description: { type: 'string' }, members: { type: 'array', items: { type: 'string' } }, teamLead: { type: 'string' } },
      required: ['name'],
    },
  },
  {
    name: 'update_team',
    description: 'Update a team.',
    input_schema: { type: 'object' as const, properties: { id: { type: 'string' }, name: { type: 'string' }, description: { type: 'string' } }, required: ['id'] },
  },
  {
    name: 'get_active_tasks',
    description: 'Get all active tasks for a team.',
    input_schema: { type: 'object' as const, properties: { teamId: { type: 'string' } }, required: ['teamId'] },
  },
  // ── Employees ────────────────────────────────────────────────────────────
  {
    name: 'list_employees',
    description: 'List employees. Use to resolve a person name to an employee ObjectId. Payroll fields are NOT included.',
    input_schema: { type: 'object' as const, properties: { search: { type: 'string', description: 'Optional name or email search' } }, required: [] },
  },
  {
    name: 'get_employee',
    description: 'Get an employee by ObjectId. Payroll fields are excluded.',
    input_schema: { type: 'object' as const, properties: { id: { type: 'string' } }, required: ['id'] },
  },
  {
    name: 'create_employee',
    description: 'Create a new employee record.',
    input_schema: {
      type: 'object' as const,
      properties: { firstName: { type: 'string' }, lastName: { type: 'string' }, email: { type: 'string' }, role: { type: 'string' }, department: { type: 'string' }, joiningDate: { type: 'string' } },
      required: ['firstName', 'lastName', 'role', 'joiningDate'],
    },
  },
  {
    name: 'update_employee',
    description: 'Update employee profile fields.',
    input_schema: {
      type: 'object' as const,
      properties: { id: { type: 'string' }, firstName: { type: 'string' }, lastName: { type: 'string' }, email: { type: 'string' }, role: { type: 'string' }, department: { type: 'string' }, status: { type: 'string' } },
      required: ['id'],
    },
  },
  // ── Users ─────────────────────────────────────────────────────────────────
  {
    name: 'list_users',
    description: 'List platform user accounts.',
    input_schema: { type: 'object' as const, properties: {}, required: [] },
  },
  {
    name: 'update_user',
    description: 'Update a user account.',
    input_schema: { type: 'object' as const, properties: { id: { type: 'string' }, name: { type: 'string' } }, required: ['id'] },
  },
  // ── User Groups ──────────────────────────────────────────────────────────
  {
    name: 'list_user_groups',
    description: 'List all user groups and their permissions.',
    input_schema: { type: 'object' as const, properties: {}, required: [] },
  },
  {
    name: 'get_my_permissions',
    description: "Get the current user's effective permissions from their User Groups.",
    input_schema: { type: 'object' as const, properties: {}, required: [] },
  },
  // ── Dashboard ─────────────────────────────────────────────────────────────
  {
    name: 'get_employee_activity',
    description: 'Get employee activity summary for standup reports and workload analysis.',
    input_schema: {
      type: 'object' as const,
      properties: { startDate: { type: 'string' }, endDate: { type: 'string' } },
      required: [],
    },
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// executeToolByName — dispatches tool calls from Claude to the correct API endpoint.
// ─────────────────────────────────────────────────────────────────────────────
const PAYROLL_FIELDS = ['baseSalary', 'currency', 'payFrequency', 'bankAccountNumber', 'bankRoutingNumber', 'taxId'];

function sanitizeEmployee(emp: any): any {
  const s = { ...emp };
  PAYROLL_FIELDS.forEach((f) => delete s[f]);
  return s;
}

export async function executeToolByName(
  toolName: string,
  input: Record<string, unknown>,
): Promise<unknown> {
  switch (toolName) {
    case 'get_me':
      return (await chatbotApiClient.get('/auth/me')).data;

    // Tasks
    case 'create_task': {
      const body = { ...input, tags: [...((input.tags as string[]) ?? []), 'AI-Created'] };
      return (await chatbotApiClient.post('/tasks', body)).data;
    }
    case 'list_tasks':
      return (await chatbotApiClient.get('/tasks', { params: input.projectId ? { projectId: input.projectId } : {} })).data;
    case 'get_task':
      return (await chatbotApiClient.get(`/tasks/${input.id}`)).data;
    case 'update_task': {
      const { id, ...body } = input;
      return (await chatbotApiClient.patch(`/tasks/${id}`, body)).data;
    }
    case 'delete_task':
      return (await chatbotApiClient.delete(`/tasks/${input.id}`)).data;
    case 'duplicate_task':
      return (await chatbotApiClient.post(`/tasks/${input.id}/duplicate`)).data;
    case 'add_task_comment':
      return (await chatbotApiClient.post(`/tasks/${input.taskId}/comments`, { content: input.content })).data;
    case 'start_timer':
      return (await chatbotApiClient.post(`/tasks/${input.taskId}/timer/start`)).data;
    case 'stop_timer':
      return (await chatbotApiClient.post(`/tasks/${input.taskId}/timer/stop`)).data;
    case 'invite_member':
      return (await chatbotApiClient.post(`/tasks/${input.taskId}/invite`, { email: input.email, name: input.name })).data;

    // Projects
    case 'list_projects':
      return (await chatbotApiClient.get('/projects')).data;
    case 'get_project':
      return (await chatbotApiClient.get(`/projects/${input.id}`)).data;
    case 'create_project':
      return (await chatbotApiClient.post('/projects', input)).data;
    case 'update_project': {
      const { id, ...body } = input;
      return (await chatbotApiClient.patch(`/projects/${id}`, body)).data;
    }
    case 'delete_project':
      return (await chatbotApiClient.delete(`/projects/${input.id}`)).data;

    // Teams
    case 'list_teams':
      return (await chatbotApiClient.get('/teams')).data;
    case 'get_team':
      return (await chatbotApiClient.get(`/teams/${input.id}`)).data;
    case 'create_team':
      return (await chatbotApiClient.post('/teams', input)).data;
    case 'update_team': {
      const { id, ...body } = input;
      return (await chatbotApiClient.patch(`/teams/${id}`, body)).data;
    }
    case 'get_active_tasks':
      return (await chatbotApiClient.get(`/teams/${input.teamId}/active-tasks`)).data;

    // Employees (with payroll sanitization)
    case 'list_employees': {
      const res = (await chatbotApiClient.get('/employees')).data;
      let emps: any[] = Array.isArray(res) ? res : res?.data ?? [];
      emps = emps.map(sanitizeEmployee);
      if (input.search) {
        const q = (input.search as string).toLowerCase();
        emps = emps.filter((e) => {
          const name = `${e.fullName?.firstName ?? ''} ${e.fullName?.lastName ?? ''}`.toLowerCase();
          return name.includes(q) || e.email?.toLowerCase().includes(q);
        });
      }
      return emps;
    }
    case 'get_employee':
      return sanitizeEmployee((await chatbotApiClient.get(`/employees/${input.id}`)).data);
    case 'create_employee': {
      const body = {
        fullName: { firstName: input.firstName, middleName: input.middleName, lastName: input.lastName },
        email: input.email, role: input.role, department: input.department,
        joiningDate: input.joiningDate, status: input.status ?? 'Active',
      };
      return (await chatbotApiClient.post('/employees', body)).data;
    }
    case 'update_employee': {
      const { id, firstName, lastName, middleName, ...rest } = input as any;
      const body: any = { ...rest };
      if (firstName || lastName || middleName) {
        body.fullName = { ...(firstName ? { firstName } : {}), ...(middleName ? { middleName } : {}), ...(lastName ? { lastName } : {}) };
      }
      return (await chatbotApiClient.patch(`/employees/${id}`, body)).data;
    }

    // Users
    case 'list_users':
      return (await chatbotApiClient.get('/users')).data;
    case 'update_user': {
      const { id, ...body } = input;
      return (await chatbotApiClient.patch(`/users/${id}`, body)).data;
    }

    // User Groups
    case 'list_user_groups':
      return (await chatbotApiClient.get('/user-groups')).data;
    case 'get_my_permissions':
      return (await chatbotApiClient.get('/user-groups/my-permissions')).data;
    case 'update_user_group': {
      const { id, ...body } = input;
      return (await chatbotApiClient.patch(`/user-groups/${id}`, body)).data;
    }

    // Dashboard
    case 'get_employee_activity': {
      const params: any = {};
      if (input.startDate) params.startDate = input.startDate;
      if (input.endDate) params.endDate = input.endDate;
      return (await chatbotApiClient.get('/dashboard/employee-activity', { params })).data;
    }

    default:
      throw new Error(`Unknown tool: ${toolName}`);
  }
}
