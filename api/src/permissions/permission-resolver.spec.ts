import {
  resolvePermission,
  resolveAllPermissions,
  GroupDoc,
} from './permission-resolver';

describe('PermissionResolver', () => {
  const employeeGroup: GroupDoc = {
    name: 'Employee',
    modulePermissions: [
      {
        module: 'tasks',
        create: true,
        read: true,
        update: true,
        delete: false,
        scope: 'own',
      },
      {
        module: 'projects',
        create: false,
        read: true,
        update: false,
        delete: false,
        scope: 'team',
      },
    ],
    operationPermissions: [
      {
        module: 'tasks',
        operation: 'tasks.timer',
        read: true,
        write: true,
        update: true,
        delete: false,
      },
      {
        module: 'tasks',
        operation: 'tasks.upload',
        read: false,
        write: false,
        update: false,
        delete: false,
      },
    ],
    fieldPermissions: [
      {
        model: 'tasks',
        field: 'estimatedHours',
        read: true,
        write: false,
        update: false,
        delete: false,
      },
    ],
  };

  const managerGroup: GroupDoc = {
    name: 'Manager',
    modulePermissions: [
      {
        module: 'tasks',
        create: true,
        read: true,
        update: true,
        delete: true,
        scope: 'all',
      },
      {
        module: 'employees',
        create: true,
        read: true,
        update: true,
        delete: false,
        scope: 'team',
      },
    ],
    operationPermissions: [
      {
        module: 'tasks',
        operation: 'tasks.upload',
        read: true,
        write: true,
        update: true,
        delete: true,
      },
    ],
    fieldPermissions: [
      {
        model: 'tasks',
        field: 'estimatedHours',
        read: true,
        write: true,
        update: true,
        delete: false,
      },
    ],
  };

  describe('resolvePermission', () => {
    it('should deny when user has no groups', () => {
      const res = resolvePermission([], { module: 'tasks', action: 'read' });
      expect(res.allowed).toBe(false);
      expect(res.grantedBy).toHaveLength(0);
    });

    it('should allow and return correct scope for single group', () => {
      const res = resolvePermission([employeeGroup], {
        module: 'tasks',
        action: 'read',
      });
      expect(res.allowed).toBe(true);
      expect(res.scope).toBe('own');
      expect(res.grantedBy).toEqual(['Employee']);
    });

    it('should deny when group denies the action', () => {
      const res = resolvePermission([employeeGroup], {
        module: 'tasks',
        action: 'delete',
      });
      expect(res.allowed).toBe(false);
      expect(res.grantedBy).toHaveLength(0);
    });

    it('should evaluate operation-level permissions (allow)', () => {
      const res = resolvePermission([employeeGroup], {
        module: 'tasks',
        action: 'update',
        operation: 'tasks.timer',
      });
      expect(res.allowed).toBe(true);
      expect(res.grantedBy).toEqual(['Employee']);
    });

    it('should evaluate operation-level permissions (deny)', () => {
      const res = resolvePermission([employeeGroup], {
        module: 'tasks',
        action: 'create',
        operation: 'tasks.upload',
      });
      expect(res.allowed).toBe(false);
      expect(res.grantedBy).toHaveLength(0);
    });

    it('should evaluate field-level permissions (deny write)', () => {
      const res = resolvePermission([employeeGroup], {
        module: 'tasks',
        action: 'create',
        model: 'tasks',
        field: 'estimatedHours',
      });
      expect(res.allowed).toBe(false);
      expect(res.grantedBy).toHaveLength(0);
    });

    it('should evaluate field-level permissions (allow read)', () => {
      const res = resolvePermission([employeeGroup], {
        module: 'tasks',
        action: 'read',
        model: 'tasks',
        field: 'estimatedHours',
      });
      expect(res.allowed).toBe(true);
      expect(res.grantedBy).toEqual(['Employee']);
    });

    it('should perform OR evaluation across multiple groups and take widest scope', () => {
      const res = resolvePermission([employeeGroup, managerGroup], {
        module: 'tasks',
        action: 'delete',
      });
      // Employee denies delete, but Manager allows delete with scope 'all'
      expect(res.allowed).toBe(true);
      expect(res.scope).toBe('all');
      expect(res.grantedBy).toEqual(['Manager']);
    });

    it('should grant operation allowed in one group even if denied in another', () => {
      const res = resolvePermission([employeeGroup, managerGroup], {
        module: 'tasks',
        action: 'create',
        operation: 'tasks.upload',
      });
      expect(res.allowed).toBe(true);
      expect(res.grantedBy).toEqual(['Manager']);
    });

    it('should grant field write allowed in one group even if denied in another', () => {
      const res = resolvePermission([employeeGroup, managerGroup], {
        module: 'tasks',
        action: 'create',
        model: 'tasks',
        field: 'estimatedHours',
      });
      expect(res.allowed).toBe(true);
      expect(res.grantedBy).toEqual(['Manager']);
    });
  });

  describe('resolveAllPermissions', () => {
    it('should merge permissions using OR semantics', () => {
      const all = resolveAllPermissions([employeeGroup, managerGroup]);
      expect(all.groups).toEqual(['Employee', 'Manager']);

      // tasks module should have delete = true and scope = 'all'
      expect(all.modulePermissions.tasks).toBeDefined();
      expect(all.modulePermissions.tasks.create).toBe(true);
      expect(all.modulePermissions.tasks.read).toBe(true);
      expect(all.modulePermissions.tasks.update).toBe(true);
      expect(all.modulePermissions.tasks.delete).toBe(true);
      expect(all.modulePermissions.tasks.scope).toBe('all');

      // operationPermissions
      expect(all.operationPermissions['tasks.timer'].read).toBe(true);
      expect(all.operationPermissions['tasks.upload'].write).toBe(true);

      // fieldPermissions
      expect(all.fieldPermissions.tasks.estimatedHours.read).toBe(true);
      expect(all.fieldPermissions.tasks.estimatedHours.write).toBe(true);
    });
  });
});
