import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { CompaniesService } from './companies.service';
import { Company } from './schemas/company.schema';
import { CompanyMember } from './schemas/company-member.schema';
import { Membership } from './schemas/membership.schema';
import { TrialRegistry } from './schemas/trial-registry.schema';
import { CreateCompanyDto } from './dto/create-company.dto';

describe('CompaniesService', () => {
  let service: CompaniesService;
  let companyModel: any;
  let companyMemberModel: any;
  let membershipModel: any;
  let trialRegistryModel: any;

  const mockUserId = new Types.ObjectId().toString();
  const mockCompanyId = new Types.ObjectId();

  beforeEach(async () => {
    companyModel = {
      create: jest.fn(),
      findByIdAndDelete: jest.fn(),
      findById: jest.fn(),
      findByIdAndUpdate: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      exists: jest.fn(),
    };

    companyMemberModel = {
      create: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
    };

    membershipModel = {
      create: jest.fn(),
      updateOne: jest.fn(),
    };

    trialRegistryModel = {
      findOne: jest.fn(),
      create: jest.fn(),
      deleteOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CompaniesService,
        {
          provide: getModelToken(Company.name),
          useValue: companyModel,
        },
        {
          provide: getModelToken(CompanyMember.name),
          useValue: companyMemberModel,
        },
        {
          provide: getModelToken(Membership.name),
          useValue: membershipModel,
        },
        {
          provide: getModelToken(TrialRegistry.name),
          useValue: trialRegistryModel,
        },
      ],
    }).compile();

    service = module.get<CompaniesService>(CompaniesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    const validDto: CreateCompanyDto = {
      name: 'Acme Corp',
      industry: 'Technology',
      employeeCount: '11-50',
      website: 'https://acme.com',
      phone: '+1 555-0100',
      country: 'United States',
    };

    it('sets plan "trial", trialEndsAt about 14 days ahead, and creates an owner membership', async () => {
      const createdCompany: any = {
        _id: mockCompanyId,
        ...validDto,
        slug: 'acme-corp',
        plan: 'trial',
        trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      };

      companyModel.create.mockResolvedValue(createdCompany);
      companyMemberModel.create.mockResolvedValue({
        _id: new Types.ObjectId(),
        companyId: mockCompanyId,
        userId: new Types.ObjectId(mockUserId),
        role: 'owner',
      });

      const result = await service.create(mockUserId, validDto);

      expect(companyModel.create).toHaveBeenCalledTimes(1);
      const createArgs = companyModel.create.mock.calls[0][0];
      expect(createArgs.plan).toBe('trial');
      expect(createArgs.name).toBe(validDto.name);
      expect(createArgs.slug).toBe('acme-corp');

      const fourteenDaysMs = 14 * 24 * 60 * 60 * 1000;
      const expectedEnd = Date.now() + fourteenDaysMs;
      expect(Math.abs(createArgs.trialEndsAt.getTime() - expectedEnd)).toBeLessThan(5000);

      expect(companyMemberModel.create).toHaveBeenCalledWith({
        companyId: mockCompanyId,
        userId: new Types.ObjectId(mockUserId),
        role: 'owner',
      });

      expect(result).toEqual(createdCompany);
    });

    it('retries with a suffixed slug on duplicate-key error (code 11000)', async () => {
      const duplicateError: any = new Error('E11000 duplicate key error');
      duplicateError.code = 11000;

      const createdCompany: any = {
        _id: mockCompanyId,
        ...validDto,
        slug: 'acme-corp-abcd',
        plan: 'trial',
      };

      companyModel.create
        .mockRejectedValueOnce(duplicateError)
        .mockResolvedValueOnce(createdCompany);

      companyMemberModel.create.mockResolvedValue({});

      const result = await service.create(mockUserId, validDto);

      expect(companyModel.create).toHaveBeenCalledTimes(2);
      expect(companyModel.create.mock.calls[0][0].slug).toBe('acme-corp');
      expect(companyModel.create.mock.calls[1][0].slug).toMatch(/^acme-corp-[a-z0-9]{4}$/);
      expect(result).toEqual(createdCompany);
    });

    it('deletes the company and rethrows if membership creation fails', async () => {
      const createdCompany: any = {
        _id: mockCompanyId,
        ...validDto,
        slug: 'acme-corp',
      };

      companyModel.create.mockResolvedValue(createdCompany);
      companyModel.findByIdAndDelete.mockResolvedValue(createdCompany);

      const membershipError = new Error('Membership database failure');
      companyMemberModel.create.mockRejectedValue(membershipError);

      await expect(service.create(mockUserId, validDto)).rejects.toThrow(
        'Membership database failure',
      );

      expect(companyModel.findByIdAndDelete).toHaveBeenCalledWith(mockCompanyId);
    });
  });

  describe('registerCompany', () => {
    const validDto = {
      name: 'Beta Global',
      industry: 'Finance',
      employeeCount: '1-10',
    };

    it('register succeeds for a Google user with new email and sets trialEndsAt ~14 days out', async () => {
      const googleUser = {
        _id: mockUserId,
        authType: 'google',
        email: 'newuser@gmail.com',
      };

      trialRegistryModel.findOne.mockResolvedValue(null);
      trialRegistryModel.create.mockResolvedValue({
        _id: new Types.ObjectId(),
        normalizedEmail: 'newuser@gmail.com',
      });

      const createdCompany: any = {
        _id: mockCompanyId,
        ...validDto,
        slug: 'beta-global',
        plan: 'trial',
        trialStartedAt: new Date(),
        trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      };

      companyModel.create.mockResolvedValue(createdCompany);
      companyMemberModel.create.mockResolvedValue({});
      membershipModel.create.mockResolvedValue({});

      const result = await service.registerCompany(googleUser, validDto);

      expect(trialRegistryModel.findOne).toHaveBeenCalledWith({
        normalizedEmail: 'newuser@gmail.com',
      });
      expect(companyModel.create).toHaveBeenCalledTimes(1);
      const createArgs = companyModel.create.mock.calls[0][0];
      expect(createArgs.plan).toBe('trial');
      expect(createArgs.contactEmail).toBe('newuser@gmail.com');
      const fourteenDaysMs = 14 * 24 * 60 * 60 * 1000;
      const expectedEnd = Date.now() + fourteenDaysMs;
      expect(Math.abs(createArgs.trialEndsAt.getTime() - expectedEnd)).toBeLessThan(5000);
      expect(trialRegistryModel.create).toHaveBeenCalled();
      expect(result).toEqual(createdCompany);
    });

    it('register rejects guest user', async () => {
      const guestUser = {
        _id: mockUserId,
        authType: 'guest',
      };

      await expect(service.registerCompany(guestUser, validDto)).rejects.toThrow(
        'Sign in with Google to start a free trial',
      );
    });

    it('register rejects when normalized email is in TrialRegistry', async () => {
      const googleUser = {
        _id: mockUserId,
        authType: 'google',
        email: 'r.aj+1@gmail.com',
      };

      trialRegistryModel.findOne.mockResolvedValue({
        _id: new Types.ObjectId(),
        normalizedEmail: 'raj@gmail.com',
      });

      await expect(service.registerCompany(googleUser, validDto)).rejects.toThrow(
        'This email has already used its free trial. Contact our sales team.',
      );
      expect(companyModel.create).not.toHaveBeenCalled();
    });
  });

  describe('getEffectiveState', () => {
    it('returns trial_expired when trialEndsAt is in the past, active when status active', () => {
      const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const expiredCompany = {
        plan: 'trial',
        trialEndsAt: pastDate,
      };

      const expiredState = service.getEffectiveState(expiredCompany);
      expect(expiredState.status).toBe('trial_expired');
      expect(expiredState.daysLeft).toBe(0);

      const activeCompany = {
        plan: 'active',
        trialEndsAt: pastDate,
      };

      const activeState = service.getEffectiveState(activeCompany);
      expect(activeState.status).toBe('active');
    });
  });

  describe('findMine', () => {
    it('skips memberships whose company is null and returns the flat shape sorted desc', async () => {
      const date1 = new Date('2026-01-01T10:00:00Z');
      const date2 = new Date('2026-03-01T10:00:00Z');

      const mockCompanyA = {
        _id: new Types.ObjectId(),
        name: 'Company Alpha',
        slug: 'company-alpha',
        industry: 'Software',
        employeeCount: '1-10',
        plan: 'trial',
        trialEndsAt: new Date(),
        createdAt: date1,
      };

      const mockCompanyB = {
        _id: new Types.ObjectId(),
        name: 'Company Beta',
        slug: 'company-beta',
        industry: 'Healthcare',
        employeeCount: '51-200',
        plan: 'active',
        trialEndsAt: new Date(),
        createdAt: date2,
      };

      const mockMemberships = [
        {
          _id: new Types.ObjectId(),
          role: 'member',
          companyId: mockCompanyA,
        },
        {
          _id: new Types.ObjectId(),
          role: 'admin',
          companyId: null,
        },
        {
          _id: new Types.ObjectId(),
          role: 'owner',
          companyId: mockCompanyB,
        },
      ];

      companyMemberModel.find.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(mockMemberships),
        }),
      });

      const results = await service.findMine(mockUserId);

      expect(results).toHaveLength(2);

      expect(results[0]).toEqual({
        _id: mockCompanyB._id,
        name: mockCompanyB.name,
        slug: mockCompanyB.slug,
        industry: mockCompanyB.industry,
        employeeCount: mockCompanyB.employeeCount,
        role: 'owner',
        plan: mockCompanyB.plan,
        trialEndsAt: mockCompanyB.trialEndsAt,
        createdAt: mockCompanyB.createdAt,
      });

      expect(results[1]).toEqual({
        _id: mockCompanyA._id,
        name: mockCompanyA.name,
        slug: mockCompanyA.slug,
        industry: mockCompanyA.industry,
        employeeCount: mockCompanyA.employeeCount,
        role: 'member',
        plan: mockCompanyA.plan,
        trialEndsAt: mockCompanyA.trialEndsAt,
        createdAt: mockCompanyA.createdAt,
      });
    });
  });

  describe('regenerateSecretCode', () => {
    it('generates a random formatted code and persists its hash when called by the owner', async () => {
      const ownerId = new Types.ObjectId();
      const companyId = new Types.ObjectId();
      const mockCompany = {
        _id: companyId,
        slug: 'acme-corp',
        ownerUserId: ownerId,
      };

      companyModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockCompany),
      });
      companyModel.findById.mockReturnValue({
        select: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(mockCompany),
        }),
      });
      companyModel.findByIdAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockCompany),
      });

      const res = await service.regenerateSecretCode(ownerId.toString(), 'acme-corp');

      expect(res.secretCode).toBeDefined();
      expect(res.secretCode).not.toBe('code');
      // Format should be XXXX-XXXX-XXXX
      expect(res.secretCode).toMatch(/^[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{4}-[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{4}-[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{4}$/);

      expect(companyModel.findByIdAndUpdate).toHaveBeenCalledWith(
        companyId,
        expect.objectContaining({
          $set: expect.objectContaining({
            secretCodeHash: expect.any(String),
          }),
        }),
      );
    });

    it('throws ForbiddenException if non-owner tries to regenerate code', async () => {
      const ownerId = new Types.ObjectId();
      const nonOwnerId = new Types.ObjectId();
      const companyId = new Types.ObjectId();
      const mockCompany = {
        _id: companyId,
        slug: 'acme-corp',
        ownerUserId: ownerId,
      };

      companyModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockCompany),
      });
      companyModel.findById.mockReturnValue({
        select: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(mockCompany),
        }),
      });
      companyMemberModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(
        service.regenerateSecretCode(nonOwnerId.toString(), 'acme-corp'),
      ).rejects.toThrow('Only the workspace owner can perform this action');
    });

    it('throws NotFoundException if company does not exist', async () => {
      companyModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(
        service.regenerateSecretCode(new Types.ObjectId().toString(), 'non-existent'),
      ).rejects.toThrow('Company not found');
    });
  });
});
