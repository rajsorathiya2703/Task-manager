import { Reflector } from '@nestjs/core';
import { ExecutionContext, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { EmployeesService } from '../employees/employees.service';
import { ACCESS_REQUIREMENT_KEY } from '../access/decorators/require-access.decorator';
import { AccessGuard } from '../access/access.guard';
import { PolicyCompilerService } from '../access/policy-compiler.service';
import { PolicyEngineService } from '../access/policy-engine.service';

describe('UsersController (P1-16 — Users Controller Module Gate)', () => {
  let controller: UsersController;
  let usersService: jest.Mocked<UsersService>;
  let employeesService: jest.Mocked<EmployeesService>;
  const reflector = new Reflector();

  beforeEach(async () => {
    usersService = {
      findAll: jest.fn(),
      findById: jest.fn(),
      updateUser: jest.fn(),
      remove: jest.fn(),
      countSystemAdmins: jest.fn(),
    } as any;

    employeesService = {
      createFromUser: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        { provide: UsersService, useValue: usersService },
        { provide: EmployeesService, useValue: employeesService },
      ],
    }).compile();

    controller = module.get<UsersController>(UsersController);
  });

  describe('Route @RequireAccess metadata', () => {
    it('decorates findAll with { module: "users", action: "read" }', () => {
      const meta = reflector.get(ACCESS_REQUIREMENT_KEY, controller.findAll);
      expect(meta).toEqual({ module: 'users', action: 'read' });
    });

    it('decorates findOne with { module: "users", action: "read" }', () => {
      const meta = reflector.get(ACCESS_REQUIREMENT_KEY, controller.findOne);
      expect(meta).toEqual({ module: 'users', action: 'read' });
    });

    it('decorates update with { module: "users", action: "update" }', () => {
      const meta = reflector.get(ACCESS_REQUIREMENT_KEY, controller.update);
      expect(meta).toEqual({ module: 'users', action: 'update' });
    });

    it('decorates remove with { module: "users", action: "delete" }', () => {
      const meta = reflector.get(ACCESS_REQUIREMENT_KEY, controller.remove);
      expect(meta).toEqual({ module: 'users', action: 'delete' });
    });
  });

  describe('Privilege Escalation & Module Gate Enforcement (AccessGuard)', () => {
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
              exec: jest.fn().mockResolvedValue([{ _id: 'role-non-admin' }]),
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
        getClass: () => UsersController,
        switchToHttp: () => ({
          getRequest: () => request,
        }),
      } as any;
    }

    it('DENIES non-admin calling PATCH /users/:id (e.g. attempting to self-grant is_system_admin) with 403', async () => {
      policyEngineService.can.mockReturnValue({
        allow: false,
        reason: 'No role granted update on users',
        scope: 'none',
      } as any);

      const context = createMockContext(
        { id: 'user-employee', is_system_admin: false },
        controller.update,
      );

      await expect(accessGuard.canActivate(context)).rejects.toThrow(ForbiddenException);
      expect(policyEngineService.can).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'user-employee' }),
        'update',
        'users',
        undefined,
        expect.any(Object),
      );
    });

    it('DENIES non-admin calling GET /users when role has users.read=false with 403', async () => {
      policyEngineService.can.mockReturnValue({
        allow: false,
        reason: 'No role granted read on users',
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
        'users',
        undefined,
        expect.any(Object),
      );
    });

    it('DENIES non-admin calling DELETE /users/:id when role has users.delete=false with 403', async () => {
      policyEngineService.can.mockReturnValue({
        allow: false,
        reason: 'No role granted delete on users',
        scope: 'none',
      } as any);

      const context = createMockContext(
        { id: 'user-restricted', is_system_admin: false },
        controller.remove,
      );

      await expect(accessGuard.canActivate(context)).rejects.toThrow(ForbiddenException);
      expect(policyEngineService.can).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'user-restricted' }),
        'delete',
        'users',
        undefined,
        expect.any(Object),
      );
    });

    it('ALLOWS Admin with users.update=true calling PATCH /users/:id', async () => {
      policyEngineService.can.mockReturnValue({
        allow: true,
        scope: 'all',
      } as any);

      const context = createMockContext(
        { id: 'user-admin', is_system_admin: false },
        controller.update,
      );

      const canActivate = await accessGuard.canActivate(context);
      expect(canActivate).toBe(true);
      expect(policyEngineService.can).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'user-admin' }),
        'update',
        'users',
        undefined,
        expect.any(Object),
      );
    });

    it('ALLOWS System Admin to access any route', async () => {
      policyEngineService.can.mockReturnValue({
        allow: true,
        scope: 'all',
      } as any);

      const context = createMockContext(
        { id: 'super-admin', is_system_admin: true },
        controller.update,
      );

      const canActivate = await accessGuard.canActivate(context);
      expect(canActivate).toBe(true);
      expect(policyEngineService.can).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'super-admin', isSystemAdmin: true }),
        'update',
        'users',
        undefined,
        expect.any(Object),
      );
    });
  });

  describe('Controller functionality', () => {
    describe('findAll', () => {
      it('returns all users from usersService', async () => {
        const users = [{ _id: 'user1' }, { _id: 'user2' }] as any;
        usersService.findAll.mockResolvedValue(users);

        const result = await controller.findAll();
        expect(result).toBe(users);
        expect(usersService.findAll).toHaveBeenCalled();
      });
    });

    describe('findOne', () => {
      it('returns user when found', async () => {
        const user = { _id: 'user1', email: 'test@example.com' } as any;
        usersService.findById.mockResolvedValue(user);

        const result = await controller.findOne('user1');
        expect(result).toBe(user);
        expect(usersService.findById).toHaveBeenCalledWith('user1');
      });

      it('throws NotFoundException when user not found', async () => {
        usersService.findById.mockResolvedValue(null);

        await expect(controller.findOne('non-existent')).rejects.toThrow(NotFoundException);
      });
    });

    describe('update', () => {
      it('updates user profile fields', async () => {
        const updatedUser = { _id: 'user1', name: 'New Name' } as any;
        usersService.updateUser.mockResolvedValue(updatedUser);

        const result = await controller.update('user1', { name: 'New Name' });

        expect(result).toBe(updatedUser);
        expect(usersService.updateUser).toHaveBeenCalledWith('user1', { name: 'New Name' });
        expect(employeesService.createFromUser).not.toHaveBeenCalled();
      });

      it('triggers createFromUser if is_employee is true', async () => {
        const updatedUser = { _id: 'user1', is_employee: true } as any;
        usersService.updateUser.mockResolvedValue(updatedUser);

        const result = await controller.update('user1', { is_employee: true });

        expect(result).toBe(updatedUser);
        expect(employeesService.createFromUser).toHaveBeenCalledWith(updatedUser);
      });

      it('throws NotFoundException when user to update does not exist', async () => {
        usersService.updateUser.mockResolvedValue(null);

        await expect(controller.update('non-existent', { name: 'New' })).rejects.toThrow(
          NotFoundException,
        );
      });
    });

    describe('remove', () => {
      it('deletes an existing user', async () => {
        usersService.findById.mockResolvedValue({ _id: 'user1' } as any);
        usersService.remove.mockResolvedValue({ _id: 'user1' } as any);

        const result = await controller.remove('user1');
        expect(result).toEqual({ _id: 'user1' });
        expect(usersService.remove).toHaveBeenCalledWith('user1');
      });

      it('throws NotFoundException when user does not exist', async () => {
        usersService.findById.mockResolvedValue(null);

        await expect(controller.remove('non-existent')).rejects.toThrow(NotFoundException);
      });
    });
  });
});
