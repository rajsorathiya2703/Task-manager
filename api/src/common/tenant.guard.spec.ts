import { ExecutionContext, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Types } from 'mongoose';
import { of, lastValueFrom } from 'rxjs';
import { TenantGuard, NO_TENANT_KEY } from './tenant.guard';
import { TenantInterceptor } from './tenant.interceptor';
import { getTenant } from './tenant-context';
import { makeTenant } from '../../test/helpers/tenant-fixtures';

describe('TenantGuard & TenantInterceptor', () => {
  let guard: TenantGuard;
  let interceptor: TenantInterceptor;
  let reflector: Reflector;
  let companyModel: any;
  let membershipModel: any;

  const fixture = makeTenant('Acme Corp');
  const mockCompanyId = fixture.companyId;
  const mockUserId = fixture.ownerUserId.toString();

  const mockCompany = {
    _id: mockCompanyId,
    slug: fixture.slug,
    name: fixture.name,
    status: 'active',
  };

  const mockMembership = {
    _id: new Types.ObjectId(),
    userId: new Types.ObjectId(mockUserId),
    companyId: mockCompanyId,
    roleIds: [],
    isCompanyOwner: true,
    status: 'active',
  };

  beforeEach(() => {
    reflector = new Reflector();
    companyModel = {
      findOne: jest.fn(),
    };
    membershipModel = {
      findOne: jest.fn(),
    };

    guard = new TenantGuard(reflector, companyModel, membershipModel);
    interceptor = new TenantInterceptor();
  });

  function createMockContext(request: any): ExecutionContext {
    return {
      switchToHttp: () => ({
        getRequest: () => request,
        getResponse: () => ({}),
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as any;
  }

  describe('TenantGuard', () => {
    it('should allow immediately if route has @NoTenant() metadata', async () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);

      const context = createMockContext({
        params: {},
      });

      const result = await guard.canActivate(context);
      expect(result).toBe(true);
      expect(companyModel.findOne).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException if companySlug is missing from params', async () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);

      const context = createMockContext({
        params: {},
      });

      await expect(guard.canActivate(context)).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException (404) if company is not found or inactive', async () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);

      companyModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      const context = createMockContext({
        params: { companySlug: 'unknown-co' },
      });

      await expect(guard.canActivate(context)).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if user is not authenticated', async () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);

      companyModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockCompany),
      });

      const context = createMockContext({
        params: { companySlug: 'acme-corp' },
        user: null,
      });

      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException (403) if caller is not an active member', async () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);

      companyModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockCompany),
      });

      membershipModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      const context = createMockContext({
        params: { companySlug: 'acme-corp' },
        user: { id: mockUserId },
      });

      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException if user has authType guest', async () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);

      companyModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockCompany),
      });

      const context = createMockContext({
        params: { companySlug: 'acme-corp' },
        user: { id: mockUserId, authType: 'guest' },
      });

      await expect(guard.canActivate(context)).rejects.toThrow(
        new ForbiddenException('Guest accounts cannot use companies. Please sign in with Google.'),
      );
      expect(membershipModel.findOne).not.toHaveBeenCalled();
    });

    it('should allow access and attach req.company and req.membership for active member', async () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);

      companyModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockCompany),
      });

      membershipModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockMembership),
      });

      const request: any = {
        params: { companySlug: 'acme-corp' },
        user: { id: mockUserId },
      };
      const context = createMockContext(request);

      const result = await guard.canActivate(context);
      expect(result).toBe(true);
      expect(request.company).toEqual(mockCompany);
      expect(request.membership).toEqual(mockMembership);
    });
  });

  describe('TenantInterceptor', () => {
    it('should execute downstream handler inside runWithTenant ALS context', async () => {
      const request: any = {
        company: mockCompany,
        membership: mockMembership,
        user: { id: mockUserId },
      };
      const context = createMockContext(request);

      let tenantDuringCall: any = null;
      const nextHandler = {
        handle: () => {
          tenantDuringCall = getTenant();
          return of({ success: true });
        },
      };

      const result$ = interceptor.intercept(context, nextHandler);
      const res = await lastValueFrom(result$);

      expect(res).toEqual({ success: true });
      expect(tenantDuringCall).toBeDefined();
      expect(tenantDuringCall.companyId).toEqual(mockCompany._id);
      expect(tenantDuringCall.companySlug).toBe('acme-corp');
      expect(tenantDuringCall.userId).toBe(mockUserId);
      expect(tenantDuringCall.membership).toEqual(mockMembership);

      // Context must be cleared afterwards
      expect(getTenant()).toBeUndefined();
    });
  });
});
