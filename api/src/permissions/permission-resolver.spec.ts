import {
  explainGroup,
  canAny,
  isUnrestricted,
  resolveEffective,
} from './permission-resolver';
import { CATALOG_MODULES, CATALOG_OPERATIONS, CATALOG_MODELS_AND_FIELDS } from './permissions.catalog';

describe('PermissionResolver (Pure Functions)', () => {
  const employeeGroup = {
    name: 'Employee',
    modulePermissions: [
      { module: 'tasks', scope: 'own', create: true, read: true, update: true, delete: false },
      { module: 'projects', scope: 'own', create: false, read: true, update: false, delete: false },
    ],
    operationPermissions: [
      { module: 'tasks', operation: 'tasks.comments', read: true, write: true, update: true, delete: true },
      { module: 'tasks', operation: 'tasks.attachments', read: true, write: false, update: false, delete: false },
    ],
    fieldPermissions: [
      { model: 'tasks', field: 'status', read: true, write: true, update: true, delete: true },
      { model: 'tasks', field: 'priority', read: true, write: false, update: false, delete: false },
    ],
  };

  const pmGroup = {
    name: 'Project Manager',
    modulePermissions: [
      { module: 'tasks', scope: 'team', create: true, read: true, update: true, delete: true },
      { module: 'projects', scope: 'team', create: true, read: true, update: true, delete: true },
    ],
    operationPermissions: [],
    fieldPermissions: [], // PM has no field restrictions: inherits full module grant
  };

  const adminGroup = {
    name: 'Administrators',
    modulePermissions: [
      { module: 'tasks', scope: 'all', create: true, read: true, update: true, delete: true },
      { module: 'projects', scope: 'all', create: true, read: true, update: true, delete: true },
    ],
  };

  describe('explainGroup', () => {
    it('should allow action if module allows and no operation/field restriction exists', () => {
      const res = explainGroup(employeeGroup, { module: 'tasks', action: 'read' });
      expect(res.allowed).toBe(true);
      expect(res.scope).toBe('own');
    });

    it('should deny action if module gate denies it', () => {
      const res = explainGroup(employeeGroup, { module: 'tasks', action: 'delete' });
      expect(res.allowed).toBe(false);
      expect(res.reason).toContain("does not grant action 'delete'");
    });

    it('should inherit allowed module action when operation rule is missing', () => {
      const res = explainGroup(employeeGroup, {
        module: 'tasks',
        action: 'read',
        operation: 'tasks.core',
      });
      expect(res.allowed).toBe(true);
    });

    it('should deny action when operation rule explicitly denies it', () => {
      const res = explainGroup(employeeGroup, {
        module: 'tasks',
        action: 'create', // maps to write
        operation: 'tasks.attachments',
      });
      expect(res.allowed).toBe(false);
      expect(res.reason).toContain("Operation 'tasks.attachments' explicitly denies action 'create'");
    });

    it('should allow status update and deny priority update for Employee group', () => {
      const statusRes = explainGroup(employeeGroup, {
        module: 'tasks',
        action: 'update',
        field: 'status',
      });
      expect(statusRes.allowed).toBe(true);

      const priorityRes = explainGroup(employeeGroup, {
        module: 'tasks',
        action: 'update',
        field: 'priority',
      });
      expect(priorityRes.allowed).toBe(false);
      expect(priorityRes.reason).toContain("Field 'priority' on model 'tasks' explicitly denies action 'update'");
    });

    it('should deny update when multiple fields are passed and at least one is restricted', () => {
      const multiRes = explainGroup(employeeGroup, {
        module: 'tasks',
        action: 'update',
        fields: ['status', 'priority'],
      });
      expect(multiRes.allowed).toBe(false);
    });
  });

  describe('canAny (Union across groups & scope widening)', () => {
    it('should deny priority update for Employee alone', () => {
      const res = canAny([employeeGroup], {
        module: 'tasks',
        action: 'update',
        field: 'priority',
      });
      expect(res.allowed).toBe(false);
    });

    it('should allow priority update when PM and Employee groups are combined (PM has no field restriction)', () => {
      const res = canAny([employeeGroup, pmGroup], {
        module: 'tasks',
        action: 'update',
        field: 'priority',
      });
      expect(res.allowed).toBe(true);
      expect(res.scope).toBe('team'); // PM scope is 'team', Employee is 'own' -> 'team' wins
    });

    it('should choose widest scope (all > team > own)', () => {
      const res = canAny([employeeGroup, pmGroup, adminGroup], {
        module: 'tasks',
        action: 'read',
      });
      expect(res.allowed).toBe(true);
      expect(res.scope).toBe('all');
    });

    it('should deny if module is missing in every group', () => {
      const res = canAny([employeeGroup], {
        module: 'unknown-module',
        action: 'read',
      });
      expect(res.allowed).toBe(false);
      expect(res.scope).toBe('own');
    });

    it('should deny for empty groups array', () => {
      const res = canAny([], {
        module: 'tasks',
        action: 'read',
      });
      expect(res.allowed).toBe(false);
    });
  });

  describe('isUnrestricted', () => {
    const originalEnv = process.env.PERMISSIONS_DENY_WHEN_NO_GROUP;

    afterEach(() => {
      process.env.PERMISSIONS_DENY_WHEN_NO_GROUP = originalEnv;
    });

    it('should return true for system admin user', () => {
      expect(isUnrestricted({ is_system_admin: true }, [employeeGroup])).toBe(true);
    });

    it('should return true for user in Administrators group', () => {
      expect(isUnrestricted({ is_system_admin: false }, [adminGroup])).toBe(true);
      expect(isUnrestricted({}, [{ name: 'administrators' }])).toBe(true);
    });

    it('should return true with warning when user has no groups and env flag is false', () => {
      process.env.PERMISSIONS_DENY_WHEN_NO_GROUP = 'false';
      expect(isUnrestricted({ id: 'user1' }, [])).toBe(true);
      expect(isUnrestricted({ id: 'user1' }, undefined)).toBe(true);
    });

    it('should return false when user has no groups and PERMISSIONS_DENY_WHEN_NO_GROUP=true', () => {
      process.env.PERMISSIONS_DENY_WHEN_NO_GROUP = 'true';
      expect(isUnrestricted({ id: 'user1' }, [])).toBe(false);
      expect(isUnrestricted({ id: 'user1' }, undefined)).toBe(false);
    });

    it('should return false for regular user with non-admin groups', () => {
      expect(isUnrestricted({ is_system_admin: false }, [employeeGroup])).toBe(false);
    });
  });

  describe('resolveEffective', () => {
    it('should return complete matrix with version hash and moduleScopes', () => {
      const effective = resolveEffective([employeeGroup], {
        modules: ['tasks', 'projects'],
        operations: [{ module: 'tasks', operation: 'tasks.comments' }],
        modelsAndFields: { tasks: ['status', 'priority'] },
      });

      expect(effective.groups).toEqual(['Employee']);
      expect(effective.modulePermissions.tasks).toEqual({
        create: true,
        read: true,
        update: true,
        delete: false,
      });
      expect(effective.moduleScopes.tasks).toBe('own');
      expect(effective.operationPermissions['tasks.comments']).toEqual({
        read: true,
        write: true,
        update: true,
        delete: false, // Restricted by tasks module delete: false
      });
      expect(effective.fieldPermissions.tasks.status).toBeDefined();
      expect(effective.fieldPermissions.tasks.status.update).toBe(true);
      expect(effective.fieldPermissions.tasks.priority.update).toBe(false);
      expect(typeof effective.version).toBe('string');
      expect(effective.version.length).toBeGreaterThan(0);
    });

    it('should remove field from effective map when read is false', () => {
      const groupWithHiddenField = {
        name: 'Restricted',
        modulePermissions: [{ module: 'tasks', scope: 'own', create: true, read: true, update: true, delete: true }],
        fieldPermissions: [
          { model: 'tasks', field: 'secretField', read: false, write: false, update: false, delete: false },
          { model: 'tasks', field: 'visibleField', read: true, write: true, update: true, delete: true },
        ],
      };

      const effective = resolveEffective([groupWithHiddenField], {
        modules: ['tasks'],
        operations: [],
        modelsAndFields: { tasks: ['secretField', 'visibleField'] },
      });

      expect(effective.fieldPermissions.tasks.visibleField).toBeDefined();
      expect(effective.fieldPermissions.tasks.secretField).toBeUndefined();
    });

    it('should produce identical version hash for same permissions and different version for modified permissions', () => {
      const effective1 = resolveEffective([employeeGroup], {
        modules: ['tasks'],
        operations: [],
        modelsAndFields: { tasks: ['status'] },
      });

      const effective2 = resolveEffective([employeeGroup], {
        modules: ['tasks'],
        operations: [],
        modelsAndFields: { tasks: ['status'] },
      });

      const effective3 = resolveEffective([pmGroup], {
        modules: ['tasks'],
        operations: [],
        modelsAndFields: { tasks: ['status'] },
      });

      expect(effective1.version).toBe(effective2.version);
      expect(effective1.version).not.toBe(effective3.version);
    });
  });
});
