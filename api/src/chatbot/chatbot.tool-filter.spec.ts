import {
  TOOL_DEFINITIONS,
  TOOL_REQUIREMENTS,
  TOOL_MODULE_MAP,
  filterToolsForUser,
} from './helpers/toolRegistry';

describe('Chatbot Tool Filtering & Field Pruning (Phase 21)', () => {
  describe('1. Requirement & Catalog Consistency', () => {
    it('should have a requirement mapping for every tool in TOOL_DEFINITIONS', () => {
      for (const tool of TOOL_DEFINITIONS) {
        expect(tool.name in TOOL_REQUIREMENTS).toBe(true);
      }
    });

    it('should designate get_me and get_my_permissions as public authenticated tools (null requirement)', () => {
      expect(TOOL_REQUIREMENTS['get_me']).toBeNull();
      expect(TOOL_REQUIREMENTS['get_my_permissions']).toBeNull();
    });

    it('should map all module-tied tools to valid CRUD actions', () => {
      const validActions = ['create', 'read', 'update', 'delete'];
      for (const [toolName, req] of Object.entries(TOOL_REQUIREMENTS)) {
        if (req !== null) {
          expect(validActions).toContain(req.action);
          expect(req.module).toBeTruthy();
        }
      }
    });

    it('should maintain backwards-compatible TOOL_MODULE_MAP matching TOOL_REQUIREMENTS', () => {
      for (const [toolName, req] of Object.entries(TOOL_REQUIREMENTS)) {
        expect(TOOL_MODULE_MAP[toolName]).toEqual(req ? req.module : null);
      }
    });
  });

  describe('2. Unrestricted Access', () => {
    it('should allow all tools and have empty deniedModules for system administrators', () => {
      const user = { id: 'admin1', is_system_admin: true };
      const { allowedTools, deniedModules } = filterToolsForUser(TOOL_DEFINITIONS, [], user);

      expect(allowedTools.length).toBe(TOOL_DEFINITIONS.length);
      expect(deniedModules).toEqual([]);
    });

    it('should allow all tools and have empty deniedModules for members of Administrators group', () => {
      const user = { id: 'user1', is_system_admin: false };
      const groups = [{ name: 'Administrators' }];
      const { allowedTools, deniedModules } = filterToolsForUser(TOOL_DEFINITIONS, groups, user);

      expect(allowedTools.length).toBe(TOOL_DEFINITIONS.length);
      expect(deniedModules).toEqual([]);
    });
  });

  describe('3. Zero-Groups & No Permissions (Deny by Default)', () => {
    const originalEnv = process.env.PERMISSIONS_DENY_WHEN_NO_GROUP;

    afterEach(() => {
      process.env.PERMISSIONS_DENY_WHEN_NO_GROUP = originalEnv;
    });

    it('should only allow public/self tools when user has no groups and PERMISSIONS_DENY_WHEN_NO_GROUP is true', () => {
      process.env.PERMISSIONS_DENY_WHEN_NO_GROUP = 'true';
      const user = { id: 'user-no-groups', is_system_admin: false };
      const { allowedTools, deniedModules } = filterToolsForUser(TOOL_DEFINITIONS, [], user);

      const toolNames = allowedTools.map((t) => t.name);
      expect(toolNames).toEqual(['get_me', 'get_my_permissions']);

      expect(deniedModules).toContain('tasks');
      expect(deniedModules).toContain('projects');
      expect(deniedModules).toContain('teams');
      expect(deniedModules).toContain('employees');
      expect(deniedModules).toContain('users');
      expect(deniedModules).toContain('user-groups');
      expect(deniedModules).toContain('reports');
    });

    it('should only allow public/self tools when user is in a group with no module permissions', () => {
      const user = { id: 'user-empty-group', is_system_admin: false };
      const groups = [{ name: 'Empty Group', modulePermissions: [] }];
      const { allowedTools, deniedModules } = filterToolsForUser(TOOL_DEFINITIONS, groups, user);

      const toolNames = allowedTools.map((t) => t.name);
      expect(toolNames).toEqual(['get_me', 'get_my_permissions']);

      expect(deniedModules).toContain('tasks');
      expect(deniedModules).toContain('projects');
      expect(deniedModules).toContain('teams');
      expect(deniedModules).toContain('employees');
      expect(deniedModules).toContain('users');
      expect(deniedModules).toContain('user-groups');
      expect(deniedModules).toContain('reports');
    });
  });

  describe('4. Action-Level Scoping', () => {
    it('should allow read tools but deny create/update/delete tools for read-only user', () => {
      const user = { id: 'reader1' };
      const groups = [
        {
          name: 'Task Readers',
          modulePermissions: [
            { module: 'tasks', read: true, create: false, update: false, delete: false },
          ],
        },
      ];

      const { allowedTools } = filterToolsForUser(TOOL_DEFINITIONS, groups, user);
      const toolNames = allowedTools.map((t) => t.name);

      // Read tools allowed
      expect(toolNames).toContain('list_tasks');
      expect(toolNames).toContain('get_task');
      expect(toolNames).toContain('get_me');
      expect(toolNames).toContain('get_my_permissions');

      // Mutation tools denied
      expect(toolNames).not.toContain('create_task');
      expect(toolNames).not.toContain('update_task');
      expect(toolNames).not.toContain('delete_task');
      expect(toolNames).not.toContain('duplicate_task');
      expect(toolNames).not.toContain('add_task_comment');
      expect(toolNames).not.toContain('start_timer');
      expect(toolNames).not.toContain('stop_timer');
      expect(toolNames).not.toContain('invite_member');
    });

    it('should allow create tools when user has create permission', () => {
      const user = { id: 'creator1' };
      const groups = [
        {
          name: 'Task Creators',
          modulePermissions: [
            { module: 'tasks', read: true, create: true, update: false, delete: false },
          ],
        },
      ];

      const { allowedTools } = filterToolsForUser(TOOL_DEFINITIONS, groups, user);
      const toolNames = allowedTools.map((t) => t.name);

      expect(toolNames).toContain('create_task');
      expect(toolNames).toContain('duplicate_task');
      expect(toolNames).toContain('add_task_comment');
      expect(toolNames).not.toContain('update_task');
      expect(toolNames).not.toContain('delete_task');
    });
  });

  describe('5. Operation-Level Scoping', () => {
    it('should deny start_timer and stop_timer if tasks.time_tracking operation is denied', () => {
      const user = { id: 'no-timer-user' };
      const groups = [
        {
          name: 'Standard Staff',
          modulePermissions: [
            { module: 'tasks', read: true, create: true, update: true, delete: false },
          ],
          operationPermissions: [
            { operation: 'tasks.time_tracking', read: true, write: false, update: false, delete: false },
          ],
        },
      ];

      const { allowedTools } = filterToolsForUser(TOOL_DEFINITIONS, groups, user);
      const toolNames = allowedTools.map((t) => t.name);

      // Core update task is allowed
      expect(toolNames).toContain('update_task');

      // Time tracking operations are denied
      expect(toolNames).not.toContain('start_timer');
      expect(toolNames).not.toContain('stop_timer');
    });
  });

  describe('6. Field Pruning in Tool Input Schemas', () => {
    it('should prune restricted fields from create_task and update_task schemas', () => {
      const user = { id: 'restricted-fields-user' };
      const groups = [
        {
          name: 'Junior Developer',
          modulePermissions: [
            { module: 'tasks', read: true, create: true, update: true, delete: false },
          ],
          fieldPermissions: [
            { model: 'tasks', field: 'priority', read: true, write: false, update: false, delete: false },
          ],
        },
      ];

      const { allowedTools } = filterToolsForUser(TOOL_DEFINITIONS, groups, user);

      const createTask = allowedTools.find((t) => t.name === 'create_task');
      const updateTask = allowedTools.find((t) => t.name === 'update_task');

      expect(createTask).toBeDefined();
      expect(updateTask).toBeDefined();

      const createProps = createTask?.input_schema?.properties as any;
      const updateProps = updateTask?.input_schema?.properties as any;

      // Priority field must be pruned
      expect(createProps?.priority).toBeUndefined();
      expect(updateProps?.priority).toBeUndefined();

      // Non-restricted fields must remain
      expect(createProps?.title).toBeDefined();
      expect(createProps?.description).toBeDefined();
      expect(createProps?.status).toBeDefined();
      expect(updateProps?.title).toBeDefined();
      expect(updateProps?.status).toBeDefined();
    });

    it('should preserve original TOOL_DEFINITIONS without mutating global constants', () => {
      const originalCreate = TOOL_DEFINITIONS.find((t) => t.name === 'create_task');
      const originalProps = originalCreate?.input_schema?.properties as any;

      expect(originalProps?.priority).toBeDefined();
    });
  });

  describe('7. Denied Modules Prompt Guidance', () => {
    it('should list all modules the user has no access to in deniedModules', () => {
      const user = { id: 'only-tasks-user' };
      const groups = [
        {
          name: 'Tasks Only',
          modulePermissions: [
            { module: 'tasks', read: true, create: true, update: true, delete: true },
          ],
        },
      ];

      const { deniedModules } = filterToolsForUser(TOOL_DEFINITIONS, groups, user);

      expect(deniedModules).not.toContain('tasks');
      expect(deniedModules).toContain('projects');
      expect(deniedModules).toContain('teams');
      expect(deniedModules).toContain('employees');
      expect(deniedModules).toContain('users');
      expect(deniedModules).toContain('user-groups');
      expect(deniedModules).toContain('reports');
    });
  });
});
