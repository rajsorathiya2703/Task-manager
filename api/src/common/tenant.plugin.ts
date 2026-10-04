import { Schema } from 'mongoose';
import { getTenant } from './tenant-context';

export const TENANT_QUERY_HOOKS = [
  'find',
  'findOne',
  'findOneAndUpdate',
  'findOneAndDelete',
  'updateOne',
  'updateMany',
  'deleteOne',
  'deleteMany',
  'countDocuments',
  'distinct',
] as const;

/**
 * Mongoose Tenant Plugin
 *
 * Automatically injects the active tenant context into Mongoose queries and documents:
 * - Query hooks: automatically append `{ companyId }` to filter criteria if not already set.
 * - Document save/insert: automatically stamps `companyId` on new docs; blocks saving if companyId mismatches.
 * - Inactive when no tenant context is active (migrations, background jobs, seeders).
 *
 * NOTE: We deliberately do NOT hook into schema.pre('aggregate').
 * Mongoose aggregation pipelines ($match, $lookup, $facet) cannot be safely auto-scoped
 * without potentially altering pipeline logic. Per multi-company architecture rules,
 * aggregation pipelines must explicitly begin with a `$match: { companyId }` stage.
 */
export function tenantPlugin(schema: Schema): void {
  // Query middleware
  for (const hook of TENANT_QUERY_HOOKS) {
    schema.pre(hook as any, function (this: any) {
      const tenant = getTenant();
      if (!tenant) {
        return;
      }

      const filter = this.getFilter() || {};
      if (filter.companyId === undefined) {
        this.where({ companyId: tenant.companyId });
      }
    });
  }

  // Document middleware: pre 'save'
  schema.pre('save', function (this: any) {
    const tenant = getTenant();
    if (!tenant) {
      return;
    }

    if (!this.companyId) {
      this.companyId = tenant.companyId;
    } else if (this.companyId.toString() !== tenant.companyId.toString()) {
      throw new Error(
        'Tenant mismatch: cannot save document belonging to another company',
      );
    }
  });

  // Model middleware: pre 'insertMany'
  schema.pre('insertMany', function (this: any, next: any, docs: any) {
    const tenant = getTenant();
    if (!tenant) {
      if (typeof next === 'function') return next();
      return;
    }

    const items = Array.isArray(docs) ? docs : Array.isArray(next) ? next : [];
    for (const doc of items) {
      if (!doc.companyId) {
        doc.companyId = tenant.companyId;
      } else if (doc.companyId.toString() !== tenant.companyId.toString()) {
        const err = new Error(
          'Tenant mismatch: cannot insert document belonging to another company',
        );
        if (typeof next === 'function') return next(err);
        throw err;
      }
    }

    if (typeof next === 'function') {
      return next();
    }
  });
}

/**
 * Conditionally applies the tenantPlugin to a schema only if that schema
 * defines a `companyId` path.
 */
export function applyTenantPlugin(schema: Schema): void {
  if (schema.path('companyId')) {
    schema.plugin(tenantPlugin);
  }
}
