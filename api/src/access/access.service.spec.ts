import { AccessService } from './access.service';
import { MODULE_CATALOG } from './catalog';
import { PolicyEngineService } from './policy-engine.service';
import { PolicyCompilerService } from './policy-compiler.service';
import { compile } from './policy.compiler';
import { buildDefaultRoles } from './access.seed';

describe('AccessService (P1-03 — Effective Access on /auth/me)', () => {
  let service: AccessService;
  let roleModel: any;
  let userModel: any;
  let policyCompilerService: PolicyCompilerService;
  let policyEngineService: PolicyEngineService;

  // Precompile seeded roles against full catalog for deterministic tests
  const compiledPolicy = compile(buildDefaultRoles() as any, MODULE_CATALOG, 0);

  beforeEach(() => {
    policyCompilerService = {
      getLatestPolicyDocument: jest.fn().mockResolvedValue({
        ...compiledPolicy,
        toObject: () => compiledPolicy,
      }),
    } as any;

    policyEngineService = new PolicyEngineService();

    userModel = {
      findById: jest.fn(),
    };

    roleModel = {
      find: jest.fn(),
    };

    service = new AccessService(
      roleModel,
      userModel,
      policyCompilerService,
      policyEngineService,
    );
  });

  it('matches the exact §10.1 session payload structure', async () => {
    const userId = 'user-emp-1';
    userModel.findById.mockReturnValue({
      lean: () => ({
        exec: () =>
          Promise.resolve({
            _id: userId,
            email: 'emp@example.com',
            is_system_admin: false,
          }),
      }),
    });

    const employeeRole = {
      _id: 'role-emp-id',
      name: 'Employee',
      slug: 'employee',
      priority: 10,
      color: '#10b981',
      isActive: true,
      members: [userId],
    };

    roleModel.find.mockReturnValue({
      lean: () => ({
        exec: () => Promise.resolve([employeeRole]),
      }),
    });

    const result = await service.getEffectiveAccess(userId);

    // 1. Root structure
    expect(result).toHaveProperty('roles');
    expect(result).toHaveProperty('policyVersion', 1);
    expect(result).toHaveProperty('access');

    // 2. Roles structure
    expect(Array.isArray(result.roles)).toBe(true);
    expect(result.roles).toHaveLength(1);
    expect(result.roles[0]).toEqual({
      id: 'role-emp-id',
      name: 'Employee',
      slug: 'employee',
      priority: 10,
      color: '#10b981',
    });

    // 3. Access module structure for every catalog module
    for (const mod of MODULE_CATALOG) {
      expect(result.access[mod.id]).toBeDefined();
      const modAccess = result.access[mod.id];

      expect(typeof modAccess.create).toBe('boolean');
      expect(typeof modAccess.read).toBe('boolean');
      expect(typeof modAccess.update).toBe('boolean');
      expect(typeof modAccess.delete).toBe('boolean');
      expect(['none', 'own', 'team', 'all']).toContain(modAccess.scope);
      expect(typeof modAccess.fields).toBe('object');

      // Check fields structure
      for (const field of mod.fields) {
        expect(modAccess.fields).toHaveProperty(field.key);
        expect(typeof modAccess.fields[field.key].read).toBe('boolean');
        expect(typeof modAccess.fields[field.key].update).toBe('boolean');
      }
    }
  });

  it('returns full CRUD, all scope, and full field access for System Admin', async () => {
    const adminId = 'user-admin-1';
    userModel.findById.mockReturnValue({
      lean: () => ({
        exec: () =>
          Promise.resolve({
            _id: adminId,
            email: 'admin@company.com',
            is_system_admin: true,
          }),
      }),
    });

    const sysAdminRole = {
      _id: 'role-sysadmin-id',
      name: 'System Admin',
      slug: 'system-admin',
      priority: 1000,
      color: '#ef4444',
      isActive: true,
      members: [adminId],
    };

    roleModel.find.mockReturnValue({
      lean: () => ({
        exec: () => Promise.resolve([sysAdminRole]),
      }),
    });

    const result = await service.getEffectiveAccess(adminId);

    expect(result.roles[0].slug).toBe('system-admin');
    expect(result.roles[0].priority).toBe(1000);

    // Verify System Admin has full rights on tasks, employees, and roles
    expect(result.access.tasks).toMatchObject({
      create: true,
      read: true,
      update: true,
      delete: true,
      scope: 'all',
    });
    expect(result.access.employees).toMatchObject({
      create: true,
      read: true,
      update: true,
      delete: true,
      scope: 'all',
    });
    expect(result.access.roles).toMatchObject({
      create: true,
      read: true,
      update: true,
      delete: true,
      scope: 'all',
    });

    // All fields updatable and readable
    expect(result.access.tasks.fields.title).toEqual({
      read: true,
      update: true,
    });
    expect(result.access.employees.fields.baseSalary).toEqual({
      read: true,
      update: true,
    });
  });

  it('restricts employee permissions (own scope, sensitive fields hidden or read-only)', async () => {
    const empId = 'user-emp-2';
    userModel.findById.mockReturnValue({
      lean: () => ({
        exec: () =>
          Promise.resolve({
            _id: empId,
            email: 'emp2@company.com',
            is_system_admin: false,
          }),
      }),
    });

    const employeeRole = {
      _id: 'role-emp-id',
      name: 'Employee',
      slug: 'employee',
      priority: 10,
      isActive: true,
      members: [empId],
    };

    roleModel.find.mockReturnValue({
      lean: () => ({
        exec: () => Promise.resolve([employeeRole]),
      }),
    });

    const result = await service.getEffectiveAccess(empId);

    // Tasks: own scope, cannot delete tasks
    expect(result.access.tasks.read).toBe(true);
    expect(result.access.tasks.scope).toBe('own');
    expect(result.access.tasks.delete).toBe(false);

    // Roles: Employee cannot read or modify roles
    expect(result.access.roles.read).toBe(false);
    expect(result.access.roles.scope).toBe('none');

    // Sensitive field: baseSalary on employees must be hidden (read=false, update=false)
    expect(result.access.employees.fields.baseSalary).toEqual({
      read: false,
      update: false,
    });
  });

  it('returns deny-all for user with no active roles', async () => {
    const noRoleId = 'user-none';
    userModel.findById.mockReturnValue({
      lean: () => ({
        exec: () =>
          Promise.resolve({
            _id: noRoleId,
            email: 'none@company.com',
            is_system_admin: false,
          }),
      }),
    });

    roleModel.find.mockReturnValue({
      lean: () => ({
        exec: () => Promise.resolve([]),
      }),
    });

    const result = await service.getEffectiveAccess(noRoleId);

    expect(result.roles).toEqual([]);
    for (const mod of MODULE_CATALOG) {
      expect(result.access[mod.id]).toMatchObject({
        create: false,
        read: false,
        update: false,
        delete: false,
        scope: 'none',
      });
      for (const field of mod.fields) {
        expect(result.access[mod.id].fields[field.key]).toEqual({
          read: false,
          update: false,
        });
      }
    }
  });
});
