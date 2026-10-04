import { AsyncLocalStorage } from 'async_hooks';
import { Types } from 'mongoose';
import { InternalServerErrorException } from '@nestjs/common';

export interface TenantStore {
  userId: string;
  companyId: Types.ObjectId;
  companySlug: string;
  membership: any;
}

export const tenantStorage = new AsyncLocalStorage<TenantStore>();

/**
 * Runs a function within the scope of a given TenantStore.
 */
export function runWithTenant<T>(store: TenantStore, fn: () => T): T {
  return tenantStorage.run(store, fn);
}

/**
 * Returns the current tenant context from AsyncLocalStorage, or undefined if not in a tenant scope.
 */
export function getTenant(): TenantStore | undefined {
  return tenantStorage.getStore();
}

/**
 * Returns the current tenant context.
 * Throws InternalServerErrorException if invoked outside of a tenant context.
 */
export function requireTenant(): TenantStore {
  const store = tenantStorage.getStore();
  if (!store) {
    throw new InternalServerErrorException('Tenant context missing');
  }
  return store;
}
