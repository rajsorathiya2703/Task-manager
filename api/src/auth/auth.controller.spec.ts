import { Test, TestingModule } from '@nestjs/testing';
import { Types } from 'mongoose';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtService } from '@nestjs/jwt';
import { AccessService } from '../access/access.service';

describe('AuthController (MC-33 — Multi-company Auth)', () => {
  let controller: AuthController;
  let authService: jest.Mocked<AuthService>;
  let accessService: jest.Mocked<AccessService>;

  const mockUserId = new Types.ObjectId().toString();
  const mockUser = {
    _id: mockUserId,
    authType: 'google',
    googleId: 'google-secret-id-12345',
    guestId: 'guest-secret-id-67890',
    email: 'user@example.com',
    name: 'Test User',
    avatarUrl: 'https://example.com/avatar.png',
    lastLoginAt: new Date('2026-01-01T00:00:00Z'),
    createdAt: new Date('2025-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    is_employee: true,
  };

  const mockMemberships = [
    {
      companySlug: 'acme-corp',
      companyName: 'Acme Corp',
      isCompanyOwner: true,
      status: 'active',
    },
    {
      companySlug: 'beta-inc',
      companyName: 'Beta Inc',
      isCompanyOwner: false,
      status: 'suspended',
    },
  ];

  beforeEach(async () => {
    authService = {
      getUserMemberships: jest.fn(),
      getCompanyMembership: jest.fn(),
      createGuest: jest.fn(),
      loginWithGoogle: jest.fn(),
      refresh: jest.fn(),
    } as any;

    accessService = {
      getEffectiveAccess: jest.fn().mockResolvedValue({
        roles: [],
        policyVersion: 1,
        access: {},
      }),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: JwtService, useValue: { decode: jest.fn() } },
        { provide: AccessService, useValue: accessService },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  describe('GET /auth/me', () => {
    it('returns safe user fields and memberships list without company param', async () => {
      authService.getUserMemberships.mockResolvedValue(mockMemberships);

      const req: any = { user: mockUser };
      const res = await controller.getMe(req);

      expect(res).toBeDefined();
      expect(res._id).toBe(mockUserId);
      expect(res.name).toBe('Test User');
      expect(res.email).toBe('user@example.com');
      expect(res.authType).toBe('google');

      // Never expose secret internal IDs
      expect((res as any).googleId).toBeUndefined();
      expect((res as any).guestId).toBeUndefined();

      // Memberships list returned
      expect(res.memberships).toEqual(mockMemberships);
      expect(res.membership).toBeUndefined();
      expect(authService.getUserMemberships).toHaveBeenCalledWith(mockUserId);
      expect(authService.getCompanyMembership).not.toHaveBeenCalled();
    });

    it('returns empty memberships array for user with no memberships', async () => {
      authService.getUserMemberships.mockResolvedValue([]);

      const req: any = { user: mockUser };
      const res = await controller.getMe(req);

      expect(res.memberships).toEqual([]);
      expect(res.membership).toBeUndefined();
    });

    it('returns active company membership details when ?company=acme-corp is provided', async () => {
      authService.getUserMemberships.mockResolvedValue(mockMemberships);
      const roleId = new Types.ObjectId().toString();
      const employeeId = new Types.ObjectId().toString();

      authService.getCompanyMembership.mockResolvedValue({
        roleIds: [roleId],
        isCompanyOwner: true,
        employeeId,
      });

      const req: any = { user: mockUser };
      const res = await controller.getMe(req, 'acme-corp');

      expect(res.memberships).toEqual(mockMemberships);
      expect(res.membership).toEqual({
        roleIds: [roleId],
        isCompanyOwner: true,
        employeeId,
      });
      expect(authService.getCompanyMembership).toHaveBeenCalledWith(mockUserId, 'acme-corp');
    });

    it('does not include membership field if user is not active member in requested company', async () => {
      authService.getUserMemberships.mockResolvedValue(mockMemberships);
      authService.getCompanyMembership.mockResolvedValue(null);

      const req: any = { user: mockUser };
      const res = await controller.getMe(req, 'unknown-company');

      expect(res.memberships).toEqual(mockMemberships);
      expect(res.membership).toBeUndefined();
      expect(authService.getCompanyMembership).toHaveBeenCalledWith(mockUserId, 'unknown-company');
    });

    it('returns null if req.user is missing', async () => {
      const req: any = {};
      const res = await controller.getMe(req);
      expect(res).toBeNull();
    });
  });

  describe('POST /auth/guest', () => {
    it('creates and returns a guest user with authType guest', async () => {
      const createdGuest = {
        _id: new Types.ObjectId(),
        authType: 'guest',
        lastLoginAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      authService.createGuest.mockResolvedValue({
        user: createdGuest as any,
        tokens: { accessToken: 'acc-token', refreshToken: 'ref-token' },
      });

      const resMock: any = { cookie: jest.fn() };
      const result = await controller.createGuest(resMock);

      expect(result.authType).toBe('guest');
      expect(resMock.cookie).toHaveBeenCalledTimes(2);
    });
  });
});
