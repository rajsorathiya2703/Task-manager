import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Types } from 'mongoose';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { Company } from '../companies/schemas/company.schema';
import { Membership } from '../companies/schemas/membership.schema';

describe('AuthService (MC-33 — Multi-company Auth Service)', () => {
  let service: AuthService;
  let usersService: jest.Mocked<UsersService>;
  let companyModel: any;
  let membershipModel: any;
  let jwtService: jest.Mocked<JwtService>;

  const mockUserId = new Types.ObjectId();
  const mockCompanyId = new Types.ObjectId();

  beforeEach(async () => {
    usersService = {
      createUser: jest.fn(),
      findByGoogleId: jest.fn(),
      findByEmail: jest.fn(),
      findByGuestId: jest.fn(),
      findById: jest.fn(),
    } as any;

    jwtService = {
      signAsync: jest.fn().mockResolvedValue('mock-token'),
      verifyAsync: jest.fn(),
    } as any;

    companyModel = {
      findOne: jest.fn(),
    };

    membershipModel = {
      find: jest.fn(),
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: usersService },
        { provide: JwtService, useValue: jwtService },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'GOOGLE_CLIENT_ID') return 'google-client-id';
              if (key === 'JWT_ACCESS_SECRET') return 'acc-secret';
              if (key === 'JWT_REFRESH_SECRET') return 'ref-secret';
              return null;
            }),
          },
        },
        { provide: getModelToken(Company.name), useValue: companyModel },
        { provide: getModelToken(Membership.name), useValue: membershipModel },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  describe('getUserMemberships', () => {
    it('returns formatted memberships array for user', async () => {
      const mockDocs = [
        {
          companyId: {
            slug: 'acme',
            name: 'Acme Corp',
            status: 'active',
          },
          isCompanyOwner: true,
          status: 'active',
        },
      ];

      membershipModel.find.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          lean: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue(mockDocs),
          }),
        }),
      });

      const res = await service.getUserMemberships(mockUserId.toString());

      expect(res).toEqual([
        {
          companySlug: 'acme',
          companyName: 'Acme Corp',
          isCompanyOwner: true,
          status: 'active',
        },
      ]);
    });

    it('returns empty array when user has no memberships or invalid ID', async () => {
      const resInvalid = await service.getUserMemberships('invalid-id');
      expect(resInvalid).toEqual([]);

      membershipModel.find.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          lean: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue([]),
          }),
        }),
      });

      const resEmpty = await service.getUserMemberships(mockUserId.toString());
      expect(resEmpty).toEqual([]);
    });
  });

  describe('getCompanyMembership', () => {
    it('returns active membership details when company and membership exist', async () => {
      companyModel.findOne.mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue({ _id: mockCompanyId }),
          }),
        }),
      });

      const roleId1 = new Types.ObjectId();
      const employeeId = new Types.ObjectId();

      membershipModel.findOne.mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue({
            roleIds: [roleId1],
            isCompanyOwner: false,
            employeeId,
            status: 'active',
          }),
        }),
      });

      const res = await service.getCompanyMembership(mockUserId.toString(), 'acme');

      expect(res).toEqual({
        roleIds: [roleId1.toString()],
        isCompanyOwner: false,
        employeeId: employeeId.toString(),
      });
    });

    it('returns null if company is not found', async () => {
      companyModel.findOne.mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue(null),
          }),
        }),
      });

      const res = await service.getCompanyMembership(mockUserId.toString(), 'unknown');
      expect(res).toBeNull();
    });

    it('returns null if membership is not active / not found', async () => {
      companyModel.findOne.mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue({ _id: mockCompanyId }),
          }),
        }),
      });

      membershipModel.findOne.mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(null),
        }),
      });

      const res = await service.getCompanyMembership(mockUserId.toString(), 'acme');
      expect(res).toBeNull();
    });
  });

  describe('createGuest', () => {
    it('creates guest with authType guest and issues tokens', async () => {
      const createdUser = {
        _id: mockUserId,
        authType: 'guest',
      };
      usersService.createUser.mockResolvedValue(createdUser as any);

      const res = await service.createGuest();

      expect(res.user.authType).toBe('guest');
      expect(usersService.createUser).toHaveBeenCalledWith(
        expect.objectContaining({ authType: 'guest' }),
      );
      expect(res.tokens).toBeDefined();
    });
  });
});
