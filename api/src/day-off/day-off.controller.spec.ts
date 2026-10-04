import { Reflector } from '@nestjs/core';
import { ExecutionContext, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { DayOffController } from './day-off.controller';
import { DayOffService } from './day-off.service';
import { CompaniesService } from '../companies/companies.service';
import { Company } from '../companies/schemas/company.schema';
import { Membership } from '../companies/schemas/membership.schema';
import { ACCESS_REQUIREMENT_KEY } from '../access/decorators/require-access.decorator';
import { IS_PUBLIC_KEY } from '../auth/decorators/public.decorator';
import { AccessGuard } from '../access/access.guard';
import { PolicyCompilerService } from '../access/policy-compiler.service';
import { PolicyEngineService } from '../access/policy-engine.service';
import { NO_TENANT_KEY, TenantGuard } from '../common/tenant.guard';
import { makeTwoTenants } from '../../test/helpers/tenant-fixtures';

describe('DayOffController (P1-17 & MC-28 — Day-Off Controller Module Gates & Tenant Scoping)', () => {
  let controller: DayOffController;
  let dayOffService: jest.Mocked<DayOffService>;
  let companiesService: jest.Mocked<CompaniesService>;
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

    companiesService = {
      findBySlug: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [DayOffController],
      providers: [
        { provide: DayOffService, useValue: dayOffService },
        { provide: CompaniesService, useValue: companiesService },
        { provide: getModelToken(Company.name), useValue: {} },
        { provide: getModelToken(Membership.name), useValue: {} },
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

    it('keeps approveByToken marked with @Public(), @NoTenant(), and without @RequireAccess', () => {
      const isPublic = reflector.get(IS_PUBLIC_KEY, controller.approveByToken);
      const requirement = reflector.get(ACCESS_REQUIREMENT_KEY, controller.approveByToken);
      const isNoTenant = reflector.get(NO_TENANT_KEY, controller.approveByToken);
      expect(isPublic).toBe(true);
      expect(requirement).toBeUndefined();
      expect(isNoTenant).toBe(true);
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
    const mockCompanyId = new Types.ObjectId();
    const mockEmployeeId = new Types.ObjectId();
    const mockUser = { id: 'user-1', email: 'user@example.com' };
    const mockReq = {
      user: mockUser,
      membership: {
        isCompanyOwner: true,
        employeeId: mockEmployeeId,
      },
    };

    it('delegates getSettings to dayOffService.getSettings with companyId', async () => {
      dayOffService.getSettings.mockResolvedValue({ defaultAllocation: 20 } as any);
      const result = await controller.getSettings(mockCompanyId);
      expect(dayOffService.getSettings).toHaveBeenCalledWith(mockCompanyId);
      expect(result).toEqual({ defaultAllocation: 20 });
    });

    it('delegates updateSettings to dayOffService.updateSettings with companyId', async () => {
      const dto = { defaultAllocation: 25 };
      dayOffService.updateSettings.mockResolvedValue(dto as any);
      const result = await controller.updateSettings(mockCompanyId, mockReq as any, dto);
      expect(dayOffService.updateSettings).toHaveBeenCalledWith(mockCompanyId, dto);
      expect(result).toEqual(dto);
    });

    it('delegates getLeaveTypes to dayOffService.getLeaveTypes with companyId', async () => {
      dayOffService.getLeaveTypes.mockResolvedValue(['vacation'] as any);
      const result = await controller.getLeaveTypes(mockCompanyId, 'true');
      expect(dayOffService.getLeaveTypes).toHaveBeenCalledWith(mockCompanyId, { activeOnly: true });
      expect(result).toEqual(['vacation']);
    });

    it('delegates getLeaveTypeById to dayOffService.getLeaveTypeById with companyId', async () => {
      dayOffService.getLeaveTypeById.mockResolvedValue({ id: 'lt-1' } as any);
      const result = await controller.getLeaveTypeById(mockCompanyId, 'lt-1');
      expect(dayOffService.getLeaveTypeById).toHaveBeenCalledWith(mockCompanyId, 'lt-1');
      expect(result).toEqual({ id: 'lt-1' });
    });

    it('delegates createLeaveType to dayOffService.createLeaveType with companyId', async () => {
      const dto = { name: 'Sick' };
      dayOffService.createLeaveType.mockResolvedValue(dto as any);
      const result = await controller.createLeaveType(mockCompanyId, mockReq as any, dto);
      expect(dayOffService.createLeaveType).toHaveBeenCalledWith(mockCompanyId, dto);
      expect(result).toEqual(dto);
    });

    it('delegates updateLeaveType to dayOffService.updateLeaveType with companyId', async () => {
      const dto = { name: 'Sick Paid' };
      dayOffService.updateLeaveType.mockResolvedValue(dto as any);
      const result = await controller.updateLeaveType(mockCompanyId, 'lt-1', mockReq as any, dto);
      expect(dayOffService.updateLeaveType).toHaveBeenCalledWith(mockCompanyId, 'lt-1', dto);
      expect(result).toEqual(dto);
    });

    it('delegates deleteLeaveType to dayOffService.deleteLeaveType with companyId', async () => {
      dayOffService.deleteLeaveType.mockResolvedValue({ deleted: true } as any);
      const result = await controller.deleteLeaveType(mockCompanyId, 'lt-1', mockReq as any);
      expect(dayOffService.deleteLeaveType).toHaveBeenCalledWith(mockCompanyId, 'lt-1');
      expect(result).toEqual({ deleted: true });
    });

    it('delegates getMyBalances to dayOffService.getEmployeeBalances using req.membership.employeeId', async () => {
      dayOffService.getEmployeeBalances.mockResolvedValue({ balance: 10 } as any);
      const result = await controller.getMyBalances(mockCompanyId, mockReq as any, '2026');
      expect(dayOffService.getEmployeeBalances).toHaveBeenCalledWith(mockCompanyId, mockEmployeeId, 2026);
      expect(result).toEqual({ balance: 10 });
    });

    it('delegates getEmployeeBalances to dayOffService.getEmployeeBalances with companyId', async () => {
      dayOffService.getEmployeeBalances.mockResolvedValue({ balance: 12 } as any);
      const result = await controller.getEmployeeBalances(mockCompanyId, 'emp-2', '2026');
      expect(dayOffService.getEmployeeBalances).toHaveBeenCalledWith(mockCompanyId, 'emp-2', 2026);
      expect(result).toEqual({ balance: 12 });
    });

    it('delegates applyLeave to dayOffService.applyLeave with companyId and membership.employeeId', async () => {
      const body = { leaveTypeId: 'lt-1', daysCount: 2 };
      dayOffService.applyLeave.mockResolvedValue({ id: 'app-1' } as any);
      const result = await controller.applyLeave(mockCompanyId, mockReq as any, body);
      expect(dayOffService.applyLeave).toHaveBeenCalledWith(mockCompanyId, mockEmployeeId, mockUser, body);
      expect(result).toEqual({ id: 'app-1' });
    });

    it('delegates getMyApplications to dayOffService.getMyApplications with companyId', async () => {
      dayOffService.getMyApplications.mockResolvedValue(['my-app'] as any);
      const result = await controller.getMyApplications(mockCompanyId, mockReq as any, '2026');
      expect(dayOffService.getMyApplications).toHaveBeenCalledWith(mockCompanyId, mockUser, 2026);
      expect(result).toEqual(['my-app']);
    });

    it('delegates getAllApplications to dayOffService.getAllApplications with companyId', async () => {
      dayOffService.getAllApplications.mockResolvedValue(['app1', 'app2'] as any);
      const reqWithAccess = {
        ...mockReq,
        user: { ...mockUser, is_system_admin: false },
        access: { 'dayoff.approvals': { scope: 'team' } },
      };
      const result = await controller.getAllApplications(mockCompanyId, reqWithAccess as any, 'pending', '2026');
      expect(dayOffService.getAllApplications).toHaveBeenCalledWith(
        mockCompanyId,
        { status: 'pending', year: 2026 },
        reqWithAccess.user,
        'team',
        false,
      );
      expect(result).toEqual(['app1', 'app2']);
    });

    it('delegates cancelApplication to dayOffService.cancelApplication with companyId', async () => {
      dayOffService.cancelApplication.mockResolvedValue({ status: 'cancelled' } as any);
      const result = await controller.cancelApplication(mockCompanyId, 'app-1', mockReq as any);
      expect(dayOffService.cancelApplication).toHaveBeenCalledWith(mockCompanyId, 'app-1', mockUser);
      expect(result).toEqual({ status: 'cancelled' });
    });

    it('delegates updateApplicationStatus to dayOffService.updateApplicationStatus with companyId', async () => {
      dayOffService.updateApplicationStatus.mockResolvedValue({ status: 'approved' } as any);
      const reqWithAccess = {
        ...mockReq,
        user: { ...mockUser, is_system_admin: false },
        access: { 'dayoff.approvals': { scope: 'team' } },
      };
      const result = await controller.updateApplicationStatus(
        mockCompanyId,
        'app-1',
        { status: 'approved', reason: 'Approved' },
        reqWithAccess as any,
      );
      expect(dayOffService.updateApplicationStatus).toHaveBeenCalledWith(
        mockCompanyId,
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

  describe('Settings and Leave Type WRITE endpoints permissions (MC-28)', () => {
    const mockCompanyId = new Types.ObjectId();
    const nonOwnerReq = {
      user: { id: 'user-regular', is_system_admin: false },
      membership: { isCompanyOwner: false },
    };

    it('blocks non-owner from updating settings with ForbiddenException', async () => {
      await expect(
        controller.updateSettings(mockCompanyId, nonOwnerReq as any, { defaultAllocation: 30 }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('blocks non-owner from creating leave types with ForbiddenException', async () => {
      await expect(
        controller.createLeaveType(mockCompanyId, nonOwnerReq as any, { name: 'Special Leave' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('blocks non-owner from updating leave types with ForbiddenException', async () => {
      await expect(
        controller.updateLeaveType(mockCompanyId, 'lt-1', nonOwnerReq as any, { name: 'Updated' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('blocks non-owner from deleting leave types with ForbiddenException', async () => {
      await expect(
        controller.deleteLeaveType(mockCompanyId, 'lt-1', nonOwnerReq as any),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('Public Approval Endpoint & Cross-Tenant Verification (MC-28)', () => {
    const tenants = makeTwoTenants('Alpha Inc', 'Beta Corp');
    const appId = new Types.ObjectId().toString();
    const token = 'secret-token-xyz';

    it('fails when token from Company A is approved under slug of Company B', async () => {
      companiesService.findBySlug.mockResolvedValue({
        _id: tenants.B.companyId,
        slug: tenants.B.slug,
      } as any);

      dayOffService.approveByToken.mockRejectedValue(
        new NotFoundException('Leave application not found.'),
      );

      const mockRes: any = {
        status: jest.fn().mockReturnThis(),
        send: jest.fn(),
      };

      await controller.approveByToken(tenants.B.slug, appId, token, mockRes);

      expect(companiesService.findBySlug).toHaveBeenCalledWith(tenants.B.slug);
      expect(dayOffService.approveByToken).toHaveBeenCalledWith(appId, token, tenants.B.companyId);
      expect(mockRes.status).toHaveBeenCalledWith(200);

      const htmlSent = mockRes.send.mock.calls[0][0];
      expect(htmlSent).toContain('Approval Could Not Be Completed');
      expect(htmlSent).toContain('Leave application not found.');
    });

    it('succeeds when correct slug and token are used', async () => {
      companiesService.findBySlug.mockResolvedValue({
        _id: tenants.A.companyId,
        slug: tenants.A.slug,
      } as any);

      dayOffService.approveByToken.mockResolvedValue({
        success: true,
        message: 'The leave application has been marked as Approved, and the employee has been notified.',
      } as any);

      const mockRes: any = {
        status: jest.fn().mockReturnThis(),
        send: jest.fn(),
      };

      await controller.approveByToken(tenants.A.slug, appId, token, mockRes);

      expect(companiesService.findBySlug).toHaveBeenCalledWith(tenants.A.slug);
      expect(dayOffService.approveByToken).toHaveBeenCalledWith(appId, token, tenants.A.companyId);
      expect(mockRes.status).toHaveBeenCalledWith(200);

      const htmlSent = mockRes.send.mock.calls[0][0];
      expect(htmlSent).toContain('Leave Approved Successfully');
    });

    it('escapes HTML special characters in error message to prevent XSS', async () => {
      companiesService.findBySlug.mockResolvedValue({
        _id: tenants.A.companyId,
        slug: tenants.A.slug,
      } as any);

      dayOffService.approveByToken.mockRejectedValue(
        new Error('<script>alert("xss")</script> & malicious "content"'),
      );

      const mockRes: any = {
        status: jest.fn().mockReturnThis(),
        send: jest.fn(),
      };

      await controller.approveByToken(tenants.A.slug, appId, token, mockRes);

      const htmlSent = mockRes.send.mock.calls[0][0];
      expect(htmlSent).not.toContain('<script>');
      expect(htmlSent).toContain('&lt;script&gt;');
      expect(htmlSent).toContain('&amp;');
      expect(htmlSent).toContain('&quot;');
    });
  });

  describe('Multi-Tenant Mounting (MC-28)', () => {
    it('mounts controller under companies/:companySlug/day-off', () => {
      const path = Reflect.getMetadata('path', DayOffController);
      expect(path).toBe('companies/:companySlug/day-off');
    });
  });
});
