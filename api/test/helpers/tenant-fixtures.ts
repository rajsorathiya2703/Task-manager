/**
 * ============================================================================
 * STANDARD CROSS-TENANT TEST PATTERN
 * ============================================================================
 * In a multi-tenant system, tenant isolation is strictly verified as follows:
 * 1. Create a record in Company A (e.g. Task, Project, Team, Employee).
 * 2. Attempt to read, update, or delete that record in the context of Company B.
 * 3. The service/endpoint MUST treat the record from Company A as non-existent
 *    when accessed from Company B, throwing NotFoundException (404), NEVER
 *    ForbiddenException (403), to prevent leaking the existence of another
 *    company's data.
 * ============================================================================
 */

import { Types } from 'mongoose';
import { slugify } from '../../src/companies/slug.util';

export interface TenantFixture {
  companyId: Types.ObjectId;
  slug: string;
  name: string;
  ownerUserId: Types.ObjectId;
  memberUserId: Types.ObjectId;
}

export interface TwoTenantsFixture {
  A: TenantFixture;
  B: TenantFixture;
}

/**
 * Generates mock identifiers and metadata for a tenant company.
 * Usable across unit tests with mocked Mongoose models.
 */
export function makeTenant(name: string = 'Acme Corp'): TenantFixture {
  const companyId = new Types.ObjectId();
  const slug = slugify(name) || 'tenant';
  const ownerUserId = new Types.ObjectId();
  const memberUserId = new Types.ObjectId();

  return {
    companyId,
    slug,
    name,
    ownerUserId,
    memberUserId,
  };
}

/**
 * Creates two completely isolated tenant fixtures (Company A and Company B).
 */
export function makeTwoTenants(
  nameA: string = 'Company Alpha',
  nameB: string = 'Company Beta',
): TwoTenantsFixture {
  return {
    A: makeTenant(nameA),
    B: makeTenant(nameB),
  };
}
