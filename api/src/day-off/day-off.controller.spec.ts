import { Reflector } from '@nestjs/core';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { DayOffController } from './day-off.controller';
import { DayOffService } from './day-off.service';
import { ACCESS_REQUIREMENT_KEY } from '../access/decorators/require-access.decorator';
import { IS_PUBLIC_KEY } from '../auth/decorators/public.decorator';
import { AccessGuard } from '../access/access.guard';
import { PolicyCompilerService } from '../access/policy-compiler.service';
import { PolicyEngineService } from '../access/policy-engine.service';

describe('DayOffController (P1-17 — Day-Off Controller Module Gates)', () => {
  let controller: DayOffController;
  let dayOffService: jest.Mocked<DayOffService>;
  const reflector = new Reflector();

  beforeEach(async () => {
    dayOffService = {
      getSettings: jest.fn(),
      updateSettings: jest.fn(),
      getLeaveTypes: jest.fn(),
      getLeaveTypeById: jest.fn(),
      createLeaveType: jest.fn(),
      updateLeaveType: jest.fn(),
      deleteLeaveType: jest.fn(),
      getMyApplications: jest.fn(),
      getAllApplications: jest.fn(),
      getEmployeeBalances: jest.fn(),
      applyLeave: jest.fn(),
      cancelApplication: jest.fn(),
      updateApplicationStatus: jest.fn(),
      approveByToken: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [DayOffController],
      providers: [
        { provide: DayOffService, useValue: dayOffService },
      ],
    }).compile();

    controller = module.get<DayOffController>(DayOffController);
  });

  describe('Route @RequireAccess metadata', () => {
    it('decorates getSettings with { module: "dayoff.policies", action: "read" }', () => {
      const meta = reflector.get(ACCESS_REQUIREMENT_KEY, controller.getSettings);
      expect(meta).toEqual({ module: 'dayoff.policies', action: 'read' });
    });

    it('decorates updateSettings with { module: "dayoff.policies", action: "update" }', () => {
      const meta = reflector.get(ACCESS_REQUIREMENT_KEY, controller.updateSettings);
      expect(meta).toEqual({ module: 'dayoff.policies', action: 'update' });
    });

    it('decorates getLeaveTypes with { module: "dayoff.policies", action: "read" }', () => {
      const meta = reflector.get(ACCESS_REQUIREMENT_KEY, controller.getLeaveTypes);
      expect(meta).toEqual({ module: 'dayoff.policies', action: 'read' });
    });

    it('decorates getLeaveTypeById with { module: "dayoff.policies", action: "read" }', () => {
      const meta = reflector.get(ACCESS_REQUIREMENT_KEY, controller.getLeaveTypeById);
      expect(meta).toEqual({ module: 'dayoff.policies', action: 'read' });
    });

    it('decorates createLeaveType with { module: "dayoff.policies", action: "create" }', () => {
      const meta = reflector.get(ACCESS_REQUIREMENT_KEY, controller.createLeaveType);
      expect(meta).toEqual({ module: 'dayoff.policies', action: 'create' });
    });

    it('decorates updateLeaveType with { module: "dayoff.policies", action: "update" }', () => {
      const meta = reflector.get(ACCESS_REQUIREMENT_KEY, controller.updateLeaveType);
      expect(meta).toEqual({ module: 'dayoff.policies', action: 'update' });
    });

    it('decorates deleteLeaveType with { module: "dayoff.policies", action: "delete" }', () => {
      const meta = reflector.get(ACCESS_REQUIREMENT_KEY, controller.deleteLeaveType);
      expect(meta).toEqual({ module: 'dayoff.policies', action: 'delete' });
    });

    it('decorates getMyBalances with { module: "dayoff", action: "read" }', () => {
      const meta = reflector.get(ACCESS_REQUIREMENT_KEY, controller.getMyBalances);
      expect(meta).toEqual({ module: 'dayoff', action: 'read' });
    });

    it('decorates getEmployeeBalances with { module: "dayoff", action: "read" }', () => {
      const meta = reflector.get(ACCESS_REQUIREMENT_KEY, controller.getEmployeeBalances);
      expect(meta).toEqual({ module: 'dayoff', action: 'read' });
    });

    it('decorates applyLeave with { module: "dayoff", action: "create" }', () => {
      const meta = reflector.get(ACCESS_REQUIREMENT_KEY, controller.applyLeave);
      expect(meta).toEqual({ module: 'dayoff', action: 'create' });
    });

    it('decorates getMyApplications with { module: "dayoff", action: "read" }', () => {
      const meta = reflector.get(ACCESS_REQUIREMENT_KEY, controller.getMyApplications);
      expect(meta).toEqual({ module: 'dayoff', action: 'read' });
    });

    it('decorates getAllApplications with { module: "dayoff.approvals", action: "read" }', () => {
      const meta = reflector.get(ACCESS_REQUIREMENT_KEY, controller.getAllApplications);
      expect(meta).toEqual({ module: 'dayoff.approvals', action: 'read' });
    });

    it('decorates cancelApplication with { module: "dayoff", action: "cancel" }', () => {
      const meta = reflector.get(ACCESS_REQUIREMENT_KEY, controller.cancelApplication);
      expect(meta).toEqual({ module: 'dayoff', action: 'cancel' });
    });

    it('decorates updateApplicationStatus with { module: "dayoff.approvals", action: "approve" }', () => {
      const meta = reflector.get(ACCESS_REQUIREMENT_KEY, controller.updateApplicationStatus);
      expect(meta).toEqual({ module: 'dayoff.approvals', action: 'approve' });
    });

    it('keeps approveByToken marked with @Public() and without @RequireAccess', () => {
      const isPublic = reflector.get(IS_PUBLIC_KEY, controller.approveByToken);
      const requirement = reflector.get(ACCESS_REQUIREMENT_KEY, controller.approveByToken);
      expect(isPublic).toBe(true);
      expect(requirement).toBeUndefined();
    });
  });

  describe('Module Gate Enforcement (AccessGuard)', () => {
    let accessGuard: AccessGuard;
    let policyCompilerService: jest.Mocked<PolicyCompilerService>;
    let policyEngineService: jest.Mocked<PolicyEngineService>;
    let roleModel: any;

    const mockCompiledPolicy: any = {
      version: 1,
      compiledAt: new Date(),
      hash: 'test-hash',
      roles: [],
      moduleCatalog: [],
      fieldCatalog: [],
    };

    beforeEach(() => {
      policyCompilerService = {
        getLatestPolicyDocument: jest.fn().mockResolvedValue(mockCompiledPolicy),
      } as any;

      policyEngineService = {
        can: jest.fn(),
      } as any;

      roleModel = {
        find: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            lean: jest.fn().mockReturnValue({
              exec: jest.fn().mockResolvedValue([{ _id: 'role-1' }]),
            }),
          }),
        }),
      };

      accessGuard = new AccessGuard(
        reflector,
        policyCompilerService,
        policyEngineService,
        roleModel,
      );
    });

    function createMockContext(user: any, handler: any): ExecutionContext {
      const request = { user, accessDecision: null, access: {} };
      return {
        getHandler: () => handler,
        getClass: () => DayOffController,
        switchToHttp: () => ({
          getRequest: () => request,
        }),
      } as any;
    }

    it('ALLOWS public approveByToken endpoint without authentication', async () => {
      const context = createMockContext(null, controller.approveByToken);
      const canActivate = await accessGuard.canActivate(context);
      expect(canActivate).toBe(true);
      expect(policyEngineService.can).not.toHaveBeenCalled();
    });

    it('DENIES Employee role calling GET /day-off/applications (all) with 403 (dayoff.approvals:read)', async () => {
      // Employee role has no read grant on dayoff.approvals
      policyEngineService.can.mockReturnValue({
        allow: false,
        reason: 'No role granted read on dayoff.approvals',
        scope: 'none',
      } as any);

      const context = createMockContext(
        { id: 'user-employee', is_system_admin: false },
        controller.getAllApplications,
      );

      await expect(accessGuard.canActivate(context)).rejects.toThrow(ForbiddenException);
      expect(policyEngineService.can).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'user-employee' }),
        'read',
        'dayoff.approvals',
        undefined,
        expect.any(Object),
      );
    });

    it('ALLOWS Employee role calling GET /day-off/applications/my (dayoff:read)', async () => {
      // Employee role has read grant on dayoff (scope own)
      policyEngineService.can.mockReturnValue({
        allow: true,
        scope: 'own',
      } as any);

      const context = createMockContext(
        { id: 'user-employee', is_system_admin: false },
        controller.getMyApplications,
      );

      const canActivate = await accessGuard.canActivate(context);
      expect(canActivate).toBe(true);
      expect(policyEngineService.can).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'user-employee' }),
        'read',
        'dayoff',
        undefined,
        expect.any(Object),
      );
    });

    it('DENIES Employee role calling PATCH /day-off/applications/:id/status with 403', async () => {
      policyEngineService.can.mockReturnValue({
        allow: false,
        reason: 'No role granted approve on dayoff.approvals',
        scope: 'none',
      } as any);

      const context = createMockContext(
        { id: 'user-employee', is_system_admin: false },
        controller.updateApplicationStatus,
      );

      await expect(accessGuard.canActivate(context)).rejects.toThrow(ForbiddenException);
      expect(policyEngineService.can).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'user-employee' }),
        'approve',
        'dayoff.approvals',
        undefined,
        expect.any(Object),
      );
    });

    it('ALLOWS Manager role calling GET /day-off/applications (dayoff.approvals:read)', async () => {
      policyEngineService.can.mockReturnValue({
        allow: true,
        scope: 'team',
      } as any);

      const context = createMockContext(
        { id: 'user-manager', is_system_admin: false },
        controller.getAllApplications,
      );

      const canActivate = await accessGuard.canActivate(context);
      expect(canActivate).toBe(true);
      expect(policyEngineService.can).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'user-manager' }),
        'read',
        'dayoff.approvals',
        undefined,
        expect.any(Object),
      );
    });

    it('ALLOWS Manager role calling PATCH /day-off/applications/:id/status (dayoff.approvals:approve)', async () => {
      policyEngineService.can.mockReturnValue({
        allow: true,
        scope: 'team',
      } as any);

      const context = createMockContext(
        { id: 'user-manager', is_system_admin: false },
        controller.updateApplicationStatus,
      );

      const canActivate = await accessGuard.canActivate(context);
      expect(canActivate).toBe(true);
      expect(policyEngineService.can).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'user-manager' }),
        'approve',
        'dayoff.approvals',
        undefined,
        expect.any(Object),
      );
    });

    it('ALLOWS System Admin to access all routes', async () => {
      policyEngineService.can.mockReturnValue({
        allow: true,
        scope: 'all',
      } as any);

      const context = createMockContext(
        { id: 'super-admin', is_system_admin: true },
        controller.updateSettings,
      );

      const canActivate = await accessGuard.canActivate(context);
      expect(canActivate).toBe(true);
      expect(policyEngineService.can).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'super-admin', isSystemAdmin: true }),
        'update',
        'dayoff.policies',
        undefined,
        expect.any(Object),
      );
    });
  });

  describe('Controller delegation to DayOffService', () => {
    const mockUser = { id: 'user-1', email: 'user@example.com' };
    const mockReq = { user: mockUser };

    it('delegates getSettings to dayOffService.getSettings', async () => {
      dayOffService.getSettings.mockResolvedValue({ defaultAllocation: 20 } as any);
      const result = await controller.getSettings();
      expect(dayOffService.getSettings).toHaveBeenCalled();
      expect(result).toEqual({ defaultAllocation: 20 });
    });

    it('delegates updateSettings to dayOffService.updateSettings', async () => {
      const dto = { defaultAllocation: 25 };
      dayOffService.updateSettings.mockResolvedValue(dto as any);
      const result = await controller.updateSettings(dto);
      expect(dayOffService.updateSettings).toHaveBeenCalledWith(dto);
      expect(result).toEqual(dto);
    });

    it('delegates getLeaveTypes to dayOffService.getLeaveTypes', async () => {
      dayOffService.getLeaveTypes.mockResolvedValue(['vacation'] as any);
      const result = await controller.getLeaveTypes('true');
      expect(dayOffService.getLeaveTypes).toHaveBeenCalledWith({ activeOnly: true });
      expect(result).toEqual(['vacation']);
    });

    it('delegates getLeaveTypeById to dayOffService.getLeaveTypeById', async () => {
      dayOffService.getLeaveTypeById.mockResolvedValue({ id: 'lt-1' } as any);
      const result = await controller.getLeaveTypeById('lt-1');
      expect(dayOffService.getLeaveTypeById).toHaveBeenCalledWith('lt-1');
      expect(result).toEqual({ id: 'lt-1' });
    });

    it('delegates createLeaveType to dayOffService.createLeaveType', async () => {
      const dto = { name: 'Sick' };
      dayOffService.createLeaveType.mockResolvedValue(dto as any);
      const result = await controller.createLeaveType(dto);
      expect(dayOffService.createLeaveType).toHaveBeenCalledWith(dto);
      expect(result).toEqual(dto);
    });

    it('delegates updateLeaveType to dayOffService.updateLeaveType', async () => {
      const dto = { name: 'Sick Paid' };
      dayOffService.updateLeaveType.mockResolvedValue(dto as any);
      const result = await controller.updateLeaveType('lt-1', dto);
      expect(dayOffService.updateLeaveType).toHaveBeenCalledWith('lt-1', dto);
      expect(result).toEqual(dto);
    });

    it('delegates deleteLeaveType to dayOffService.deleteLeaveType', async () => {
      dayOffService.deleteLeaveType.mockResolvedValue({ deleted: true } as any);
      const result = await controller.deleteLeaveType('lt-1');
      expect(dayOffService.deleteLeaveType).toHaveBeenCalledWith('lt-1');
      expect(result).toEqual({ deleted: true });
    });

    it('delegates getMyBalances to dayOffService.getMyBalances / getEmployeeBalances', async () => {
      dayOffService.getMyApplications.mockResolvedValue([]);
      dayOffService.getEmployeeBalances.mockResolvedValue({ balance: 10 } as any);
      const result = await controller.getMyBalances(mockReq as any, '2026');
      expect(dayOffService.getEmployeeBalances).toHaveBeenCalledWith('user-1', 2026);
      expect(result).toEqual({ balance: 10 });
    });

    it('delegates getEmployeeBalances to dayOffService.getEmployeeBalances', async () => {
      dayOffService.getEmployeeBalances.mockResolvedValue({ balance: 12 } as any);
      const result = await controller.getEmployeeBalances('emp-2', '2026');
      expect(dayOffService.getEmployeeBalances).toHaveBeenCalledWith('emp-2', 2026);
      expect(result).toEqual({ balance: 12 });
    });

    it('delegates applyLeave to dayOffService.applyLeave', async () => {
      const body = { leaveTypeId: 'lt-1', daysCount: 2 };
      dayOffService.applyLeave.mockResolvedValue({ id: 'app-1' } as any);
      const result = await controller.applyLeave(mockReq as any, body);
      expect(dayOffService.applyLeave).toHaveBeenCalledWith(mockUser, body);
      expect(result).toEqual({ id: 'app-1' });
    });

    it('delegates getMyApplications to dayOffService.getMyApplications', async () => {
      dayOffService.getMyApplications.mockResolvedValue(['my-app'] as any);
      const result = await controller.getMyApplications(mockReq as any, '2026');
      expect(dayOffService.getMyApplications).toHaveBeenCalledWith(mockUser, 2026);
      expect(result).toEqual(['my-app']);
    });

    it('delegates getAllApplications to dayOffService.getAllApplications with scope and admin flag', async () => {
      dayOffService.getAllApplications.mockResolvedValue(['app1', 'app2'] as any);
      const reqWithAccess = {
        ...mockReq,
        user: { ...mockUser, is_system_admin: false },
        access: { 'dayoff.approvals': { scope: 'team' } },
      };
      const result = await controller.getAllApplications(reqWithAccess as any, 'pending', '2026');
      expect(dayOffService.getAllApplications).toHaveBeenCalledWith(
        { status: 'pending', year: 2026 },
        reqWithAccess.user,
        'team',
        false,
      );
      expect(result).toEqual(['app1', 'app2']);
    });

    it('delegates cancelApplication to dayOffService.cancelApplication', async () => {
      dayOffService.cancelApplication.mockResolvedValue({ status: 'cancelled' } as any);
      const result = await controller.cancelApplication('app-1', mockReq as any);
      expect(dayOffService.cancelApplication).toHaveBeenCalledWith('app-1', mockUser);
      expect(result).toEqual({ status: 'cancelled' });
    });

    it('delegates updateApplicationStatus to dayOffService.updateApplicationStatus with scope and admin flag', async () => {
      dayOffService.updateApplicationStatus.mockResolvedValue({ status: 'approved' } as any);
      const reqWithAccess = {
        ...mockReq,
        user: { ...mockUser, is_system_admin: false },
        access: { 'dayoff.approvals': { scope: 'team' } },
      };
      const result = await controller.updateApplicationStatus(
        'app-1',
        { status: 'approved', reason: 'Approved' },
        reqWithAccess as any,
      );
      expect(dayOffService.updateApplicationStatus).toHaveBeenCalledWith(
        'app-1',
        'approved',
        reqWithAccess.user,
        'Approved',
        'team',
        false,
      );
      expect(result).toEqual({ status: 'approved' });
    });
  });
});
