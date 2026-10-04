import { Types } from 'mongoose';
import { InternalServerErrorException } from '@nestjs/common';
import {
  runWithTenant,
  getTenant,
  requireTenant,
  TenantStore,
} from './tenant-context';

describe('tenant-context (AsyncLocalStorage)', () => {
  it('should return undefined when getTenant() is called outside runWithTenant', () => {
    expect(getTenant()).toBeUndefined();
  });

  it('should throw InternalServerErrorException when requireTenant() is called outside runWithTenant', () => {
    expect(() => requireTenant()).toThrow(InternalServerErrorException);
    expect(() => requireTenant()).toThrow('Tenant context missing');
  });

  it('should provide the store synchronously inside runWithTenant', () => {
    const store: TenantStore = {
      userId: 'user-1',
      companyId: new Types.ObjectId(),
      companySlug: 'acme-corp',
      membership: { isCompanyOwner: true },
    };

    runWithTenant(store, () => {
      expect(getTenant()).toEqual(store);
      expect(requireTenant()).toEqual(store);
    });

    expect(getTenant()).toBeUndefined();
  });

  it('should isolate tenant context across concurrent async executions', async () => {
    const companyA: TenantStore = {
      userId: 'user-a',
      companyId: new Types.ObjectId(),
      companySlug: 'company-a',
      membership: { role: 'admin' },
    };

    const companyB: TenantStore = {
      userId: 'user-b',
      companyId: new Types.ObjectId(),
      companySlug: 'company-b',
      membership: { role: 'employee' },
    };

    const runTaskA = () =>
      runWithTenant(companyA, async () => {
        expect(getTenant()?.companySlug).toBe('company-a');
        await new Promise((resolve) => setTimeout(resolve, 50));
        expect(getTenant()?.companySlug).toBe('company-a');
        expect(requireTenant().userId).toBe('user-a');
        return getTenant()?.companySlug;
      });

    const runTaskB = () =>
      runWithTenant(companyB, async () => {
        expect(getTenant()?.companySlug).toBe('company-b');
        await new Promise((resolve) => setTimeout(resolve, 25));
        expect(getTenant()?.companySlug).toBe('company-b');
        expect(requireTenant().userId).toBe('user-b');
        return getTenant()?.companySlug;
      });

    const [resA, resB] = await Promise.all([runTaskA(), runTaskB()]);

    expect(resA).toBe('company-a');
    expect(resB).toBe('company-b');
    expect(getTenant()).toBeUndefined();
  });
});
