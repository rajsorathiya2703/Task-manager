import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { BadRequestException } from '@nestjs/common';
import { Types } from 'mongoose';
import { UsersService } from './users.service';
import { User } from './schemas/user.schema';
import { Membership } from '../companies/schemas/membership.schema';
import { makeTwoTenants } from '../../test/helpers/tenant-fixtures';

describe('UsersService (MC-31 — Company-scoped members)', () => {
  let service: UsersService;
  let userModel: any;
  let membershipModel: any;

  const { A: tenantA, B: tenantB } = makeTwoTenants();
  const userIdA1 = new Types.ObjectId();
  const userIdA2 = new Types.ObjectId();
  const ownerUserIdA = tenantA.ownerUserId;

  const mockUserDocA1 = {
    _id: userIdA1,
    name: 'Alice',
    email: 'alice@alpha.com',
    avatarUrl: 'https://example.com/alice.png',
    lastLoginAt: new Date(),
    googleId: 'google-12345',
    guestId: 'guest-67890',
  };

  const mockUserDocOwner = {
    _id: ownerUserIdA,
    name: 'Owner Alice',
    email: 'owner@alpha.com',
    avatarUrl: null,
    lastLoginAt: new Date(),
    googleId: 'google-owner-999',
    guestId: null,
  };

  const mockMembershipA1 = {
    _id: new Types.ObjectId(),
    companyId: tenantA.companyId,
    userId: userIdA1,
    status: 'active',
    isCompanyOwner: false,
    employeeId: new Types.ObjectId(),
    joinedAt: new Date(),
    save: jest.fn().mockResolvedValue(true),
  };

  const mockMembershipOwner = {
    _id: new Types.ObjectId(),
    companyId: tenantA.companyId,
    userId: ownerUserIdA,
    status: 'active',
    isCompanyOwner: true,
    employeeId: null,
    joinedAt: new Date(),
    save: jest.fn().mockResolvedValue(true),
  };

  beforeEach(async () => {
    userModel = {
      findOne: jest.fn(),
      findById: jest.fn(),
      find: jest.fn(),
      findByIdAndUpdate: jest.fn(),
      findByIdAndDelete: jest.fn(),
      countDocuments: jest.fn(),
    };

    membershipModel = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      deleteOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getModelToken(User.name), useValue: userModel },
        { provide: getModelToken(Membership.name), useValue: membershipModel },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  describe('listMembers', () => {
    it('returns empty array if company has no memberships', async () => {
      membershipModel.find.mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue([]),
        }),
      });

      const result = await service.listMembers(tenantA.companyId);

      expect(result).toEqual([]);
      expect(membershipModel.find).toHaveBeenCalledWith({
        companyId: tenantA.companyId,
        status: { $in: ['active', 'suspended'] },
      });
      expect(userModel.find).not.toHaveBeenCalled();
    });

    it('joins memberships with user data and never exposes googleId or guestId', async () => {
      membershipModel.find.mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue([mockMembershipA1, mockMembershipOwner]),
        }),
      });

      userModel.find.mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue([mockUserDocA1, mockUserDocOwner]),
          }),
        }),
      });

      const members = await service.listMembers(tenantA.companyId);

      expect(members).toHaveLength(2);
      expect(members[0]._id).toEqual(userIdA1);
      expect(members[0].name).toBe('Alice');
      expect(members[0].email).toBe('alice@alpha.com');
      expect(members[0].membershipStatus).toBe('active');
      expect(members[0].isCompanyOwner).toBe(false);

      // Verify privacy: googleId and guestId are stripped
      expect(members[0]).not.toHaveProperty('googleId');
      expect(members[0]).not.toHaveProperty('guestId');
      expect(members[1]).not.toHaveProperty('googleId');
      expect(members[1]).not.toHaveProperty('guestId');
    });

    it('isolates members to the requested company', async () => {
      membershipModel.find.mockImplementation((filter: any) => {
        if (filter.companyId.toString() === tenantA.companyId.toString()) {
          return {
            lean: () => ({
              exec: async () => [mockMembershipA1],
            }),
          };
        }
        return {
          lean: () => ({
            exec: async () => [],
          }),
        };
      });

      userModel.find.mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue([mockUserDocA1]),
          }),
        }),
      });

      const membersA = await service.listMembers(tenantA.companyId);
      expect(membersA).toHaveLength(1);

      const membersB = await service.listMembers(tenantB.companyId);
      expect(membersB).toHaveLength(0);
    });
  });

  describe('getMemberById', () => {
    it('returns null for invalid userId format', async () => {
      const result = await service.getMemberById(tenantA.companyId, 'invalid-id');
      expect(result).toBeNull();
      expect(membershipModel.findOne).not.toHaveBeenCalled();
    });

    it('returns null if membership is not found in this company (cross-tenant)', async () => {
      membershipModel.findOne.mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(null),
        }),
      });

      const result = await service.getMemberById(tenantB.companyId, userIdA1.toString());

      expect(result).toBeNull();
      expect(membershipModel.findOne).toHaveBeenCalledWith({
        companyId: tenantB.companyId,
        userId: userIdA1,
      });
      expect(userModel.findById).not.toHaveBeenCalled();
    });

    it('returns null if membership exists but User document is missing', async () => {
      membershipModel.findOne.mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(mockMembershipA1),
        }),
      });

      userModel.findById.mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue(null),
          }),
        }),
      });

      const result = await service.getMemberById(tenantA.companyId, userIdA1.toString());
      expect(result).toBeNull();
    });

    it('returns member details without exposing googleId or guestId', async () => {
      membershipModel.findOne.mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(mockMembershipA1),
        }),
      });

      userModel.findById.mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue(mockUserDocA1),
          }),
        }),
      });

      const member = await service.getMemberById(tenantA.companyId, userIdA1.toString());

      expect(member).not.toBeNull();
      expect(member._id).toEqual(userIdA1);
      expect(member.name).toBe('Alice');
      expect(member.email).toBe('alice@alpha.com');
      expect(member.membershipStatus).toBe('active');
      expect(member.isCompanyOwner).toBe(false);
      expect(member).not.toHaveProperty('googleId');
      expect(member).not.toHaveProperty('guestId');
    });
  });

  describe('updateMemberProfile', () => {
    it('returns null if target user has no membership in company', async () => {
      membershipModel.findOne.mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(null),
        }),
      });

      const result = await service.updateMemberProfile(
        tenantB.companyId,
        userIdA1.toString(),
        { name: 'Updated' },
      );

      expect(result).toBeNull();
      expect(userModel.findByIdAndUpdate).not.toHaveBeenCalled();
    });

    it('updates user name and returns updated member', async () => {
      membershipModel.findOne.mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(mockMembershipA1),
        }),
      });

      userModel.findByIdAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ ...mockUserDocA1, name: 'Alice New' }),
      });

      userModel.findById.mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue({ ...mockUserDocA1, name: 'Alice New' }),
          }),
        }),
      });

      const result = await service.updateMemberProfile(
        tenantA.companyId,
        userIdA1.toString(),
        { name: 'Alice New' },
      );

      expect(userModel.findByIdAndUpdate).toHaveBeenCalledWith(userIdA1.toString(), {
        $set: { name: 'Alice New' },
      });
      expect(result.name).toBe('Alice New');
    });
  });

  describe('suspendMembership (DELETE member)', () => {
    it('returns not_found if membership does not exist', async () => {
      membershipModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      const result = await service.suspendMembership(
        tenantB.companyId,
        userIdA1.toString(),
      );

      expect(result).toEqual({ success: false, message: 'not_found' });
    });

    it('throws BadRequestException when attempting to remove company owner', async () => {
      membershipModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockMembershipOwner),
      });

      await expect(
        service.suspendMembership(tenantA.companyId, ownerUserIdA.toString()),
      ).rejects.toThrow(BadRequestException);
    });

    it('suspends membership and leaves global User document intact', async () => {
      const targetMembership = {
        ...mockMembershipA1,
        status: 'active',
        save: jest.fn().mockResolvedValue(true),
      };

      membershipModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(targetMembership),
      });

      const result = await service.suspendMembership(
        tenantA.companyId,
        userIdA1.toString(),
      );

      expect(result.success).toBe(true);
      expect(targetMembership.status).toBe('suspended');
      expect(targetMembership.save).toHaveBeenCalled();

      // Crucial: Global User must NOT be deleted
      expect(userModel.findByIdAndDelete).not.toHaveBeenCalled();
    });
  });
});
