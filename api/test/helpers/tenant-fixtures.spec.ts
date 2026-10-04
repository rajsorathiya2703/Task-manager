import { Types } from 'mongoose';
import { makeTenant, makeTwoTenants } from './tenant-fixtures';

describe('tenant-fixtures helper', () => {
  it('should generate valid tenant fixture properties', () => {
    const tenant = makeTenant('Acme Corp');

    expect(tenant.name).toBe('Acme Corp');
    expect(tenant.slug).toBe('acme-corp');
    expect(tenant.companyId).toBeInstanceOf(Types.ObjectId);
    expect(tenant.ownerUserId).toBeInstanceOf(Types.ObjectId);
    expect(tenant.memberUserId).toBeInstanceOf(Types.ObjectId);
    expect(tenant.ownerUserId).not.toEqual(tenant.memberUserId);
  });

  it('should generate two distinct tenants with isolated IDs and slugs', () => {
    const { A, B } = makeTwoTenants('Acme Corp', 'Globex Corporation');

    expect(A.slug).toBe('acme-corp');
    expect(B.slug).toBe('globex-corporation');
    expect(A.companyId).not.toEqual(B.companyId);
    expect(A.ownerUserId).not.toEqual(B.ownerUserId);
    expect(A.memberUserId).not.toEqual(B.memberUserId);
  });
});
