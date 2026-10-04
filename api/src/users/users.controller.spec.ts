import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { Company } from '../companies/schemas/company.schema';
import { Membership } from '../companies/schemas/membership.schema';
import { makeTwoTenants } from '../../test/helpers/tenant-fixtures';

describe('UsersController (MC-31 — Company-scoped members)', () => {
  let controller: UsersController;
  let usersService: jest.Mocked<UsersService>;

  const { A: tenantA, B: tenantB } = makeTwoTenants();
  const userIdA1 = new Types.ObjectId();
  const userIdA2 = new Types.ObjectId();
  const ownerUserIdA = tenantA.ownerUserId;

  const memberA1 = {
    _id: userIdA1,
    membershipId: new Types.ObjectId(),
    name: 'Alice',
    email: 'alice@alpha.com',
    avatarUrl: null,
    lastLoginAt: new Date(),
    membershipStatus: 'active',
    isCompanyOwner: false,
    employeeId: null,
    joinedAt: new Date(),
  };

  const memberA2Owner = {
    _id: ownerUserIdA,
    membershipId: new Types.ObjectId(),
    name: 'Owner',
    email: 'owner@alpha.com',
    avatarUrl: null,
    lastLoginAt: new Date(),
    membershipStatus: 'active',
    isCompanyOwner: true,
    employeeId: null,
    joinedAt: new Date(),
  };

  beforeEach(async () => {
    usersService = {
      listMembers: jest.fn(),
      getMemberById: jest.fn(),
      updateMemberProfile: jest.fn(),
      suspendMembership: jest.fn(),
      // Keep other methods as no-op
      findAll: jest.fn(),
      findById: jest.fn(),
      findByGoogleId: jest.fn(),
      findByGuestId: jest.fn(),
      findByEmail: jest.fn(),
      createUser: jest.fn(),
      updateUser: jest.fn(),
      remove: jest.fn(),
      countSystemAdmins: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        { provide: UsersService, useValue: usersService },
        { provide: getModelToken(Company.name), useValue: {} },
        { provide: getModelToken(Membership.name), useValue: {} },
      ],
    }).compile();

    controller = module.get<UsersController>(UsersController);
  });

  describe('GET / (findAll) — list members', () => {
    it('returns only members of the specified company', async () => {
      usersService.listMembers.mockResolvedValue([memberA1, memberA2Owner]);

      const result = await controller.findAll(tenantA.companyId);

      expect(result).toHaveLength(2);
      expect(usersService.listMembers).toHaveBeenCalledWith(tenantA.companyId);
    });

    it('returns empty array when company has no members', async () => {
      usersService.listMembers.mockResolvedValue([]);

      const result = await controller.findAll(tenantB.companyId);

      expect(result).toHaveLength(0);
      expect(usersService.listMembers).toHaveBeenCalledWith(tenantB.companyId);
    });

    it('never exposes googleId or guestId in response', async () => {
      usersService.listMembers.mockResolvedValue([memberA1]);

      const result = await controller.findAll(tenantA.companyId);

      expect(result[0]).not.toHaveProperty('googleId');
      expect(result[0]).not.toHaveProperty('guestId');
      expect(result[0]).toHaveProperty('name');
      expect(result[0]).toHaveProperty('email');
      expect(result[0]).toHaveProperty('membershipStatus');
      expect(result[0]).toHaveProperty('isCompanyOwner');
    });
  });

  describe('GET /:id (findOne) — get member', () => {
    it('returns member when they have a membership in the company', async () => {
      usersService.getMemberById.mockResolvedValue(memberA1);

      const result = await controller.findOne(tenantA.companyId, userIdA1.toString());

      expect(result).toEqual(memberA1);
      expect(usersService.getMemberById).toHaveBeenCalledWith(
        tenantA.companyId,
        userIdA1.toString(),
      );
    });

    it('throws NotFoundException when user has no membership in this company', async () => {
      usersService.getMemberById.mockResolvedValue(null);

      await expect(
        controller.findOne(tenantB.companyId, userIdA1.toString()),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('PATCH /:id (update) — update member profile', () => {
    it('updates only name, stripping is_employee/is_system_admin/email/avatarUrl', async () => {
      const updatedMember = { ...memberA1, name: 'Alice Updated' };
      usersService.updateMemberProfile.mockResolvedValue(updatedMember);

      const dto: any = {
        name: 'Alice Updated',
        is_employee: true,       // should be stripped
        is_system_admin: true,   // should be stripped
        email: 'hack@evil.com',  // should be stripped
        avatarUrl: 'http://x',   // should be stripped
      };

      const result = await controller.update(tenantA.companyId, userIdA1.toString(), dto);

      expect(result.name).toBe('Alice Updated');
      expect(usersService.updateMemberProfile).toHaveBeenCalledWith(
        tenantA.companyId,
        userIdA1.toString(),
        { name: 'Alice Updated' },
      );
    });

    it('throws NotFoundException when user has no membership in the company', async () => {
      usersService.updateMemberProfile.mockResolvedValue(null);

      await expect(
        controller.update(tenantB.companyId, userIdA1.toString(), { name: 'Test' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('DELETE /:id (remove) — suspend membership', () => {
    it('suspends membership (does not delete the User)', async () => {
      usersService.suspendMembership.mockResolvedValue({
        success: true,
        message: `Membership for user ${userIdA1.toString()} has been suspended.`,
      });

      const result = await controller.remove(tenantA.companyId, userIdA1.toString());

      expect(result.success).toBe(true);
      expect(result.message).toContain('suspended');
      expect(usersService.suspendMembership).toHaveBeenCalledWith(
        tenantA.companyId,
        userIdA1.toString(),
      );
    });

    it('throws NotFoundException when user has no membership', async () => {
      usersService.suspendMembership.mockResolvedValue({
        success: false,
        message: 'not_found',
      });

      await expect(
        controller.remove(tenantB.companyId, userIdA1.toString()),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException when trying to remove the company owner', async () => {
      usersService.suspendMembership.mockRejectedValue(
        new BadRequestException('Cannot remove the company owner. Transfer ownership first.'),
      );

      await expect(
        controller.remove(tenantA.companyId, ownerUserIdA.toString()),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('Cross-tenant isolation', () => {
    it('list returns empty for company B when members belong to company A only', async () => {
      // Company A has members
      usersService.listMembers.mockImplementation(async (companyId: Types.ObjectId) => {
        if (companyId.toString() === tenantA.companyId.toString()) {
          return [memberA1, memberA2Owner];
        }
        return [];
      });

      const membersA = await controller.findAll(tenantA.companyId);
      expect(membersA).toHaveLength(2);

      const membersB = await controller.findAll(tenantB.companyId);
      expect(membersB).toHaveLength(0);
    });

    it('findOne for user of company A returns 404 when queried under company B', async () => {
      usersService.getMemberById.mockImplementation(
        async (companyId: Types.ObjectId, userId: string) => {
          if (
            companyId.toString() === tenantA.companyId.toString() &&
            userId === userIdA1.toString()
          ) {
            return memberA1;
          }
          return null;
        },
      );

      // Found in A
      const result = await controller.findOne(tenantA.companyId, userIdA1.toString());
      expect(result).toEqual(memberA1);

      // Not found in B -> 404
      await expect(
        controller.findOne(tenantB.companyId, userIdA1.toString()),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
