import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AccessGuard } from './access.guard';
import { IS_PUBLIC_KEY } from '../auth/decorators/public.decorator';
import { ACCESS_REQUIREMENT_KEY } from './decorators/require-access.decorator';
import { PolicyCompilerService } from './policy-compiler.service';
import { PolicyEngineService } from './policy-engine.service';
import { Decision } from './policy.engine';

describe('AccessGuard', () => {
  let guard: AccessGuard;
  let reflector: jest.Mocked<Reflector>;
  let policyCompilerService: jest.Mocked<PolicyCompilerService>;
  let policyEngineService: jest.Mocked<PolicyEngineService>;
  let roleModel: any;

  beforeEach(() => {
    reflector = {
      getAllAndOverride: jest.fn(),
    } as any;

    policyCompilerService = {
      getLatestPolicyDocument: jest.fn(),
    } as any;

    policyEngineService = {
      can: jest.fn(),
    } as any;

    roleModel = {
      find: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue([]),
          }),
        }),
      }),
    };

    guard = new AccessGuard(
      reflector,
      policyCompilerService,
      policyEngineService,
      roleModel,
    );
  });

  function createMockExecutionContext(request: any): ExecutionContext {
    return {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as any;
  }

  it('allows access if route is marked @Public()', async () => {
    reflector.getAllAndOverride.mockImplementation((key: string) => {
      if (key === IS_PUBLIC_KEY) return true;
      return undefined;
    });

    const context = createMockExecutionContext({});
    const result = await guard.canActivate(context);

    expect(result).toBe(true);
    expect(policyEngineService.can).not.toHaveBeenCalled();
  });

  it('allows access if route has no @RequireAccess decorator (incremental rollout)', async () => {
    reflector.getAllAndOverride.mockImplementation((key: string) => {
      if (key === IS_PUBLIC_KEY) return false;
      if (key === ACCESS_REQUIREMENT_KEY) return undefined;
      return undefined;
    });

    const context = createMockExecutionContext({});
    const result = await guard.canActivate(context);

    expect(result).toBe(true);
    expect(policyEngineService.can).not.toHaveBeenCalled();
  });

  it('throws ForbiddenException if @RequireAccess is present but req.user is missing', async () => {
    reflector.getAllAndOverride.mockImplementation((key: string) => {
      if (key === IS_PUBLIC_KEY) return false;
      if (key === ACCESS_REQUIREMENT_KEY)
        return { module: 'tasks', action: 'read' };
      return undefined;
    });

    const context = createMockExecutionContext({ user: null });

    await expect(guard.canActivate(context)).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('throws ForbiddenException if no compiled policy document exists in the system', async () => {
    reflector.getAllAndOverride.mockImplementation((key: string) => {
      if (key === IS_PUBLIC_KEY) return false;
      if (key === ACCESS_REQUIREMENT_KEY)
        return { module: 'tasks', action: 'read' };
      return undefined;
    });

    policyCompilerService.getLatestPolicyDocument.mockResolvedValue(null);

    const context = createMockExecutionContext({
      user: { _id: 'user-1', email: 'test@example.com' },
    });

    await expect(guard.canActivate(context)).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('throws ForbiddenException when PolicyEngine denies access', async () => {
    reflector.getAllAndOverride.mockImplementation((key: string) => {
      if (key === IS_PUBLIC_KEY) return false;
      if (key === ACCESS_REQUIREMENT_KEY)
        return { module: 'tasks', action: 'read' };
      return undefined;
    });

    policyCompilerService.getLatestPolicyDocument.mockResolvedValue({
      version: 1,
      roles: [],
      toObject: () => ({ version: 1, roles: [] }),
    } as any);

    const deniedDecision: Decision = {
      allow: false,
      reason: 'No role granted read on tasks',
      scope: 'none',
      readableFields: [],
      updatableFields: [],
      hiddenFields: [],
    };
    policyEngineService.can.mockReturnValue(deniedDecision);

    const context = createMockExecutionContext({
      user: { _id: 'user-no-roles', email: 'test@example.com' },
    });

    await expect(guard.canActivate(context)).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('allows access and attaches accessDecision when PolicyEngine grants access', async () => {
    reflector.getAllAndOverride.mockImplementation((key: string) => {
      if (key === IS_PUBLIC_KEY) return false;
      if (key === ACCESS_REQUIREMENT_KEY)
        return { module: 'tasks', action: 'read' };
      return undefined;
    });

    policyCompilerService.getLatestPolicyDocument.mockResolvedValue({
      version: 1,
      roles: [],
      toObject: () => ({ version: 1, roles: [] }),
    } as any);

    const allowedDecision: Decision = {
      allow: true,
      scope: 'all',
      readableFields: ['title', 'status'],
      updatableFields: ['status'],
      hiddenFields: [],
    };
    policyEngineService.can.mockReturnValue(allowedDecision);

    const request = {
      user: {
        _id: 'user-admin',
        email: 'admin@example.com',
        is_system_admin: true,
      },
    };
    const context = createMockExecutionContext(request);

    const result = await guard.canActivate(context);

    expect(result).toBe(true);
    expect((request as any).accessDecision).toEqual(allowedDecision);
    expect(policyEngineService.can).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-admin',
        email: 'admin@example.com',
        isSystemAdmin: true,
      }),
      'read',
      'tasks',
      undefined,
      expect.anything(),
    );
  });
});
