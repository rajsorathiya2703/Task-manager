import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionsGuard } from './permissions.guard';
import { UserGroupsService } from '../../user-groups/user-groups.service';
import { REQUIRE_PERMISSION_KEY } from '../decorators/permissions.decorator';
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

  const createMockContext = (user: any): ExecutionContext => {
    return {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({
        getRequest: () => ({ user }),
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
});
