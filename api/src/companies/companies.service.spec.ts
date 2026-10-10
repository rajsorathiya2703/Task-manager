import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { CompaniesService } from './companies.service';
import { Company } from './schemas/company.schema';
import { CompanyMember } from './schemas/company-member.schema';
import { CreateCompanyDto } from './dto/create-company.dto';

describe('CompaniesService', () => {
  let service: CompaniesService;
  let companyModel: any;
  let companyMemberModel: any;

  const mockUserId = new Types.ObjectId().toString();
  const mockCompanyId = new Types.ObjectId();

  beforeEach(async () => {
    companyModel = {
      create: jest.fn(),
      findByIdAndDelete: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
    };

    companyMemberModel = {
      create: jest.fn(),
      find: jest.fn(),
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

      // Verify trial ends approximately 14 days from now
      const fourteenDaysMs = 14 * 24 * 60 * 60 * 1000;
      const expectedEnd = Date.now() + fourteenDaysMs;
      expect(Math.abs(createArgs.trialEndsAt.getTime() - expectedEnd)).toBeLessThan(5000);

      // Verify owner membership creation
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

      // First attempt fails with 11000, second attempt succeeds
      companyModel.create
        .mockRejectedValueOnce(duplicateError)
        .mockResolvedValueOnce(createdCompany);

      companyMemberModel.create.mockResolvedValue({});

      const result = await service.create(mockUserId, validDto);

      expect(companyModel.create).toHaveBeenCalledTimes(2);

      // First call used base slug
      expect(companyModel.create.mock.calls[0][0].slug).toBe('acme-corp');

      // Second call appended random suffix
      const secondCallSlug = companyModel.create.mock.calls[1][0].slug;
      expect(secondCallSlug).toMatch(/^acme-corp-[a-z0-9]{4}$/);

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

      // Rollback expectation
      expect(companyModel.findByIdAndDelete).toHaveBeenCalledWith(mockCompanyId);
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
          companyId: null, // Should be filtered out
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

      // Sorted by company createdAt desc (Company Beta created after Company Alpha)
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
});
