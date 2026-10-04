import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken, getConnectionToken } from '@nestjs/mongoose';
import {
  ConflictException,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { Types } from 'mongoose';
import { CompaniesService, defaultRoleNames } from './companies.service';
import { Company } from './schemas/company.schema';
import { Membership } from './schemas/membership.schema';
import { hashSecretCode } from './secret-code.util';
import { EmployeesService } from '../employees/employees.service';
import { UsersService } from '../users/users.service';
import { DayOffService } from '../day-off/day-off.service';

describe('CompaniesService', () => {
  let service: CompaniesService;
  let companyModel: any;
  let membershipModel: any;
  let connection: any;
  let employeesService: any;
  let usersService: any;
  let dayOffService: any;

  const mockUserId = new Types.ObjectId().toString();

  beforeEach(async () => {
    companyModel = {
      findOne: jest.fn(),
      create: jest.fn(),
      findByIdAndDelete: jest.fn(),
      findByIdAndUpdate: jest.fn(),
    };

    membershipModel = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      findByIdAndUpdate: jest.fn(),
      deleteMany: jest.fn().mockReturnValue({ exec: jest.fn() }),
    };

    connection = {
      startSession: jest.fn().mockResolvedValue(null),
    };

    employeesService = {
      createFromUser: jest.fn().mockImplementation((companyId, user, role = 'Employee', status = 'Active') =>
        Promise.resolve({
          _id: new Types.ObjectId(),
          companyId,
          userId: user?._id || new Types.ObjectId(mockUserId),
          role,
          status,
        }),
      ),
      linkUserByEmail: jest.fn().mockResolvedValue(null),
    };

    usersService = {
      findById: jest.fn().mockImplementation((id: string) =>
        Promise.resolve({
          _id: new Types.ObjectId(id),
          email: 'user@example.com',
          name: 'Test User',
        }),
      ),
      findByEmail: jest.fn(),
    };

    dayOffService = {
      seedCompanyDefaults: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CompaniesService,
        {
          provide: getModelToken(Company.name),
          useValue: companyModel,
        },
        {
          provide: getModelToken(Membership.name),
          useValue: membershipModel,
        },
        {
          provide: getConnectionToken(),
          useValue: connection,
        },
        {
          provide: EmployeesService,
          useValue: employeesService,
        },
        {
          provide: UsersService,
          useValue: usersService,
        },
        {
          provide: DayOffService,
          useValue: dayOffService,
        },
      ],
    }).compile();

    service = module.get<CompaniesService>(CompaniesService);
  });

  describe('create', () => {
    const validDto = {
      name: 'Acme Corp',
      slug: 'acme-corp',
      industry: 'Software',
      sizeRange: '11-50',
      country: 'USA',
    };

    it('should reject an invalid slug format with BadRequestException', async () => {
      await expect(
        service.create(mockUserId, { ...validDto, slug: 'invalid_slug!' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject a reserved slug with ConflictException', async () => {
      await expect(
        service.create(mockUserId, { ...validDto, slug: 'dashboard' }),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException if slug is already taken', async () => {
      companyModel.findOne.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue({ _id: new Types.ObjectId() }),
      });

      await expect(service.create(mockUserId, validDto)).rejects.toThrow(ConflictException);
    });

    it('should successfully create company and membership, returning plain secretCode and NOT secretCodeHash', async () => {
      companyModel.findOne.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(null),
      });

      const mockCompanyId = new Types.ObjectId();
      companyModel.create.mockImplementation((data: any) =>
        Promise.resolve({
          _id: mockCompanyId,
          ...data,
          toObject: () => ({ _id: mockCompanyId, ...data }),
        }),
      );

      const mockEmployeeId = new Types.ObjectId();
      employeesService.createFromUser.mockResolvedValue({
        _id: mockEmployeeId,
        companyId: mockCompanyId,
        role: 'Owner',
        status: 'Active',
      });

      let savedMembership: any = null;
      membershipModel.create.mockImplementation((data: any) => {
        savedMembership = {
          _id: new Types.ObjectId(),
          ...data,
          save: jest.fn().mockResolvedValue(true),
        };
        return Promise.resolve(savedMembership);
      });

      const result = await service.create(mockUserId, validDto);

      expect(result).toBeDefined();
      expect(result.company).toBeDefined();
      expect(result.company.name).toBe('Acme Corp');
      expect(result.company.slug).toBe('acme-corp');
      // Must NOT contain secretCodeHash
      expect((result.company as any).secretCodeHash).toBeUndefined();

      // Must return plain secretCode matching XXXX-XXXX-XXXX
      expect(result.secretCode).toMatch(
        /^[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{4}-[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{4}-[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{4}$/,
      );

      // Verify membership creation
      expect(membershipModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: new Types.ObjectId(mockUserId),
          companyId: mockCompanyId,
          isCompanyOwner: true,
          isSystemAdmin: true,
          roleIds: [],
          status: 'active',
        }),
      );

      // Verify owner employee was created with role 'Owner' and status 'Active'
      expect(employeesService.createFromUser).toHaveBeenCalledWith(
        mockCompanyId,
        expect.objectContaining({ _id: new Types.ObjectId(mockUserId) }),
        'Owner',
        'Active',
      );

      // Verify membership.employeeId was set
      expect(savedMembership.employeeId).toEqual(mockEmployeeId);

      // Verify DayOffService.seedCompanyDefaults was called with owner email
      expect(dayOffService.seedCompanyDefaults).toHaveBeenCalledWith(
        mockCompanyId,
        'user@example.com',
      );
    });

    it('should pass contactEmail to DayOffService.seedCompanyDefaults if provided', async () => {
      const mockCompanyId = new Types.ObjectId();
      companyModel.findOne.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(null),
      });

      companyModel.create.mockResolvedValue({
        _id: mockCompanyId,
        name: 'Acme Corp',
        slug: 'acme-corp',
        contactEmail: 'contact@acme.com',
        toObject: () => ({ _id: mockCompanyId, name: 'Acme Corp', slug: 'acme-corp' }),
      });

      membershipModel.create.mockResolvedValue({
        _id: new Types.ObjectId(),
        save: jest.fn().mockResolvedValue(true),
      });

      await service.create(mockUserId, {
        ...validDto,
        contactEmail: 'contact@acme.com',
      });

      expect(dayOffService.seedCompanyDefaults).toHaveBeenCalledWith(
        mockCompanyId,
        'contact@acme.com',
      );
    });

    it('should define defaultRoleNames constant with 5 placeholder roles', () => {
      expect(defaultRoleNames).toEqual([
        'System Admin',
        'Admin',
        'Manager',
        'Team Leader',
        'Employee',
      ]);
    });
  });

  describe('isSlugAvailable', () => {
    it('should return false for reserved or invalid slugs', async () => {
      expect(await service.isSlugAvailable('dashboard')).toBe(false);
      expect(await service.isSlugAvailable('a')).toBe(false);
    });

    it('should return false if slug already exists in db', async () => {
      companyModel.findOne.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue({ _id: new Types.ObjectId() }),
      });

      expect(await service.isSlugAvailable('acme-corp')).toBe(false);
    });

    it('should return true if slug is valid, unreserved, and unused', async () => {
      companyModel.findOne.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(null),
      });

      expect(await service.isSlugAvailable('brand-new-co')).toBe(true);
    });
  });

  describe('getPublicInfo', () => {
    it('should throw NotFoundException if company does not exist', async () => {
      companyModel.findOne.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(service.getPublicInfo('unknown')).rejects.toThrow(NotFoundException);
    });

    it('should return public name, slug, and logoUrl', async () => {
      companyModel.findOne.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue({
          name: 'Acme Corp',
          slug: 'acme-corp',
          logoUrl: 'https://example.com/logo.png',
        }),
      });

      const res = await service.getPublicInfo('acme-corp');
      expect(res).toEqual({
        name: 'Acme Corp',
        slug: 'acme-corp',
        logoUrl: 'https://example.com/logo.png',
      });
    });
  });

  describe('listMine', () => {
    it('should return active companies user belongs to', async () => {
      membershipModel.find.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([
          {
            companyId: {
              name: 'Acme Corp',
              slug: 'acme-corp',
              logoUrl: 'https://example.com/logo.png',
              status: 'active',
            },
            isCompanyOwner: true,
          },
          {
            companyId: {
              name: 'Globex',
              slug: 'globex',
              status: 'suspended',
            },
            isCompanyOwner: false,
          },
        ]),
      });

      const res = await service.listMine(mockUserId);
      expect(res).toEqual([
        {
          name: 'Acme Corp',
          slug: 'acme-corp',
          logoUrl: 'https://example.com/logo.png',
          isCompanyOwner: true,
        },
      ]);
    });
  });

  describe('join', () => {
    const validSecretCode = 'ACME-7K3Q-9XPD';
    let hashedCode: string;
    const mockCompanyId = new Types.ObjectId();

    beforeAll(async () => {
      hashedCode = await hashSecretCode(validSecretCode);
    });

    it('should throw NotFoundException if company does not exist or is suspended', async () => {
      companyModel.findOne.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(
        service.join(mockUserId, 'unknown', validSecretCode),
      ).rejects.toThrow(NotFoundException);

      companyModel.findOne.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue({ status: 'suspended' }),
      });

      await expect(
        service.join(mockUserId, 'suspended-co', validSecretCode),
      ).rejects.toThrow(NotFoundException);
    });

    it('should be idempotent and return company info without checking code if active membership exists', async () => {
      companyModel.findOne.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue({
          _id: mockCompanyId,
          slug: 'acme-corp',
          name: 'Acme Corp',
          status: 'active',
          secretCodeHash: hashedCode,
        }),
      });

      membershipModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          _id: new Types.ObjectId(),
          userId: new Types.ObjectId(mockUserId),
          companyId: mockCompanyId,
          status: 'active',
        }),
      });

      const res = await service.join(mockUserId, 'acme-corp', 'ANY-DUMMY-CODE');
      expect(res).toEqual({ slug: 'acme-corp', name: 'Acme Corp' });
      expect(membershipModel.create).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException if user membership is suspended', async () => {
      companyModel.findOne.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue({
          _id: mockCompanyId,
          slug: 'acme-corp',
          name: 'Acme Corp',
          status: 'active',
          secretCodeHash: hashedCode,
        }),
      });

      membershipModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          _id: new Types.ObjectId(),
          userId: new Types.ObjectId(mockUserId),
          companyId: mockCompanyId,
          status: 'suspended',
        }),
      });

      await expect(
        service.join(mockUserId, 'acme-corp', validSecretCode),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException if secret code is incorrect', async () => {
      companyModel.findOne.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue({
          _id: mockCompanyId,
          slug: 'acme-corp',
          name: 'Acme Corp',
          status: 'active',
          secretCodeHash: hashedCode,
        }),
      });

      membershipModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(
        service.join(mockUserId, 'acme-corp', 'WRONG-CODE-1234'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should create membership and return slug and name for correct secret code', async () => {
      companyModel.findOne.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue({
          _id: mockCompanyId,
          slug: 'acme-corp',
          name: 'Acme Corp',
          status: 'active',
          secretCodeHash: hashedCode,
        }),
      });

      membershipModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      let savedMembership: any = null;
      membershipModel.create.mockImplementation((data: any) => {
        savedMembership = {
          _id: new Types.ObjectId(),
          ...data,
          save: jest.fn().mockResolvedValue(true),
        };
        return Promise.resolve(savedMembership);
      });

      const res = await service.join(mockUserId, 'acme-corp', validSecretCode);
      expect(res).toEqual({ slug: 'acme-corp', name: 'Acme Corp' });

      expect(membershipModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: new Types.ObjectId(mockUserId),
          companyId: mockCompanyId,
          isCompanyOwner: false,
          isSystemAdmin: false,
          roleIds: [],
          status: 'active',
        }),
      );
    });

    it('should link an existing pre-created employee with same email in the same company and set membership.employeeId', async () => {
      const mockEmpId = new Types.ObjectId();
      const existingEmployee = {
        _id: mockEmpId,
        companyId: mockCompanyId,
        email: 'joining@example.com',
        userId: null,
      };

      companyModel.findOne.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue({
          _id: mockCompanyId,
          slug: 'acme-corp',
          name: 'Acme Corp',
          status: 'active',
          secretCodeHash: hashedCode,
        }),
      });

      membershipModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      usersService.findById.mockResolvedValue({
        _id: new Types.ObjectId(mockUserId),
        email: 'joining@example.com',
        name: 'Joining User',
      });

      employeesService.linkUserByEmail.mockResolvedValue({
        ...existingEmployee,
        userId: new Types.ObjectId(mockUserId),
      });

      let savedMembership: any = null;
      membershipModel.create.mockImplementation((data: any) => {
        savedMembership = {
          _id: new Types.ObjectId(),
          ...data,
          save: jest.fn().mockResolvedValue(true),
        };
        return Promise.resolve(savedMembership);
      });

      const res = await service.join(mockUserId, 'acme-corp', validSecretCode);
      expect(res).toEqual({ slug: 'acme-corp', name: 'Acme Corp' });

      expect(employeesService.linkUserByEmail).toHaveBeenCalledWith(
        mockCompanyId,
        'joining@example.com',
        new Types.ObjectId(mockUserId),
      );

      // createFromUser should NOT be called since an unlinked employee was linked
      expect(employeesService.createFromUser).not.toHaveBeenCalled();

      // membership.employeeId must be set to the linked employee's _id
      expect(savedMembership.employeeId).toEqual(mockEmpId);
    });

    it('should not touch an employee with same email in another company', async () => {
      const otherCompanyId = new Types.ObjectId();
      const sharedEmail = 'shared@example.com';

      companyModel.findOne.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue({
          _id: mockCompanyId,
          slug: 'acme-corp',
          name: 'Acme Corp',
          status: 'active',
          secretCodeHash: hashedCode,
        }),
      });

      membershipModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      usersService.findById.mockResolvedValue({
        _id: new Types.ObjectId(mockUserId),
        email: sharedEmail,
        name: 'Joining User',
      });

      // Employee with same email exists in other company, but NOT in this company
      employeesService.linkUserByEmail.mockImplementation((targetCompanyId: Types.ObjectId) => {
        if (targetCompanyId.toString() === otherCompanyId.toString()) {
          return Promise.resolve({
            _id: new Types.ObjectId(),
            companyId: otherCompanyId,
            email: sharedEmail,
          });
        }
        return Promise.resolve(null);
      });

      const newEmpId = new Types.ObjectId();
      employeesService.createFromUser.mockResolvedValue({
        _id: newEmpId,
        companyId: mockCompanyId,
        email: sharedEmail,
      });

      let savedMembership: any = null;
      membershipModel.create.mockImplementation((data: any) => {
        savedMembership = {
          _id: new Types.ObjectId(),
          ...data,
          save: jest.fn().mockResolvedValue(true),
        };
        return Promise.resolve(savedMembership);
      });

      const res = await service.join(mockUserId, 'acme-corp', validSecretCode);
      expect(res).toEqual({ slug: 'acme-corp', name: 'Acme Corp' });

      // Verifies linkUserByEmail was strictly called for this company
      expect(employeesService.linkUserByEmail).toHaveBeenCalledWith(
        mockCompanyId,
        sharedEmail,
        new Types.ObjectId(mockUserId),
      );

      // And because this company did not have that employee, createFromUser was called for this company
      expect(employeesService.createFromUser).toHaveBeenCalledWith(
        mockCompanyId,
        expect.objectContaining({ email: sharedEmail }),
      );
      expect(savedMembership.employeeId).toEqual(newEmpId);
    });
  });

  describe('getMembershipStatus', () => {
    const mockCompanyId = new Types.ObjectId();

    it('should throw NotFoundException if company does not exist', async () => {
      companyModel.findOne.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(service.getMembershipStatus(mockUserId, 'unknown')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should return { isMember: true } when active membership is found', async () => {
      companyModel.findOne.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue({ _id: mockCompanyId }),
      });

      membershipModel.findOne.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue({ _id: new Types.ObjectId() }),
      });

      const res = await service.getMembershipStatus(mockUserId, 'acme-corp');
      expect(res).toEqual({ isMember: true });
    });

    it('should return { isMember: false } when no active membership exists', async () => {
      companyModel.findOne.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue({ _id: mockCompanyId }),
      });

      membershipModel.findOne.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(null),
      });

      const res = await service.getMembershipStatus(mockUserId, 'acme-corp');
      expect(res).toEqual({ isMember: false });
    });
  });

  describe('regenerateSecretCode', () => {
    const mockCompanyId = new Types.ObjectId();

    it('should throw NotFoundException if company does not exist', async () => {
      companyModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(service.regenerateSecretCode(mockUserId, 'unknown')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException if caller is not the company owner', async () => {
      companyModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          _id: mockCompanyId,
          slug: 'acme-corp',
          status: 'active',
        }),
      });

      membershipModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          userId: new Types.ObjectId(mockUserId),
          companyId: mockCompanyId,
          isCompanyOwner: false,
          status: 'active',
        }),
      });

      await expect(service.regenerateSecretCode(mockUserId, 'acme-corp')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should generate a new code, update DB, and invalidate the old code for joins', async () => {
      const oldPlainCode = 'OLDD-CODE-1234';
      let currentHash = await hashSecretCode(oldPlainCode);

      const mockCompany: any = {
        _id: mockCompanyId,
        slug: 'acme-corp',
        name: 'Acme Corp',
        status: 'active',
        get secretCodeHash() {
          return currentHash;
        },
      };

      // 1. Setup company lookup
      companyModel.findOne.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        exec: jest.fn().mockImplementation(() => Promise.resolve(mockCompany)),
      });

      // 2. Setup owner membership check
      membershipModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          userId: new Types.ObjectId(mockUserId),
          companyId: mockCompanyId,
          isCompanyOwner: true,
          status: 'active',
        }),
      });

      // 3. Mock findByIdAndUpdate to update the hash
      companyModel.findByIdAndUpdate.mockImplementation((_id: any, update: any) => {
        if (update?.$set?.secretCodeHash) {
          currentHash = update.$set.secretCodeHash;
        }
        return {
          exec: jest.fn().mockResolvedValue(mockCompany),
        };
      });

      // 4. Owner regenerates code
      const { secretCode: newCode } = await service.regenerateSecretCode(
        mockUserId,
        'acme-corp',
      );
      expect(newCode).toBeDefined();
      expect(newCode).not.toBe(oldPlainCode);
      expect(newCode).toMatch(
        /^[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{4}-[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{4}-[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{4}$/,
      );

      // 5. Test join with old code -> MUST fail
      const otherUserId = new Types.ObjectId().toString();
      membershipModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(
        service.join(otherUserId, 'acme-corp', oldPlainCode),
      ).rejects.toThrow(ForbiddenException);

      // 6. Test join with new code -> MUST succeed
      membershipModel.create.mockResolvedValue({});
      const joinRes = await service.join(otherUserId, 'acme-corp', newCode);
      expect(joinRes).toEqual({ slug: 'acme-corp', name: 'Acme Corp' });
    });
  });

  describe('update', () => {
    const mockCompanyId = new Types.ObjectId();

    it('should throw ForbiddenException if caller is not the owner', async () => {
      companyModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          _id: mockCompanyId,
          slug: 'acme-corp',
          status: 'active',
        }),
      });

      membershipModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          userId: new Types.ObjectId(mockUserId),
          companyId: mockCompanyId,
          isCompanyOwner: false,
          status: 'active',
        }),
      });

      await expect(
        service.update(mockUserId, 'acme-corp', { name: 'New Name' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should update permitted company fields when caller is owner', async () => {
      companyModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          _id: mockCompanyId,
          slug: 'acme-corp',
          status: 'active',
        }),
      });

      membershipModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          userId: new Types.ObjectId(mockUserId),
          companyId: mockCompanyId,
          isCompanyOwner: true,
          status: 'active',
        }),
      });

      const updatedDoc = {
        _id: mockCompanyId,
        name: 'Acme Global',
        slug: 'acme-corp',
        industry: 'Tech',
        timezone: 'Asia/Kolkata',
      };

      companyModel.findByIdAndUpdate.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(updatedDoc),
      });

      const res = await service.update(mockUserId, 'acme-corp', {
        name: '  Acme Global  ',
        industry: 'Tech',
        timezone: 'Asia/Kolkata',
      });

      expect(res).toEqual(updatedDoc);
      expect(companyModel.findByIdAndUpdate).toHaveBeenCalledWith(
        mockCompanyId,
        {
          $set: {
            name: 'Acme Global',
            industry: 'Tech',
            timezone: 'Asia/Kolkata',
          },
        },
        expect.objectContaining({ new: true, runValidators: true }),
      );
    });
  });
});
