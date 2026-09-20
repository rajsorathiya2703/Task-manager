import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { UserGroupsService } from '../user-groups/user-groups.service';
import { EmployeesService } from '../employees/employees.service';
import { ForbiddenException, BadRequestException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

describe('UsersController', () => {
  let controller: UsersController;
  let usersService: jest.Mocked<UsersService>;
  let userGroupsService: jest.Mocked<UserGroupsService>;
  let employeesService: jest.Mocked<EmployeesService>;

  beforeEach(async () => {
    usersService = {
      findAll: jest.fn(),
      findById: jest.fn(),
      updateUser: jest.fn(),
      remove: jest.fn(),
      countSystemAdmins: jest.fn(),
    } as any;

    userGroupsService = {
      getUserPermissions: jest.fn(),
      ensureUserInAdminGroup: jest.fn(),
      removeUserFromAdminGroup: jest.fn(),
    } as any;

    employeesService = {
      createFromUser: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        { provide: UsersService, useValue: usersService },
        { provide: UserGroupsService, useValue: userGroupsService },
        { provide: EmployeesService, useValue: employeesService },
        { provide: Reflector, useValue: {} },
      ],
    }).compile();

    controller = module.get<UsersController>(UsersController);
  });

  describe('update', () => {
    it('should REJECT a non-admin attempting to modify is_system_admin (Privilege Escalation Prevention)', async () => {
      const nonAdminReq = {
        user: { _id: 'user1', is_system_admin: false },
      };
      userGroupsService.getUserPermissions.mockResolvedValue({
        groups: ['Employee'],
        permissions: [],
        modulePermissions: {},
        operationPermissions: {},
        fieldPermissions: {},
      });

      await expect(
        controller.update('user1', { is_system_admin: true }, nonAdminReq),
      ).rejects.toThrow(ForbiddenException);

      expect(usersService.updateUser).not.toHaveBeenCalled();
    });

    it('should ALLOW a system admin to modify is_system_admin and synchronize admin group', async () => {
      const adminReq = {
        user: { _id: 'admin1', is_system_admin: true },
      };
      userGroupsService.getUserPermissions.mockResolvedValue({
        groups: ['Administrators'],
        permissions: [],
        modulePermissions: {},
        operationPermissions: {},
        fieldPermissions: {},
      });

      const updatedUser = { _id: 'targetUser1', is_system_admin: true } as any;
      usersService.updateUser.mockResolvedValue(updatedUser);

      const result = await controller.update('targetUser1', { is_system_admin: true }, adminReq);

      expect(result).toBe(updatedUser);
      // Phase 19: controller now passes an actor object for audit trail
      expect(userGroupsService.ensureUserInAdminGroup).toHaveBeenCalledWith('targetUser1', expect.any(Object));
    });

    it('should PREVENT demoting the last remaining system administrator', async () => {
      const adminReq = {
        user: { _id: 'admin1', is_system_admin: true },
      };
      userGroupsService.getUserPermissions.mockResolvedValue({
        groups: ['Administrators'],
        permissions: [],
        modulePermissions: {},
        operationPermissions: {},
        fieldPermissions: {},
      });

      usersService.findById.mockResolvedValue({ _id: 'admin1', is_system_admin: true } as any);
      usersService.countSystemAdmins.mockResolvedValue(1);

      await expect(
        controller.update('admin1', { is_system_admin: false }, adminReq),
      ).rejects.toThrow(BadRequestException);

      expect(usersService.updateUser).not.toHaveBeenCalled();
    });

    it('should ALLOW non-admin to update standard profile fields without is_system_admin', async () => {
      const nonAdminReq = {
        user: { _id: 'user1', is_system_admin: false },
      };
      const updatedUser = { _id: 'user1', name: 'New Name' } as any;
      usersService.updateUser.mockResolvedValue(updatedUser);

      const result = await controller.update('user1', { name: 'New Name' }, nonAdminReq);

      expect(result).toBe(updatedUser);
      expect(usersService.updateUser).toHaveBeenCalledWith('user1', { name: 'New Name' });
    });
  });

  describe('remove', () => {
    it('should PREVENT non-admin from deleting a system administrator account', async () => {
      const nonAdminReq = {
        user: { _id: 'user1', is_system_admin: false },
      };
      userGroupsService.getUserPermissions.mockResolvedValue({
        groups: ['Employee'],
        permissions: [],
        modulePermissions: {},
        operationPermissions: {},
        fieldPermissions: {},
      });

      usersService.findById.mockResolvedValue({ _id: 'admin1', is_system_admin: true } as any);

      await expect(controller.remove('admin1', nonAdminReq)).rejects.toThrow(ForbiddenException);
      expect(usersService.remove).not.toHaveBeenCalled();
    });

    it('should PREVENT deleting the last remaining system administrator', async () => {
      const adminReq = {
        user: { _id: 'admin1', is_system_admin: true },
      };
      userGroupsService.getUserPermissions.mockResolvedValue({
        groups: ['Administrators'],
        permissions: [],
        modulePermissions: {},
        operationPermissions: {},
        fieldPermissions: {},
      });

      usersService.findById.mockResolvedValue({ _id: 'admin1', is_system_admin: true } as any);
      usersService.countSystemAdmins.mockResolvedValue(1);

      await expect(controller.remove('admin1', adminReq)).rejects.toThrow(BadRequestException);
      expect(usersService.remove).not.toHaveBeenCalled();
    });

    it('should ALLOW admin to delete a standard user', async () => {
      const adminReq = {
        user: { _id: 'admin1', is_system_admin: true },
      };
      usersService.findById.mockResolvedValue({ _id: 'user1', is_system_admin: false } as any);
      usersService.remove.mockResolvedValue({ _id: 'user1' } as any);

      const result = await controller.remove('user1', adminReq);
      expect(result).toEqual({ _id: 'user1' });
      expect(usersService.remove).toHaveBeenCalledWith('user1');
    });
  });
});
