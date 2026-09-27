/**
 * Policy Decision Point (PDP) Unit Tests (Phase 0 — P0-05)
 *
 * References:
 *   ACCESS_CONTROL_IMPLEMENTATION_PLAN.md:
 *     §6 — Relationship-based scope (ReBAC)
 *     §7 — Multi-role merge & priority (specifically §7.3 worked example)
 *     §8 — Conflict protection: module vs field invariant table (all 8 rows)
 */

import { can, Subject, ResourceContext, maxScope, SCOPE_RANK } from './policy.engine';
import { compile, RoleLike } from './policy.compiler';
import { ModuleDef } from './catalog';

describe('Policy Engine (PDP — can)', () => {
  const testCatalog: ModuleDef[] = [
    {
      id: 'tasks',
      label: 'Tasks',
      description: 'Tasks module',
      uiRoutes: ['/tasks'],
      primaryModel: 'Task',
      relationships: ['owner', 'assignee', 'member'],
      actions: ['create', 'read', 'update', 'delete', 'timer.start'],
      fields: [
        { key: 'title', label: 'Title' },
        { key: 'status', label: 'Status' },
        { key: 'priority', label: 'Priority' },
        { key: 'description', label: 'Description' },
      ],
    },
    {
      id: 'employees',
      label: 'Employees',
      description: 'Employees module',
      uiRoutes: ['/configuration/employees'],
      primaryModel: 'Employee',
      relationships: ['self', 'team_member', 'all'],
      actions: ['create', 'read', 'update', 'delete'],
      fields: [
        { key: 'fullName', label: 'Full Name' },
        { key: 'email', label: 'Email' },
        { key: 'baseSalary', label: 'Base Salary', sensitive: true },
      ],
    },
  ];

  // ───────────────────────────────────────────────────────────────────────────
  // §7.3 Multi-role merge worked example
  // ───────────────────────────────────────────────────────────────────────────
  describe('§7.3 Multi-role merge (Employee + Team Leader)', () => {
    it('Employee(10, scope own, priority update=true) + TeamLeader(40, scope team, priority update=false) ⇒ scope team, priority update=true', () => {
      const employeeRole: RoleLike = {
        name: 'Employee',
        slug: 'employee',
        priority: 10,
        isSystem: false,
        isActive: true,
        members: ['user-raj'],
        moduleGrants: [
          {
            module: 'tasks',
            create: false,
            read: true,
            update: true,
            delete: false,
            scope: 'own',
          },
        ],
        fieldGrants: [
          // Employee can update priority
          { module: 'tasks', field: 'priority', read: true, update: true },
        ],
      };

      const teamLeaderRole: RoleLike = {
        name: 'Team Leader',
        slug: 'team-leader',
        priority: 40,
        isSystem: false,
        isActive: true,
        members: ['user-raj'],
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
          // Team leader role restricts priority update to false
          { module: 'tasks', field: 'priority', read: true, update: false },
        ],
      };

      const policy = compile([employeeRole, teamLeaderRole], testCatalog);
      const subject: Subject = { userId: 'user-raj' };

      const decision = can(subject, 'update', 'tasks', undefined, policy);

      // Additive OR: access is granted
      expect(decision.allow).toBe(true);

      // MAX scope rank: 'team' > 'own'
      expect(decision.scope).toBe('team');

      // Additive OR across roles: Employee (update: true) || TeamLeader (update: false) === true
      // Team Leader's field restriction does NOT remove Employee's grant
      expect(decision.updatableFields).toContain('priority');
      expect(decision.readableFields).toContain('priority');
    });

    it('unions operations arrays across multiple roles', () => {
      const role1: RoleLike = {
        name: 'Role 1',
        slug: 'role-1',
        priority: 10,
        isSystem: false,
        isActive: true,
        members: ['user-1'],
        moduleGrants: [
          {
            module: 'tasks',
            create: false,
            read: true,
            update: false,
            delete: false,
            scope: 'own',
            operations: ['timer.start'],
          },
        ],
        fieldGrants: [],
      };

      const role2: RoleLike = {
        name: 'Role 2',
        slug: 'role-2',
        priority: 20,
        isSystem: false,
        isActive: true,
        members: ['user-1'],
        moduleGrants: [
          {
            module: 'tasks',
            create: false,
            read: true,
            update: false,
            delete: false,
            scope: 'team',
            operations: ['export'],
          },
        ],
        fieldGrants: [],
      };

      const policy = compile([role1, role2], testCatalog);
      const subject: Subject = { userId: 'user-1' };

      const d1 = can(subject, 'timer.start', 'tasks', undefined, policy);
      expect(d1.allow).toBe(true);

      const d2 = can(subject, 'export', 'tasks', undefined, policy);
      expect(d2.allow).toBe(true);

      const d3 = can(subject, 'non.existent', 'tasks', undefined, policy);
      expect(d3.allow).toBe(false);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // §8 Conflict protection: module vs field invariant table (all 8 rows)
  // ───────────────────────────────────────────────────────────────────────────
  describe('§8 Invariant table (all 8 rows)', () => {
    // Row 1: Module read=false, field read=true ⇒ Field read false. Cannot view a field of a hidden module.
    it('Row 1: module read=false, field read=true ⇒ field read=false, field in hiddenFields', () => {
      const role: RoleLike = {
        name: 'Test Role',
        slug: 'test-role',
        priority: 10,
        isSystem: false,
        isActive: true,
        members: ['user-1'],
        moduleGrants: [
          {
            module: 'tasks',
            create: false,
            read: false,
            update: false,
            delete: false,
            scope: 'none',
          },
        ],
        fieldGrants: [
          { module: 'tasks', field: 'title', read: true, update: false },
        ],
      };

      const policy = compile([role], testCatalog);
      const subject: Subject = { userId: 'user-1' };
      const decision = can(subject, 'read', 'tasks', undefined, policy);

      expect(decision.allow).toBe(false);
      expect(decision.readableFields).not.toContain('title');
      expect(decision.hiddenFields).toContain('title');
    });

    // Row 2: Module read=true, field read=false ⇒ Field hidden (redacted). Module still listed.
    it('Row 2: module read=true, field read=false ⇒ field hidden (redacted)', () => {
      const role: RoleLike = {
        name: 'Manager',
        slug: 'manager',
        priority: 10,
        isSystem: false,
        isActive: true,
        members: ['user-1'],
        moduleGrants: [
          {
            module: 'employees',
            create: false,
            read: true,
            update: false,
            delete: false,
            scope: 'all',
          },
        ],
        fieldGrants: [
          // Base salary is explicitly unreadable (sensitive)
          { module: 'employees', field: 'baseSalary', read: false, update: false },
        ],
      };

      const policy = compile([role], testCatalog);
      const subject: Subject = { userId: 'user-1' };
      const decision = can(subject, 'read', 'employees', undefined, policy);

      expect(decision.allow).toBe(true);
      expect(decision.readableFields).toContain('fullName');
      expect(decision.readableFields).toContain('email');
      expect(decision.readableFields).not.toContain('baseSalary');
      expect(decision.hiddenFields).toContain('baseSalary');
      expect(decision.updatableFields).not.toContain('baseSalary');
    });

    // Row 3: Module update=false, field update=true ⇒ Field update false.
    it('Row 3: module update=false, field update=true ⇒ field update=false', () => {
      const role: RoleLike = {
        name: 'Viewer',
        slug: 'viewer',
        priority: 10,
        isSystem: false,
        isActive: true,
        members: ['user-1'],
        moduleGrants: [
          {
            module: 'tasks',
            create: false,
            read: true,
            update: false,
            delete: false,
            scope: 'all',
          },
        ],
        fieldGrants: [
          // Malformed / optimistic grant: field update true while module update false
          { module: 'tasks', field: 'title', read: true, update: true },
        ],
      };

      const policy = compile([role], testCatalog);
      const subject: Subject = { userId: 'user-1' };

      const updateDecision = can(subject, 'update', 'tasks', undefined, policy);
      expect(updateDecision.allow).toBe(false);
      expect(updateDecision.updatableFields).not.toContain('title');

      const readDecision = can(subject, 'read', 'tasks', undefined, policy);
      expect(readDecision.allow).toBe(true);
      expect(readDecision.readableFields).toContain('title');
      expect(readDecision.updatableFields).not.toContain('title');
    });

    // Row 4: Module update=true, field update=false ⇒ Field is read-only; PATCH denied.
    it('Row 4: module update=true, field update=false ⇒ field is read-only (surgical restriction)', () => {
      const role: RoleLike = {
        name: 'Editor',
        slug: 'editor',
        priority: 10,
        isSystem: false,
        isActive: true,
        members: ['user-1'],
        moduleGrants: [
          {
            module: 'tasks',
            create: false,
            read: true,
            update: true,
            delete: false,
            scope: 'all',
          },
        ],
        fieldGrants: [
          // Surgical restriction: priority is view-only
          { module: 'tasks', field: 'priority', read: true, update: false },
        ],
      };

      const policy = compile([role], testCatalog);
      const subject: Subject = { userId: 'user-1' };
      const decision = can(subject, 'update', 'tasks', undefined, policy);

      expect(decision.allow).toBe(true);
      expect(decision.readableFields).toContain('priority');
      expect(decision.updatableFields).not.toContain('priority');
      expect(decision.updatableFields).toContain('title'); // title inherits update=true
    });

    // Row 5: Module update=true, field omitted ⇒ inherit ⇒ Field updatable.
    it('Row 5: module update=true, field omitted ⇒ inherit ⇒ field updatable', () => {
      const role: RoleLike = {
        name: 'Admin',
        slug: 'admin',
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
            delete: true,
            scope: 'all',
          },
        ],
        fieldGrants: [], // no explicit field grants
      };

      const policy = compile([role], testCatalog);
      const subject: Subject = { userId: 'user-1' };
      const decision = can(subject, 'update', 'tasks', undefined, policy);

      expect(decision.allow).toBe(true);
      expect(decision.updatableFields).toContain('title');
      expect(decision.updatableFields).toContain('status');
      expect(decision.updatableFields).toContain('priority');
      expect(decision.updatableFields).toContain('description');
      expect(decision.hiddenFields).toHaveLength(0);
    });

    // Row 6: Module read=false, any ⇒ Entire module 403; no field UI.
    it('Row 6: module read=false ⇒ entire module denied, all fields hidden', () => {
      const role: RoleLike = {
        name: 'No Access',
        slug: 'no-access',
        priority: 10,
        isSystem: false,
        isActive: true,
        members: ['user-1'],
        moduleGrants: [],
        fieldGrants: [],
      };

      const policy = compile([role], testCatalog);
      const subject: Subject = { userId: 'user-1' };
      const decision = can(subject, 'read', 'tasks', undefined, policy);

      expect(decision.allow).toBe(false);
      expect(decision.readableFields).toHaveLength(0);
      expect(decision.updatableFields).toHaveLength(0);
      expect(decision.hiddenFields).toEqual(
        expect.arrayContaining(['title', 'status', 'priority', 'description']),
      );
    });

    // Row 7: Module create=false ⇒ POST / create denied. Create is module-only.
    it('Row 7: module create=false ⇒ create denied', () => {
      const role: RoleLike = {
        name: 'No Create',
        slug: 'no-create',
        priority: 10,
        isSystem: false,
        isActive: true,
        members: ['user-1'],
        moduleGrants: [
          {
            module: 'tasks',
            create: false,
            read: true,
            update: true,
            delete: false,
            scope: 'all',
          },
        ],
        fieldGrants: [],
      };

      const policy = compile([role], testCatalog);
      const subject: Subject = { userId: 'user-1' };

      const createDecision = can(subject, 'create', 'tasks', undefined, policy);
      expect(createDecision.allow).toBe(false);

      const readDecision = can(subject, 'read', 'tasks', undefined, policy);
      expect(readDecision.allow).toBe(true);
    });

    // Row 8: Module delete=false ⇒ DELETE denied. Delete is module-only.
    it('Row 8: module delete=false ⇒ delete denied', () => {
      const role: RoleLike = {
        name: 'No Delete',
        slug: 'no-delete',
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
            scope: 'all',
          },
        ],
        fieldGrants: [],
      };

      const policy = compile([role], testCatalog);
      const subject: Subject = { userId: 'user-1' };

      const deleteDecision = can(subject, 'delete', 'tasks', undefined, policy);
      expect(deleteDecision.allow).toBe(false);

      const updateDecision = can(subject, 'update', 'tasks', undefined, policy);
      expect(updateDecision.allow).toBe(true);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Scope Rank: none < own < team < all
  // ───────────────────────────────────────────────────────────────────────────
  describe('Scope ranking hierarchy', () => {
    it('maxScope picks highest rank correctly', () => {
      expect(SCOPE_RANK.none).toBeLessThan(SCOPE_RANK.own);
      expect(SCOPE_RANK.own).toBeLessThan(SCOPE_RANK.team);
      expect(SCOPE_RANK.team).toBeLessThan(SCOPE_RANK.all);

      expect(maxScope('none', 'own')).toBe('own');
      expect(maxScope('own', 'team')).toBe('team');
      expect(maxScope('team', 'all')).toBe('all');
      expect(maxScope('all', 'team')).toBe('all');
      expect(maxScope('own', 'none')).toBe('own');
      expect(maxScope('none', 'none')).toBe('none');
    });

    it('merges multi-role scopes by picking the widest scope for the action', () => {
      const makeRole = (slug: string, scope: 'none' | 'own' | 'team' | 'all'): RoleLike => ({
        name: slug,
        slug,
        priority: 10,
        isSystem: false,
        isActive: true,
        members: ['user-1'],
        moduleGrants: [
          {
            module: 'tasks',
            create: false,
            read: true,
            update: false,
            delete: false,
            scope,
          },
        ],
        fieldGrants: [],
      });

      const policyNoneOwn = compile([makeRole('r1', 'none'), makeRole('r2', 'own')], testCatalog);
      expect(can({ userId: 'user-1' }, 'read', 'tasks', undefined, policyNoneOwn).scope).toBe('own');

      const policyOwnTeam = compile([makeRole('r1', 'own'), makeRole('r2', 'team')], testCatalog);
      expect(can({ userId: 'user-1' }, 'read', 'tasks', undefined, policyOwnTeam).scope).toBe('team');

      const policyTeamAll = compile([makeRole('r1', 'team'), makeRole('r2', 'all')], testCatalog);
      expect(can({ userId: 'user-1' }, 'read', 'tasks', undefined, policyTeamAll).scope).toBe('all');
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Record-level relationship check (ReBAC)
  // ───────────────────────────────────────────────────────────────────────────
  describe('Record-level relationship checks (§6)', () => {
    const makePolicyWithScope = (scope: 'none' | 'own' | 'team' | 'all') =>
      compile(
        [
          {
            name: `Role ${scope}`,
            slug: `role-${scope}`,
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
                delete: true,
                scope,
              },
            ],
            fieldGrants: [],
          },
        ],
        testCatalog,
      );

    const subject: Subject = {
      userId: 'user-1',
      email: 'user1@example.com',
      teamIds: ['team-alpha'],
    };

    it('scope=none always denies resource access', () => {
      const policy = makePolicyWithScope('none');
      const resource: ResourceContext = { userId: 'user-1' };
      const decision = can(subject, 'read', 'tasks', resource, policy);
      expect(decision.allow).toBe(false);
    });

    it('scope=own allows own task (by userId, assigneeEmail, memberIds)', () => {
      const policy = makePolicyWithScope('own');

      // Own by creator/userId
      expect(can(subject, 'read', 'tasks', { userId: 'user-1' }, policy).allow).toBe(true);

      // Own by assigneeId
      expect(can(subject, 'read', 'tasks', { assigneeId: 'user-1' }, policy).allow).toBe(true);

      // Own by assigneeEmail
      expect(
        can(subject, 'read', 'tasks', { assigneeEmail: 'user1@example.com' }, policy).allow,
      ).toBe(true);

      // Own by memberIds
      expect(
        can(subject, 'read', 'tasks', { memberIds: ['user-1', 'other-user'] }, policy).allow,
      ).toBe(true);

      // Denies other user's record
      expect(
        can(subject, 'read', 'tasks', { userId: 'user-999', assigneeEmail: 'other@example.com' }, policy).allow,
      ).toBe(false);
    });

    it('scope=team allows same team records and own records, denies foreign team', () => {
      const policy = makePolicyWithScope('team');

      // Same team record
      expect(
        can(subject, 'read', 'tasks', { userId: 'user-other', teamId: 'team-alpha' }, policy).allow,
      ).toBe(true);

      // Own record (team scope includes own)
      expect(
        can(subject, 'read', 'tasks', { userId: 'user-1', teamId: 'other-team' }, policy).allow,
      ).toBe(true);

      // Foreign team and not own
      expect(
        can(subject, 'read', 'tasks', { userId: 'user-other', teamId: 'team-beta' }, policy).allow,
      ).toBe(false);
    });

    it('scope=all allows any record', () => {
      const policy = makePolicyWithScope('all');
      const foreignResource: ResourceContext = { userId: 'user-other', teamId: 'foreign-team' };
      expect(can(subject, 'read', 'tasks', foreignResource, policy).allow).toBe(true);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Defensive Guards & Edge Cases
  // ───────────────────────────────────────────────────────────────────────────
  describe('Defensive guards & edge cases', () => {
    it('returns allow=false if policy is missing', () => {
      const decision = can({ userId: 'user-1' }, 'read', 'tasks');
      expect(decision.allow).toBe(false);
      expect(decision.reason).toBe('No policy document provided');
    });

    it('returns allow=false if subject has no active roles', () => {
      const policy = compile([], testCatalog);
      const decision = can({ userId: 'unassigned-user' }, 'read', 'tasks', undefined, policy);
      expect(decision.allow).toBe(false);
      expect(decision.reason).toBe('No active roles assigned to subject');
      expect(decision.hiddenFields.length).toBeGreaterThan(0);
    });

    it('matches subject by roleIds or role slugs', () => {
      const role: RoleLike = {
        name: 'Manager',
        slug: 'manager',
        priority: 50,
        isSystem: false,
        isActive: true,
        members: [], // empty members
        moduleGrants: [
          {
            module: 'tasks',
            create: true,
            read: true,
            update: true,
            delete: true,
            scope: 'all',
          },
        ],
        fieldGrants: [],
      };

      const policy = compile([role], testCatalog);
      const subject: Subject = { userId: 'user-1', roles: ['manager'] };
      const decision = can(subject, 'read', 'tasks', undefined, policy);
      expect(decision.allow).toBe(true);
    });

    it('matches system admin break-glass if isSystemAdmin=true', () => {
      const sysAdminRole: RoleLike = {
        name: 'System Admin',
        slug: 'system-admin',
        priority: 1000,
        isSystem: true,
        isActive: true,
        members: [],
        moduleGrants: [
          {
            module: 'tasks',
            create: true,
            read: true,
            update: true,
            delete: true,
            scope: 'all',
          },
        ],
        fieldGrants: [],
      };

      const policy = compile([sysAdminRole], testCatalog);
      const subject: Subject = { userId: 'break-glass-user', isSystemAdmin: true };
      const decision = can(subject, 'create', 'tasks', undefined, policy);
      expect(decision.allow).toBe(true);
      expect(decision.scope).toBe('all');
    });
  });
});
