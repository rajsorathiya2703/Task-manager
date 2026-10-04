import { Schema, Types, model } from 'mongoose';
import { tenantPlugin, applyTenantPlugin, TENANT_QUERY_HOOKS } from './tenant.plugin';
import { runWithTenant, TenantStore } from './tenant-context';

describe('tenantPlugin', () => {
  const companyAId = new Types.ObjectId();
  const companyBId = new Types.ObjectId();

  const tenantA: TenantStore = {
    userId: 'user-a',
    companyId: companyAId,
    companySlug: 'company-a',
    membership: {},
  };

  it('applyTenantPlugin should only attach plugin if companyId path exists', () => {
    const withCompanyId = new Schema({
      name: String,
      companyId: { type: Schema.Types.ObjectId },
    });
    const withoutCompanyId = new Schema({
      name: String,
    });

    const pluginSpyWith = jest.spyOn(withCompanyId, 'plugin');
    const pluginSpyWithout = jest.spyOn(withoutCompanyId, 'plugin');

    applyTenantPlugin(withCompanyId);
    applyTenantPlugin(withoutCompanyId);

    expect(pluginSpyWith).toHaveBeenCalledWith(tenantPlugin);
    expect(pluginSpyWithout).not.toHaveBeenCalled();
  });

  describe('query hooks', () => {
    let schema: Schema;

    beforeEach(() => {
      schema = new Schema({
        title: String,
        companyId: Schema.Types.ObjectId,
      });
      schema.plugin(tenantPlugin);
    });

    it('should inject companyId into query filter when tenant context is present', () => {
      runWithTenant(tenantA, () => {
        for (const hook of TENANT_QUERY_HOOKS) {
          let currentFilter: any = { status: 'active' };
          const mockQuery: any = {
            getFilter: () => currentFilter,
            where: (condition: any) => {
              currentFilter = { ...currentFilter, ...condition };
            },
          };

          // Find the hook handler registered for this hook
          const hookFns = (schema as any).s.hooks._pres.get(hook) || [];
          expect(hookFns.length).toBeGreaterThan(0);

          for (const entry of hookFns) {
            entry.fn.call(mockQuery);
          }

          expect(currentFilter.companyId).toEqual(companyAId);
          expect(currentFilter.status).toBe('active');
        }
      });
    });

    it('should NOT overwrite companyId if already present in query filter', () => {
      const explicitCompanyId = new Types.ObjectId();

      runWithTenant(tenantA, () => {
        let currentFilter: any = { companyId: explicitCompanyId };
        const mockQuery: any = {
          getFilter: () => currentFilter,
          where: (condition: any) => {
            currentFilter = { ...currentFilter, ...condition };
          },
        };

        const hookFns = (schema as any).s.hooks._pres.get('find') || [];
        for (const entry of hookFns) {
          entry.fn.call(mockQuery);
        }

        expect(currentFilter.companyId).toEqual(explicitCompanyId);
      });
    });

    it('should do nothing when no tenant context is active', () => {
      let currentFilter: any = { status: 'active' };
      const mockQuery: any = {
        getFilter: () => currentFilter,
        where: (condition: any) => {
          currentFilter = { ...currentFilter, ...condition };
        },
      };

      const hookFns = (schema as any).s.hooks._pres.get('find') || [];
      for (const entry of hookFns) {
        entry.fn.call(mockQuery);
      }

      expect(currentFilter.companyId).toBeUndefined();
      expect(currentFilter.status).toBe('active');
    });
  });

  describe('save hook', () => {
    let schema: Schema;

    beforeEach(() => {
      schema = new Schema({
        title: String,
        companyId: Schema.Types.ObjectId,
      });
      schema.plugin(tenantPlugin);
    });

    it('should stamp companyId on doc without companyId when tenant context is present', () => {
      const mockDoc: any = { title: 'Test Task' };
      const saveFns = (schema as any).s.hooks._pres.get('save') || [];

      runWithTenant(tenantA, () => {
        for (const entry of saveFns) {
          entry.fn.call(mockDoc);
        }
        expect(mockDoc.companyId).toEqual(companyAId);
      });
    });

    it('should reject save with Error if doc companyId mismatches tenant context', () => {
      const mockDoc: any = { title: 'Test Task', companyId: companyBId };
      const saveFns = (schema as any).s.hooks._pres.get('save') || [];

      runWithTenant(tenantA, () => {
        expect(() => {
          for (const entry of saveFns) {
            entry.fn.call(mockDoc);
          }
        }).toThrow(/Tenant mismatch/);
      });
    });

    it('should allow save if doc companyId matches tenant context', () => {
      const mockDoc: any = { title: 'Test Task', companyId: companyAId };
      const saveFns = (schema as any).s.hooks._pres.get('save') || [];

      runWithTenant(tenantA, () => {
        expect(() => {
          for (const entry of saveFns) {
            entry.fn.call(mockDoc);
          }
        }).not.toThrow();
        expect(mockDoc.companyId).toEqual(companyAId);
      });
    });
  });

  describe('insertMany hook', () => {
    let schema: Schema;

    beforeEach(() => {
      schema = new Schema({
        title: String,
        companyId: Schema.Types.ObjectId,
      });
      schema.plugin(tenantPlugin);
    });

    it('should stamp companyId on items being inserted', () => {
      const docs: any[] = [{ title: 'Doc 1' }, { title: 'Doc 2' }];
      const insertFns = (schema as any).s.hooks._pres.get('insertMany') || [];

      runWithTenant(tenantA, () => {
        for (const entry of insertFns) {
          entry.fn.call({}, null, docs);
        }
        expect(docs[0].companyId).toEqual(companyAId);
        expect(docs[1].companyId).toEqual(companyAId);
      });
    });

    it('should reject insertMany if any item belongs to another company', () => {
      const docs = [{ title: 'Doc 1' }, { title: 'Doc 2', companyId: companyBId }];
      const insertFns = (schema as any).s.hooks._pres.get('insertMany') || [];

      runWithTenant(tenantA, () => {
        expect(() => {
          for (const entry of insertFns) {
            entry.fn.call({}, null, docs);
          }
        }).toThrow(/Tenant mismatch/);
      });
    });
  });
});
