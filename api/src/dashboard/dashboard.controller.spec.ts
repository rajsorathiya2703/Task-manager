import { Reflector } from '@nestjs/core';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { ACCESS_REQUIREMENT_KEY } from '../access/decorators/require-access.decorator';
import { AccessGuard } from '../access/access.guard';
import { PolicyCompilerService } from '../access/policy-compiler.service';
import { PolicyEngineService } from '../access/policy-engine.service';

describe('DashboardController (P1-19 — Dashboard Module Gate)', () => {
  let controller: DashboardController;
  let dashboardService: jest.Mocked<DashboardService>;
  const reflector = new Reflector();

  beforeEach(async () => {
    dashboardService = {
      getEmployeeActivity: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [DashboardController],
      providers: [
        { provide: DashboardService, useValue: dashboardService },
      ],
    }).compile();

    controller = module.get<DashboardController>(DashboardController);
  });

  describe('Route @RequireAccess metadata', () => {
    it('decorates getEmployeeActivity with { module: "dashboard", action: "read" }', () => {
      const meta = reflector.get(ACCESS_REQUIREMENT_KEY, controller.getEmployeeActivity);
      expect(meta).toEqual({ module: 'dashboard', action: 'read' });
    });
  });

  describe('Parameter and Scope Forwarding', () => {
    it('forwards query, userId, email, isSystemAdmin, and scope from req.access.dashboard', async () => {
      const mockResult = { selectedEmployee: { name: 'Alice' } } as any;
      dashboardService.getEmployeeActivity.mockResolvedValue(mockResult);

      const req = {
        user: { id: 'user-alice-123', email: 'alice@example.com', is_system_admin: false },
        access: {
          dashboard: {
            granted: true,
            scope: 'own',
          },
        },
      };
      const query = { range: 'weekly' } as any;

      const result = await controller.getEmployeeActivity(req, query);

      expect(result).toBe(mockResult);
      expect(dashboardService.getEmployeeActivity).toHaveBeenCalledWith(
        query,
        'user-alice-123',
        'alice@example.com',
        false,
        'own',
      );
    });

    it('forwards team scope when req.access.dashboard has scope: team', async () => {
      dashboardService.getEmployeeActivity.mockResolvedValue({} as any);

      const req = {
        user: { id: 'lead-1', email: 'lead@example.com', is_system_admin: false },
        access: {
          dashboard: {
            granted: true,
            scope: 'team',
          },
        },
      };
      const query = { range: 'monthly', employeeId: 'emp-bob' } as any;

      await controller.getEmployeeActivity(req, query);

      expect(dashboardService.getEmployeeActivity).toHaveBeenCalledWith(
        query,
        'lead-1',
        'lead@example.com',
        false,
        'team',
      );
    });

    it('forwards isSystemAdmin true and scope all for system admin', async () => {
      dashboardService.getEmployeeActivity.mockResolvedValue({} as any);

      const req = {
        user: { id: 'admin-1', email: 'admin@example.com', is_system_admin: true },
        access: {
          dashboard: {
            granted: true,
            scope: 'all',
          },
        },
      };
      const query = { range: 'weekly' } as any;

      await controller.getEmployeeActivity(req, query);

      expect(dashboardService.getEmployeeActivity).toHaveBeenCalledWith(
        query,
        'admin-1',
        'admin@example.com',
        true,
        'all',
      );
    });
  });

  describe('AccessGuard Integration with DashboardController', () => {
    let accessGuard: AccessGuard;
    let policyEngineService: jest.Mocked<PolicyEngineService>;
    let policyCompilerService: jest.Mocked<PolicyCompilerService>;

    beforeEach(async () => {
      policyEngineService = {
        can: jest.fn(),
        filterScope: jest.fn(),
      } as any;

      policyCompilerService = {
        getCompiledPolicy: jest.fn().mockResolvedValue({
          version: '1.0',
          compiledAt: new Date().toISOString(),
          roles: {},
          users: {},
          defaultRole: 'employee',
        }),
        getLatestPolicyDocument: jest.fn().mockResolvedValue({
          version: '1.0',
          compiledAt: new Date().toISOString(),
          roles: {},
          users: {},
          defaultRole: 'employee',
        }),
      } as any;

      const roleModel = {
        find: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            lean: jest.fn().mockReturnValue({
              exec: jest.fn().mockResolvedValue([]),
            }),
          }),
        }),
      } as any;

      accessGuard = new AccessGuard(
        reflector,
        policyCompilerService,
        policyEngineService,
        roleModel,
      );
    });

    function createMockContext(user: any, handler: any): ExecutionContext {
      const req: any = { user, headers: {} };
      return {
        switchToHttp: () => ({
          getRequest: () => req,
        }),
        getHandler: () => handler,
        getClass: () => DashboardController,
      } as unknown as ExecutionContext;
    }

    it('DENIES access when role has dashboard.read=false with 403', async () => {
      policyEngineService.can.mockReturnValue({
        allow: false,
        reason: 'No role granted read on dashboard',
        scope: 'none',
      } as any);

      const context = createMockContext(
        { id: 'user-restricted', is_system_admin: false },
        controller.getEmployeeActivity,
      );

      await expect(accessGuard.canActivate(context)).rejects.toThrow(ForbiddenException);
      expect(policyEngineService.can).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'user-restricted' }),
        'read',
        'dashboard',
        undefined,
        expect.any(Object),
      );
    });

    it('ALLOWS access when user has dashboard.read=true (scope: own)', async () => {
      policyEngineService.can.mockReturnValue({
        allow: true,
        scope: 'own',
      } as any);

      const context = createMockContext(
        { id: 'user-employee', is_system_admin: false },
        controller.getEmployeeActivity,
      );

      const canActivate = await accessGuard.canActivate(context);
      expect(canActivate).toBe(true);
      expect(policyEngineService.can).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'user-employee' }),
        'read',
        'dashboard',
        undefined,
        expect.any(Object),
      );
    });

    it('ALLOWS System Admin to access dashboard', async () => {
      policyEngineService.can.mockReturnValue({
        allow: true,
        scope: 'all',
      } as any);

      const context = createMockContext(
        { id: 'super-admin', is_system_admin: true },
        controller.getEmployeeActivity,
      );

      const canActivate = await accessGuard.canActivate(context);
      expect(canActivate).toBe(true);
      expect(policyEngineService.can).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'super-admin', isSystemAdmin: true }),
        'read',
        'dashboard',
        undefined,
        expect.any(Object),
      );
    });
  });
});
