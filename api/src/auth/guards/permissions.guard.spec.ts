import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionsGuard } from './permissions.guard';
import { UserGroupsService } from '../../user-groups/user-groups.service';
import { REQUIRE_PERMISSION_KEY } from '../decorators/permissions.decorator';

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

  it('should allow access if no permission requirement is configured on the endpoint', async () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);
    const context = createMockContext({ id: 'user1' });

    const result = await guard.canActivate(context);
    expect(result).toBe(true);
  });

  it('should DENY access if user has no groups (Fixing fail-open bug)', async () => {
    reflector.getAllAndOverride.mockReturnValue({ module: 'tasks', action: 'read' });
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
    reflector.getAllAndOverride.mockReturnValue({ module: 'tasks', action: 'read' });
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
    reflector.getAllAndOverride.mockReturnValue({ module: 'settings', action: 'read' });
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
    reflector.getAllAndOverride.mockReturnValue({ module: 'tasks', action: 'delete' });
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

  it('should ALLOW access if user group explicitly grants the module action', async () => {
    reflector.getAllAndOverride.mockReturnValue({ module: 'tasks', action: 'read' });
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
    reflector.getAllAndOverride.mockReturnValue({ module: 'projects', action: 'read' });
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

  it('should grant FULL ACCESS only if user belongs to Administrators group', async () => {
    reflector.getAllAndOverride.mockReturnValue({ module: 'settings', action: 'delete' });
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
