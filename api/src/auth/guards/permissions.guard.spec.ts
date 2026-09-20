import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionsGuard } from './permissions.guard';
import { UserGroupsService } from '../../user-groups/user-groups.service';
import { REQUIRE_PERMISSION_KEY } from '../decorators/permissions.decorator';
import { REQUIRE_SYSTEM_ADMIN_KEY } from '../decorators/system-admin.decorator';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { ALLOW_AUTHENTICATED_KEY } from '../decorators/allow-authenticated.decorator';

describe('PermissionsGuard', () => {
  let guard: PermissionsGuard;
  let reflector: jest.Mocked<Reflector>;
  let userGroupsService: jest.Mocked<UserGroupsService>;

  beforeEach(() => {
    reflector = {
      getAllAndOverride: jest.fn(),
    } as any;

    userGroupsService = {
      getUserPermissions: jest.fn(),
    } as any;

    guard = new PermissionsGuard(reflector, userGroupsService);
  });

  const createMockContext = (user: any, body?: any, reqExtra: any = {}): ExecutionContext => {
    const req = { user, body, ...reqExtra };
    return {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({
        getRequest: () => req,
      }),
    } as any;
  };

  it('should DENY access by default if no permission requirement is configured on the endpoint (Fixing fail-open bug)', async () => {
    // When no decorator is set, getAllAndOverride returns undefined for all keys
    reflector.getAllAndOverride.mockReturnValue(undefined);
    userGroupsService.getUserPermissions.mockResolvedValue({
      groups: ['Employee'],
      permissions: [],
      modulePermissions: {},
      operationPermissions: {},
      fieldPermissions: {},
    });

    const context = createMockContext({ id: 'user1' });

    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
  });

  it('should ALLOW access if endpoint is marked @Public() even without user session', async () => {
    reflector.getAllAndOverride.mockImplementation((key: string) => {
      if (key === IS_PUBLIC_KEY) return true;
      return undefined;
    });

    const context = createMockContext(undefined);

    const result = await guard.canActivate(context);
    expect(result).toBe(true);
  });

  it('should ALLOW access if endpoint is marked @AllowAuthenticated() with a valid user', async () => {
    reflector.getAllAndOverride.mockImplementation((key: string) => {
      if (key === ALLOW_AUTHENTICATED_KEY) return true;
      return undefined;
    });
    userGroupsService.getUserPermissions.mockResolvedValue({
      groups: ['Employee'],
      permissions: [],
      modulePermissions: {},
      operationPermissions: {},
      fieldPermissions: {},
    });

    const context = createMockContext({ id: 'user1' });

    const result = await guard.canActivate(context);
    expect(result).toBe(true);
  });

  it('should DENY access if user has no groups (Fixing fail-open bug)', async () => {
    reflector.getAllAndOverride.mockImplementation((key: string) => {
      if (key === REQUIRE_PERMISSION_KEY) return { module: 'tasks', action: 'read' };
      return undefined;
    });
    userGroupsService.getUserPermissions.mockResolvedValue({
      groups: [],
      permissions: [],
      modulePermissions: {},
      operationPermissions: {},
      fieldPermissions: {},
    });

    const context = createMockContext({ id: 'user1' });

    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
  });

  it('should DENY access if user is in an empty group with 0 permissions (Fixing empty-group bug)', async () => {
    reflector.getAllAndOverride.mockImplementation((key: string) => {
      if (key === REQUIRE_PERMISSION_KEY) return { module: 'tasks', action: 'read' };
      return undefined;
    });
    userGroupsService.getUserPermissions.mockResolvedValue({
      groups: ['EmptyGroup'],
      permissions: [],
      modulePermissions: {},
      operationPermissions: {},
      fieldPermissions: {},
    });

    const context = createMockContext({ id: 'user1' });

    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
  });

  it('should DENY access if user group does not have permission for the requested module', async () => {
    reflector.getAllAndOverride.mockImplementation((key: string) => {
      if (key === REQUIRE_PERMISSION_KEY) return { module: 'settings', action: 'read' };
      return undefined;
    });
    userGroupsService.getUserPermissions.mockResolvedValue({
      groups: ['Employee'],
      permissions: [],
      modulePermissions: {
        tasks: { create: true, read: true, update: true, delete: false },
      },
      operationPermissions: {},
      fieldPermissions: {},
    });

    const context = createMockContext({ id: 'user1' });

    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
  });

  it('should DENY access if user group has read permission but requested action is delete', async () => {
    reflector.getAllAndOverride.mockImplementation((key: string) => {
      if (key === REQUIRE_PERMISSION_KEY) return { module: 'tasks', action: 'delete' };
      return undefined;
    });
    userGroupsService.getUserPermissions.mockResolvedValue({
      groups: ['Employee'],
      permissions: [],
      modulePermissions: {
        tasks: { create: true, read: true, update: true, delete: false },
      },
      operationPermissions: {},
      fieldPermissions: {},
    });

    const context = createMockContext({ id: 'user1' });

    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
  });

  it('should DENY access if requested operation is explicitly denied in operationPermissions', async () => {
    reflector.getAllAndOverride.mockImplementation((key: string) => {
      if (key === REQUIRE_PERMISSION_KEY) {
        return { module: 'dayoff', action: 'update', operation: 'dayoff.approvals' };
      }
      return undefined;
    });
    userGroupsService.getUserPermissions.mockResolvedValue({
      groups: ['Employee'],
      permissions: ['dayoff:update'],
      modulePermissions: {
        dayoff: { create: true, read: true, update: true, delete: true },
      },
      operationPermissions: {
        'dayoff.approvals': { read: false, write: false, update: false, delete: false },
      },
      fieldPermissions: {},
    });

    const context = createMockContext({ id: 'user1' });

    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
  });

  it('should DENY access if sensitive operation like dayoff.policies has no explicit grant', async () => {
    reflector.getAllAndOverride.mockImplementation((key: string) => {
      if (key === REQUIRE_PERMISSION_KEY) {
        return { module: 'dayoff', action: 'create', operation: 'dayoff.policies' };
      }
      return undefined;
    });
    userGroupsService.getUserPermissions.mockResolvedValue({
      groups: ['Employee'],
      permissions: ['dayoff:create'],
      modulePermissions: {
        dayoff: { create: true, read: true, update: true, delete: true },
      },
      operationPermissions: {},
      fieldPermissions: {},
    });

    const context = createMockContext({ id: 'user1' });

    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
  });

  it('should ALLOW access if user group explicitly grants the module action', async () => {
    reflector.getAllAndOverride.mockImplementation((key: string) => {
      if (key === REQUIRE_PERMISSION_KEY) return { module: 'tasks', action: 'read' };
      return undefined;
    });
    userGroupsService.getUserPermissions.mockResolvedValue({
      groups: ['Employee'],
      permissions: [],
      modulePermissions: {
        tasks: { create: true, read: true, update: true, delete: false },
      },
      operationPermissions: {},
      fieldPermissions: {},
    });

    const context = createMockContext({ id: 'user1' });

    const result = await guard.canActivate(context);
    expect(result).toBe(true);
  });

  it('should ALLOW access if legacy permissions string includes module:manage or module:action', async () => {
    reflector.getAllAndOverride.mockImplementation((key: string) => {
      if (key === REQUIRE_PERMISSION_KEY) return { module: 'projects', action: 'read' };
      return undefined;
    });
    userGroupsService.getUserPermissions.mockResolvedValue({
      groups: ['CustomGroup'],
      permissions: ['projects:read'],
      modulePermissions: {},
      operationPermissions: {},
      fieldPermissions: {},
    });

    const context = createMockContext({ id: 'user1' });

    const result = await guard.canActivate(context);
    expect(result).toBe(true);
  });

  it('should grant FULL ACCESS only if user belongs to Administrators group, even on unannotated endpoints', async () => {
    reflector.getAllAndOverride.mockReturnValue(undefined); // No requirement set
    userGroupsService.getUserPermissions.mockResolvedValue({
      groups: ['Administrators'],
      permissions: [],
      modulePermissions: {},
      operationPermissions: {},
      fieldPermissions: {},
    });

    const context = createMockContext({ id: 'admin1' });

    const result = await guard.canActivate(context);
    expect(result).toBe(true);
  });

  it('should DENY access if endpoint requires @RequireSystemAdmin() and user is not an admin', async () => {
    reflector.getAllAndOverride.mockImplementation((key: string) => {
      if (key === REQUIRE_SYSTEM_ADMIN_KEY) return true;
      if (key === REQUIRE_PERMISSION_KEY) return { module: 'user-groups', action: 'create' };
      return undefined;
    });
    userGroupsService.getUserPermissions.mockResolvedValue({
      groups: ['Employee'],
      permissions: [],
      modulePermissions: { 'user-groups': { create: true, read: true, update: true, delete: true } },
      operationPermissions: {},
      fieldPermissions: {},
    });

    const context = createMockContext({ id: 'user1', is_system_admin: false });

    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
  });

  it('should ALLOW access if endpoint requires @RequireSystemAdmin() and user is in Administrators group', async () => {
    reflector.getAllAndOverride.mockImplementation((key: string) => {
      if (key === REQUIRE_SYSTEM_ADMIN_KEY) return true;
      return undefined;
    });
    userGroupsService.getUserPermissions.mockResolvedValue({
      groups: ['Administrators'],
      permissions: [],
      modulePermissions: {},
      operationPermissions: {},
      fieldPermissions: {},
    });

    const context = createMockContext({ id: 'admin1' });

    const result = await guard.canActivate(context);
    expect(result).toBe(true);
  });

  it('should ALLOW access if endpoint requires @RequireSystemAdmin() and user.is_system_admin is true', async () => {
    reflector.getAllAndOverride.mockImplementation((key: string) => {
      if (key === REQUIRE_SYSTEM_ADMIN_KEY) return true;
      return undefined;
    });
    userGroupsService.getUserPermissions.mockResolvedValue({
      groups: ['Employee'],
      permissions: [],
      modulePermissions: {},
      operationPermissions: {},
      fieldPermissions: {},
    });

    const context = createMockContext({ id: 'admin1', is_system_admin: true });

    const result = await guard.canActivate(context);
    expect(result).toBe(true);
  });

  it('should ALLOW read access to users module if user has legacy settings:read permission (backward compatibility)', async () => {
    reflector.getAllAndOverride.mockImplementation((key: string) => {
      if (key === REQUIRE_PERMISSION_KEY) return { module: 'users', action: 'read' };
      return undefined;
    });
    userGroupsService.getUserPermissions.mockResolvedValue({
      groups: ['CustomRole'],
      permissions: ['settings:read'],
      modulePermissions: {},
      operationPermissions: {},
      fieldPermissions: {},
    });

    const context = createMockContext({ id: 'user1' });

    const result = await guard.canActivate(context);
    expect(result).toBe(true);
  });

  describe('Field-level Permissions Enforcement', () => {
    it('should DENY create if req.body contains a field with write: false', async () => {
      reflector.getAllAndOverride.mockImplementation((key: string) => {
        if (key === REQUIRE_PERMISSION_KEY) return { module: 'tasks', action: 'create', model: 'tasks' };
        return undefined;
      });
      userGroupsService.getUserPermissions.mockResolvedValue({
        groups: ['CustomRole'],
        permissions: ['tasks:create'],
        modulePermissions: { tasks: { create: true, read: true, update: true, delete: false } },
        operationPermissions: {},
        fieldPermissions: {
          tasks: {
            estimatedHours: { read: true, write: false, update: true, delete: true },
          },
        },
      });

      const context = createMockContext({ id: 'user1' }, { title: 'New Task', estimatedHours: 10 });

      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    });

    it('should DENY update if field has update: false', async () => {
      reflector.getAllAndOverride.mockImplementation((key: string) => {
        if (key === REQUIRE_PERMISSION_KEY) return { module: 'tasks', action: 'update', model: 'tasks' };
        return undefined;
      });
      userGroupsService.getUserPermissions.mockResolvedValue({
        groups: ['CustomRole'],
        permissions: ['tasks:update'],
        modulePermissions: { tasks: { create: true, read: true, update: true, delete: false } },
        operationPermissions: {},
        fieldPermissions: {
          tasks: {
            title: { read: true, write: true, update: false, delete: true },
          },
        },
      });

      const context = createMockContext({ id: 'user1' }, { title: 'Updated Title' });

      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    });

    it('should DENY update that clears/deletes a field (null or empty string) when delete: false', async () => {
      reflector.getAllAndOverride.mockImplementation((key: string) => {
        if (key === REQUIRE_PERMISSION_KEY) return { module: 'employees', action: 'update', model: 'employees' };
        return undefined;
      });
      userGroupsService.getUserPermissions.mockResolvedValue({
        groups: ['HR_Assistant'],
        permissions: ['employees:update'],
        modulePermissions: { employees: { create: true, read: true, update: true, delete: false } },
        operationPermissions: { 'employees.compensation': { read: true, write: true, update: true, delete: true } },
        fieldPermissions: {
          employees: {
            baseSalary: { read: true, write: true, update: true, delete: false },
          },
        },
      });

      // Attempting to clear/delete baseSalary by setting to null
      const contextNull = createMockContext({ id: 'user1' }, { baseSalary: null });
      await expect(guard.canActivate(contextNull)).rejects.toThrow(
        /Access Denied: You do not have permission to delete field 'baseSalary' in employees/,
      );

      // Attempting to clear/delete baseSalary by setting to empty string
      const contextEmpty = createMockContext({ id: 'user1' }, { baseSalary: '' });
      await expect(guard.canActivate(contextEmpty)).rejects.toThrow(
        /Access Denied: You do not have permission to delete field 'baseSalary' in employees/,
      );
    });

    it('should ALLOW update with a new valid value when update: true and delete: false', async () => {
      reflector.getAllAndOverride.mockImplementation((key: string) => {
        if (key === REQUIRE_PERMISSION_KEY) return { module: 'employees', action: 'update', model: 'employees' };
        return undefined;
      });
      userGroupsService.getUserPermissions.mockResolvedValue({
        groups: ['HR_Assistant'],
        permissions: ['employees:update'],
        modulePermissions: { employees: { create: true, read: true, update: true, delete: false } },
        operationPermissions: { 'employees.compensation': { read: true, write: true, update: true, delete: true } },
        fieldPermissions: {
          employees: {
            baseSalary: { read: true, write: true, update: true, delete: false },
          },
        },
      });

      const context = createMockContext({ id: 'user1' }, { baseSalary: 75000 });
      const result = await guard.canActivate(context);
      expect(result).toBe(true);
    });

    it('should DENY action: delete when target field has delete: false', async () => {
      reflector.getAllAndOverride.mockImplementation((key: string) => {
        if (key === REQUIRE_PERMISSION_KEY) {
          return { module: 'tasks', action: 'delete', model: 'tasks', field: 'comments' };
        }
        return undefined;
      });
      userGroupsService.getUserPermissions.mockResolvedValue({
        groups: ['Employee'],
        permissions: ['tasks:delete'],
        modulePermissions: { tasks: { create: true, read: true, update: true, delete: true } },
        operationPermissions: {},
        fieldPermissions: {
          tasks: {
            comments: { read: true, write: true, update: true, delete: false },
          },
        },
      });

      const context = createMockContext({ id: 'user1' });
      await expect(guard.canActivate(context)).rejects.toThrow(
        /Access Denied: You do not have permission to delete field 'comments' in tasks/,
      );
    });

    it('should DENY employee compensation field creation/update if employees.compensation operation is denied', async () => {
      reflector.getAllAndOverride.mockImplementation((key: string) => {
        if (key === REQUIRE_PERMISSION_KEY) return { module: 'employees', action: 'update', model: 'employees' };
        return undefined;
      });
      userGroupsService.getUserPermissions.mockResolvedValue({
        groups: ['Employee'],
        permissions: ['employees:update'],
        modulePermissions: { employees: { create: true, read: true, update: true, delete: false } },
        operationPermissions: {
          'employees.compensation': { read: false, write: false, update: false, delete: false },
        },
        fieldPermissions: {},
      });

      const context = createMockContext({ id: 'user1' }, { baseSalary: 100000 });
      await expect(guard.canActivate(context)).rejects.toThrow(
        /Access Denied: You do not have permission to update employee compensation field 'baseSalary'/,
      );
    });

    it('should cache userPerms, isSystemAdmin, and permissionRequirement on req object', async () => {
      reflector.getAllAndOverride.mockImplementation((key: string) => {
        if (key === REQUIRE_PERMISSION_KEY) return { module: 'tasks', action: 'read', model: 'tasks' };
        return undefined;
      });
      userGroupsService.getUserPermissions.mockResolvedValue({
        groups: ['Employee'],
        permissions: ['tasks:read'],
        modulePermissions: { tasks: { create: true, read: true, update: true, delete: false } },
        operationPermissions: {},
        fieldPermissions: {},
      });

      const reqObject: any = { user: { id: 'user1' } };
      const context = {
        getHandler: jest.fn(),
        getClass: jest.fn(),
        switchToHttp: () => ({
          getRequest: () => reqObject,
        }),
      } as any;

      await guard.canActivate(context);

      expect(reqObject.userPerms).toBeDefined();
      expect(reqObject.isSystemAdmin).toBe(false);
      expect(reqObject.permissionRequirement).toEqual({ module: 'tasks', action: 'read', model: 'tasks' });
    });
  });
});
