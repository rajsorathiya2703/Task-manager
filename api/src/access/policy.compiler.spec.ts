/**
 * Policy Compiler Unit Tests (Phase 0 — P0-05)
 *
 * Verifies that compile() transforms raw RoleLike objects into immutable
 * CompiledPolicyDocument snapshots correctly:
 *   • Increments version (prevVersion + 1).
 *   • Generates deterministic SHA-256 hash.
 *   • Filters out inactive roles (isActive === false).
 *   • Denormalizes moduleGrants across all catalog modules.
 *   • Resolves field grants with inheritance and §8 invariant.
 */

import { compile, RoleLike } from './policy.compiler';
import { MODULE_CATALOG, ModuleDef } from './catalog';

describe('Policy Compiler (compile)', () => {
  const mockCatalog: ModuleDef[] = [
    {
      id: 'tasks',
      label: 'Tasks',
      description: 'Tasks module',
      uiRoutes: ['/tasks'],
      primaryModel: 'Task',
      relationships: ['owner', 'assignee'],
      actions: ['create', 'read', 'update', 'delete', 'timer.start'],
      fields: [
        { key: 'title', label: 'Title' },
        { key: 'status', label: 'Status' },
        { key: 'priority', label: 'Priority' },
      ],
    },
    {
      id: 'projects',
      label: 'Projects',
      description: 'Projects module',
      uiRoutes: ['/projects'],
      primaryModel: 'Project',
      relationships: ['owner', 'team_lead'],
      actions: ['create', 'read', 'update', 'delete'],
      fields: [
        { key: 'name', label: 'Name' },
        { key: 'status', label: 'Status' },
      ],
    },
  ];

  it('increments version and generates a SHA-256 hash', () => {
    const doc1 = compile([], mockCatalog, 0);
    expect(doc1.version).toBe(1);
    expect(doc1.hash).toMatch(/^[a-f0-9]{64}$/);
    expect(doc1.compiledAt).toBeInstanceOf(Date);
    expect(doc1.roles).toEqual([]);
    expect(doc1.moduleCatalog).toEqual(mockCatalog);
    expect(doc1.fieldCatalog).toHaveLength(5); // 3 from tasks + 2 from projects

    const doc2 = compile([], mockCatalog, 41);
    expect(doc2.version).toBe(42);
  });

  it('generates identical hashes for identical inputs and different hashes for different inputs', () => {
    const roleA: RoleLike = {
      name: 'Role A',
      slug: 'role-a',
      priority: 10,
      isSystem: false,
      isActive: true,
      members: ['user-1'],
      moduleGrants: [
        {
          module: 'tasks',
          create: true,
          read: true,
          update: false,
          delete: false,
          scope: 'own',
        },
      ],
      fieldGrants: [],
    };

    const doc1 = compile([roleA], mockCatalog, 0);
    const doc2 = compile([roleA], mockCatalog, 1);
    expect(doc1.hash).toBe(doc2.hash);

    const roleB: RoleLike = {
      ...roleA,
      moduleGrants: [
        {
          ...roleA.moduleGrants[0],
          update: true,
        },
      ],
    };
    const doc3 = compile([roleB], mockCatalog, 0);
    expect(doc3.hash).not.toBe(doc1.hash);
  });

  it('filters out inactive roles (isActive === false)', () => {
    const activeRole: RoleLike = {
      name: 'Active',
      slug: 'active',
      priority: 10,
      isSystem: false,
      isActive: true,
      members: ['user-1'],
      moduleGrants: [],
      fieldGrants: [],
    };

    const inactiveRole: RoleLike = {
      name: 'Inactive',
      slug: 'inactive',
      priority: 20,
      isSystem: false,
      isActive: false,
      members: ['user-2'],
      moduleGrants: [],
      fieldGrants: [],
    };

    const doc = compile([activeRole, inactiveRole], mockCatalog, 0);
    expect(doc.roles).toHaveLength(1);
    expect(doc.roles[0].slug).toBe('active');
  });

  it('denormalizes all catalog modules with default false/none when omitted from role', () => {
    const role: RoleLike = {
      name: 'Partial Role',
      slug: 'partial-role',
      priority: 10,
      isSystem: false,
      isActive: true,
      members: ['user-1'],
      moduleGrants: [
        {
          module: 'tasks',
          create: true,
          read: true,
          update: true,
          delete: false,
          scope: 'team',
          operations: ['timer.start'],
        },
      ],
      fieldGrants: [],
    };

    const doc = compile([role], mockCatalog, 0);
    const compiledRole = doc.roles[0];

    // Explicit tasks grant
    expect(compiledRole.moduleGrants.tasks).toBeDefined();
    expect(compiledRole.moduleGrants.tasks.create).toBe(true);
    expect(compiledRole.moduleGrants.tasks.read).toBe(true);
    expect(compiledRole.moduleGrants.tasks.update).toBe(true);
    expect(compiledRole.moduleGrants.tasks.delete).toBe(false);
    expect(compiledRole.moduleGrants.tasks.scope).toBe('team');
    expect(compiledRole.moduleGrants.tasks.operations).toEqual(['timer.start']);

    // Omitted projects grant defaults to all false and scope 'none'
    expect(compiledRole.moduleGrants.projects).toBeDefined();
    expect(compiledRole.moduleGrants.projects.create).toBe(false);
    expect(compiledRole.moduleGrants.projects.read).toBe(false);
    expect(compiledRole.moduleGrants.projects.update).toBe(false);
    expect(compiledRole.moduleGrants.projects.delete).toBe(false);
    expect(compiledRole.moduleGrants.projects.scope).toBe('none');
    expect(compiledRole.moduleGrants.projects.operations).toEqual([]);
  });

  it('inherits field read and update from module when fieldGrants omitted', () => {
    const role: RoleLike = {
      name: 'Inheriting Role',
      slug: 'inheriting-role',
      priority: 10,
      isSystem: false,
      isActive: true,
      members: [],
      moduleGrants: [
        {
          module: 'tasks',
          create: true,
          read: true,
          update: true,
          delete: false,
          scope: 'all',
        },
      ],
      fieldGrants: [],
    };

    const doc = compile([role], mockCatalog, 0);
    const fields = doc.roles[0].moduleGrants.tasks.fields;

    expect(fields.title).toEqual({ field: 'title', read: true, update: true });
    expect(fields.status).toEqual({ field: 'status', read: true, update: true });
    expect(fields.priority).toEqual({ field: 'priority', read: true, update: true });
  });

  it('applies explicit fieldGrant overrides and enforces §8 invariants at compile time', () => {
    const role: RoleLike = {
      name: 'Restricted Role',
      slug: 'restricted-role',
      priority: 10,
      isSystem: false,
      isActive: true,
      members: [],
      moduleGrants: [
        {
          module: 'tasks',
          create: true,
          read: true,
          update: true,
          delete: false,
          scope: 'team',
        },
      ],
      fieldGrants: [
        // Surgical restriction: priority is read-only
        { module: 'tasks', field: 'priority', read: true, update: false },
        // Redacted field: status cannot be read
        { module: 'tasks', field: 'status', read: false, update: true }, // invariant should set update to false too!
      ],
    };

    const doc = compile([role], mockCatalog, 0);
    const fields = doc.roles[0].moduleGrants.tasks.fields;

    // title inherited: read true, update true
    expect(fields.title).toEqual({ field: 'title', read: true, update: true });

    // priority: read true, update false
    expect(fields.priority).toEqual({ field: 'priority', read: true, update: false });

    // status: read false, update false (even though raw update was true, update ⊆ field.read)
    expect(fields.status).toEqual({ field: 'status', read: false, update: false });
  });

  it('compiles against full MODULE_CATALOG by default', () => {
    const doc = compile([]);
    expect(doc.moduleCatalog).toEqual(MODULE_CATALOG);
    expect(doc.moduleCatalog.length).toBe(12);
  });
});
