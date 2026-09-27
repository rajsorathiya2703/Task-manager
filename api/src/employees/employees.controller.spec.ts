import { Reflector } from '@nestjs/core';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { EmployeesController } from './employees.controller';
import { EmployeesService } from './employees.service';
import { ACCESS_REQUIREMENT_KEY } from '../access/decorators/require-access.decorator';
import { AccessGuard } from '../access/access.guard';
import { PolicyCompilerService } from '../access/policy-compiler.service';
import { PolicyEngineService } from '../access/policy-engine.service';

describe('EmployeesController (P1-14 — Employees Controller Module Gate)', () => {
  let controller: EmployeesController;
  let employeesService: jest.Mocked<EmployeesService>;
  const reflector = new Reflector();

  beforeEach(() => {
    employeesService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      getLinkStatus: jest.fn(),
      linkByUserId: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    } as any;

    controller = new EmployeesController(employeesService);
  });

  describe('Route @RequireAccess metadata', () => {
    it('decorates create with { module: "employees", action: "create" }', () => {
      const meta = reflector.get(ACCESS_REQUIREMENT_KEY, controller.create);
      expect(meta).toEqual({ module: 'employees', action: 'create' });
    });

    it('decorates findAll with { module: "employees", action: "read" }', () => {
      const meta = reflector.get(ACCESS_REQUIREMENT_KEY, controller.findAll);
      expect(meta).toEqual({ module: 'employees', action: 'read' });
    });

    it('decorates findOne with { module: "employees", action: "read" }', () => {
      const meta = reflector.get(ACCESS_REQUIREMENT_KEY, controller.findOne);
      expect(meta).toEqual({ module: 'employees', action: 'read' });
    });

    it('decorates getLinkStatus with { module: "employees", action: "read" }', () => {
      const meta = reflector.get(ACCESS_REQUIREMENT_KEY, controller.getLinkStatus);
      expect(meta).toEqual({ module: 'employees', action: 'read' });
    });

    it('decorates linkUser with { module: "employees", action: "update" }', () => {
      const meta = reflector.get(ACCESS_REQUIREMENT_KEY, controller.linkUser);
      expect(meta).toEqual({ module: 'employees', action: 'update' });
    });

    it('decorates update with { module: "employees", action: "update" }', () => {
      const meta = reflector.get(ACCESS_REQUIREMENT_KEY, controller.update);
      expect(meta).toEqual({ module: 'employees', action: 'update' });
    });

    it('decorates remove with { module: "employees", action: "delete" }', () => {
      const meta = reflector.get(ACCESS_REQUIREMENT_KEY, controller.remove);
      expect(meta).toEqual({ module: 'employees', action: 'delete' });
    });
  });

  describe('Module Gate Enforcement on GET /employees', () => {
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
        getClass: () => EmployeesController,
        switchToHttp: () => ({
          getRequest: () => request,
        }),
      } as any;
    }

    it('DENIES with 403 on GET /employees when role has employees.read=false', async () => {
      policyEngineService.can.mockReturnValue({
        allow: false,
        reason: 'No role granted read on employees',
        scope: 'none',
      } as any);

      const context = createMockContext(
        { id: 'user-restricted', is_system_admin: false },
        controller.findAll,
      );

      await expect(accessGuard.canActivate(context)).rejects.toThrow(ForbiddenException);
      expect(policyEngineService.can).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'user-restricted' }),
        'read',
        'employees',
        undefined,
        expect.any(Object),
      );
    });

    it('ALLOWS GET /employees when role has employees.read=true', async () => {
      policyEngineService.can.mockReturnValue({
        allow: true,
        scope: 'all',
      } as any);

      const context = createMockContext(
        { id: 'user-manager', is_system_admin: false },
        controller.findAll,
      );

      const canActivate = await accessGuard.canActivate(context);
      expect(canActivate).toBe(true);
      expect(policyEngineService.can).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'user-manager' }),
        'read',
        'employees',
        undefined,
        expect.any(Object),
      );
    });

    it('ALLOWS System Admin to access GET /employees', async () => {
      policyEngineService.can.mockReturnValue({
        allow: true,
        scope: 'all',
      } as any);

      const context = createMockContext(
        { id: 'user-admin', is_system_admin: true },
        controller.findAll,
      );

      const canActivate = await accessGuard.canActivate(context);
      expect(canActivate).toBe(true);
      expect(policyEngineService.can).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'user-admin', isSystemAdmin: true }),
        'read',
        'employees',
        undefined,
        expect.any(Object),
      );
    });
  });

  describe('Service delegation', () => {
    const mockReq = {
      user: { id: 'user-123', email: 'test@example.com', is_system_admin: false },
      access: { employees: { scope: 'team' } },
    };

    it('delegates findAll to employeesService.findAll with user context and scope', async () => {
      employeesService.findAll.mockResolvedValue(['emp1'] as any);
      const result = await controller.findAll(mockReq as any);
      expect(employeesService.findAll).toHaveBeenCalledWith('user-123', 'test@example.com', false, 'team');
      expect(result).toEqual(['emp1']);
    });

    it('delegates findOne to employeesService.findOne with user context and scope', async () => {
      employeesService.findOne.mockResolvedValue({ id: 'emp-1' } as any);
      const result = await controller.findOne('emp-1', mockReq as any);
      expect(employeesService.findOne).toHaveBeenCalledWith('emp-1', 'user-123', 'test@example.com', false, 'team');
      expect(result).toEqual({ id: 'emp-1' });
    });

    it('delegates getLinkStatus to employeesService.getLinkStatus with user context and scope', async () => {
      employeesService.getLinkStatus.mockResolvedValue({ linked: true, userId: 'user-123', employeeEmail: 'test@example.com' });
      const result = await controller.getLinkStatus('emp-1', mockReq as any);
      expect(employeesService.getLinkStatus).toHaveBeenCalledWith('emp-1', 'user-123', 'test@example.com', false, 'team');
      expect(result).toEqual({ linked: true, userId: 'user-123', employeeEmail: 'test@example.com' });
    });

    it('delegates create to employeesService.create', async () => {
      const dto = { fullName: { firstName: 'John', lastName: 'Doe' } };
      await controller.create(dto);
      expect(employeesService.create).toHaveBeenCalledWith(dto);
    });

    it('delegates update to employeesService.update with user context and scope', async () => {
      const dto = { department: 'Engineering' };
      await controller.update('emp-1', dto, mockReq as any);
      expect(employeesService.update).toHaveBeenCalledWith('emp-1', dto, 'user-123', 'test@example.com', false, 'team');
    });

    it('delegates remove to employeesService.remove with user context and scope', async () => {
      await controller.remove('emp-1', mockReq as any);
      expect(employeesService.remove).toHaveBeenCalledWith('emp-1', 'user-123', 'test@example.com', false, 'team');
    });
  });
});
