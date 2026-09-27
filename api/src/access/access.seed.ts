import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Role, RoleDocument } from './schemas/role.schema';
import { User, UserDocument } from '../users/schemas/user.schema';
import { PolicyCompilerService } from './policy-compiler.service';
import { MODULE_CATALOG, getSensitiveFields, ModuleDef } from './catalog';

/**
 * AccessSeedService (Phase 0 — P0-07)
 *
 * Seeds the 5 default system roles on first boot according to §11 of
 * ACCESS_CONTROL_IMPLEMENTATION_PLAN.md and migrates all users with
 * `is_system_admin !== false` into the System Admin role's members list.
 */
@Injectable()
export class AccessSeedService {
  private readonly logger = new Logger(AccessSeedService.name);

  constructor(
    @InjectModel(Role.name)
    private readonly roleModel: Model<RoleDocument>,
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
    private readonly policyCompilerService: PolicyCompilerService,
  ) {}

  /**
   * Called during module initialization (same pattern as DayOffService.onModuleInit).
   */
  async seedDefaultRoles(): Promise<void> {
    try {
      const count = await this.roleModel.countDocuments();

      // Find all users with is_system_admin !== false
      const allUsers = await this.userModel.find().select('_id is_system_admin').exec();
      const adminUserIds = allUsers
        .filter((u) => u.is_system_admin !== false && u.is_system_admin !== undefined)
        .map((u) => u._id as Types.ObjectId);

      if (count === 0) {
        this.logger.log('Roles collection is empty. Seeding 5 default roles from plan §11...');
        await this.insertDefaultRoles(adminUserIds);
        await this.policyCompilerService.compileAndPersist();
        this.logger.log(
          `Seeded 5 default roles successfully with ${adminUserIds.length} System Admin member(s).`,
        );
      } else {
        // Idempotent migration: ensure existing admins are in System Admin members
        await this.syncSystemAdminMembers(adminUserIds);
        await this.syncEmployeeMembers();
      }
    } catch (err: any) {
      this.logger.error(`Failed to seed default access roles: ${err?.message || err}`, err?.stack);
    }
  }

  /**
   * Ensures all non-admin users have the default 'employee' role and links matching employee records.
   */
  private async syncEmployeeMembers(): Promise<void> {
    const employeeRole = await this.roleModel.findOne({ slug: 'employee' });
    if (!employeeRole) return;

    // Find all users who are not system admins
    const regularUsers = await this.userModel.find({ is_system_admin: { $ne: true } }).exec();
    const existingRoles = await this.roleModel.find({ isActive: true }).select('members').exec();

    // Map which users already have ANY role
    const usersWithAnyRole = new Set<string>();
    for (const r of existingRoles) {
      for (const m of r.members || []) {
        if (m) usersWithAnyRole.add(m.toString());
      }
    }

    let addedToEmployeeRole = 0;
    for (const u of regularUsers) {
      const uId = u._id.toString();
      if (!usersWithAnyRole.has(uId)) {
        employeeRole.members.push(u._id as Types.ObjectId);
        usersWithAnyRole.add(uId);
        addedToEmployeeRole++;
      }
    }

    if (addedToEmployeeRole > 0) {
      await employeeRole.save();
      await this.policyCompilerService.compileAndPersist();
      this.logger.log(`Assigned default 'employee' role to ${addedToEmployeeRole} regular user(s).`);
    }

    // Auto-link any unlinked Employee records matching a User email
    try {
      const employeesCollection = this.userModel.db.collection('employees');
      const unlinkedEmployees = await employeesCollection.find({ userId: { $in: [null, undefined] } }).toArray();
      let linkedCount = 0;

      for (const emp of unlinkedEmployees) {
        if (emp.email && typeof emp.email === 'string' && emp.email.trim()) {
          const cleanEmail = emp.email.trim();
          const matchingUser = await this.userModel.findOne({
            email: { $regex: new RegExp(`^${cleanEmail}$`, 'i') },
          }).exec();

          if (matchingUser) {
            await employeesCollection.updateOne(
              { _id: emp._id },
              { $set: { userId: matchingUser._id } },
            );
            await this.userModel.updateOne(
              { _id: matchingUser._id },
              { $set: { is_employee: true } },
            );
            linkedCount++;
          }
        }
      }

      if (linkedCount > 0) {
        this.logger.log(`Auto-linked ${linkedCount} unlinked employee record(s) to user accounts.`);
      }
    } catch (err: any) {
      this.logger.warn(`Failed during employee sync: ${err?.message || err}`);
    }
  }

  /**
   * Ensures all users with is_system_admin !== false are added to System Admin role.
   */
  private async syncSystemAdminMembers(adminUserIds: Types.ObjectId[]): Promise<void> {
    const sysAdminRole = await this.roleModel.findOne({ slug: 'system-admin' });
    if (!sysAdminRole) return;

    const existingMemberSet = new Set(
      sysAdminRole.members.map((m) => (m ? m.toString() : '')),
    );

    let addedCount = 0;
    for (const adminId of adminUserIds) {
      if (!existingMemberSet.has(adminId.toString())) {
        sysAdminRole.members.push(adminId);
        existingMemberSet.add(adminId.toString());
        addedCount++;
      }
    }

    if (addedCount > 0) {
      await sysAdminRole.save();
      await this.policyCompilerService.compileAndPersist();
      this.logger.log(`Synced ${addedCount} new system admin(s) into System Admin role.`);
    }
  }

  private async insertDefaultRoles(adminUserIds: Types.ObjectId[]): Promise<void> {
    const defaultRoles = buildDefaultRoles(adminUserIds);
    await this.roleModel.insertMany(defaultRoles);
  }
}

/**
 * Builds the 5 seeded roles defined in §11.
 * Exported for testing, compilation scripts, and bootstrapping.
 */
export function buildDefaultRoles(adminUserIds: any[] = []): any[] {
  const sensitiveEmployeeFields = getSensitiveFields('employees');

  return [
    // ── 1. System Admin (Priority 1000) ────────────────────────────────────
    {
      name: 'System Admin',
      slug: 'system-admin',
        description: 'Full access to all system modules, configuration, and user roles.',
        color: '#dc2626',
        priority: 1000,
        isSystem: true,
        isActive: true,
        members: adminUserIds,
        moduleGrants: MODULE_CATALOG.map((m: ModuleDef) => ({
          module: m.id,
          create: m.actions.includes('create'),
          read: m.actions.includes('read') || m.actions.length > 0,
          update: m.actions.includes('update'),
          delete: m.actions.includes('delete'),
          scope: 'all' as const,
          operations: m.actions.filter(
            (a) => !['create', 'read', 'update', 'delete'].includes(a),
          ),
        })),
        fieldGrants: [],
      },

      // ── 2. Admin (Priority 100) ───────────────────────────────────────────
      {
        name: 'Admin',
        slug: 'admin',
        description: 'Full operational access across tasks, projects, teams, employees, and settings.',
        color: '#7c3aed',
        priority: 100,
        isSystem: true,
        isActive: true,
        members: [],
        moduleGrants: MODULE_CATALOG.map((m: ModuleDef) => ({
          module: m.id,
          create: m.actions.includes('create'),
          read: m.actions.includes('read') || m.actions.length > 0,
          update: m.actions.includes('update'),
          // Lock roles.delete on Admin per §11
          delete: m.id === 'roles' ? false : m.actions.includes('delete'),
          scope: 'all' as const,
          operations: m.actions.filter(
            (a) => !['create', 'read', 'update', 'delete'].includes(a),
          ),
        })),
        fieldGrants: [],
      },

      // ── 3. Manager (Priority 60) ──────────────────────────────────────────
      {
        name: 'Manager',
        slug: 'manager',
        description: 'Team and department management, task oversight, and leave approvals.',
        color: '#2563eb',
        priority: 60,
        isSystem: true,
        isActive: true,
        members: [],
        moduleGrants: [
          { module: 'dashboard', create: false, read: true, update: false, delete: false, scope: 'all', operations: [] },
          { module: 'tasks', create: true, read: true, update: true, delete: true, scope: 'team', operations: ['timer.start', 'timer.stop'] },
          { module: 'projects', create: true, read: true, update: true, delete: true, scope: 'all', operations: [] },
          { module: 'timeline', create: false, read: true, update: false, delete: false, scope: 'team', operations: [] },
          { module: 'teams', create: true, read: true, update: true, delete: true, scope: 'all', operations: [] },
          { module: 'employees', create: false, read: true, update: true, delete: false, scope: 'all', operations: [] },
          { module: 'users', create: false, read: true, update: false, delete: false, scope: 'all', operations: [] },
          { module: 'roles', create: false, read: false, update: false, delete: false, scope: 'none', operations: [] },
          { module: 'dayoff', create: true, read: true, update: true, delete: true, scope: 'own', operations: ['cancel'] },
          { module: 'dayoff.approvals', create: false, read: true, update: false, delete: false, scope: 'team', operations: ['approve', 'reject'] },
          { module: 'dayoff.policies', create: false, read: true, update: false, delete: false, scope: 'all', operations: [] },
          { module: 'chatbot', create: false, read: false, update: false, delete: false, scope: 'all', operations: ['use'] },
        ],
        fieldGrants: sensitiveEmployeeFields.map((fKey) => ({
          module: 'employees',
          field: fKey,
          read: false,
          update: false,
        })),
      },

      // ── 4. Team Leader (Priority 40) ──────────────────────────────────────
      {
        name: 'Team Leader',
        slug: 'team-leader',
        description: 'Team coordination, task tracking, and leave review for assigned teams.',
        color: '#059669',
        priority: 40,
        isSystem: true,
        isActive: true,
        members: [],
        moduleGrants: [
          { module: 'dashboard', create: false, read: true, update: false, delete: false, scope: 'team', operations: [] },
          { module: 'tasks', create: true, read: true, update: true, delete: true, scope: 'team', operations: ['timer.start', 'timer.stop'] },
          { module: 'projects', create: false, read: true, update: true, delete: false, scope: 'team', operations: [] },
          { module: 'timeline', create: false, read: true, update: false, delete: false, scope: 'team', operations: [] },
          { module: 'teams', create: false, read: true, update: false, delete: false, scope: 'team', operations: [] },
          { module: 'employees', create: false, read: true, update: false, delete: false, scope: 'team', operations: [] },
          { module: 'users', create: false, read: false, update: false, delete: false, scope: 'none', operations: [] },
          { module: 'roles', create: false, read: false, update: false, delete: false, scope: 'none', operations: [] },
          { module: 'dayoff', create: true, read: true, update: true, delete: true, scope: 'own', operations: ['cancel'] },
          { module: 'dayoff.approvals', create: false, read: true, update: false, delete: false, scope: 'team', operations: ['approve', 'reject'] },
          { module: 'dayoff.policies', create: false, read: true, update: false, delete: false, scope: 'all', operations: [] },
          { module: 'chatbot', create: false, read: false, update: false, delete: false, scope: 'all', operations: ['use'] },
        ],
        fieldGrants: sensitiveEmployeeFields.map((fKey) => ({
          module: 'employees',
          field: fKey,
          read: false,
          update: false,
        })),
      },

      // ── 5. Employee (Priority 10) ─────────────────────────────────────────
      {
        name: 'Employee',
        slug: 'employee',
        description: 'Individual contributor access to own tasks, projects, and leave requests.',
        color: '#64748b',
        priority: 10,
        isSystem: true,
        isActive: true,
        members: [],
        moduleGrants: [
          { module: 'dashboard', create: false, read: true, update: false, delete: false, scope: 'own', operations: [] },
          { module: 'tasks', create: true, read: true, update: true, delete: false, scope: 'own', operations: ['timer.start', 'timer.stop'] },
          { module: 'projects', create: false, read: true, update: false, delete: false, scope: 'own', operations: [] },
          { module: 'timeline', create: false, read: true, update: false, delete: false, scope: 'own', operations: [] },
          { module: 'teams', create: false, read: false, update: false, delete: false, scope: 'none', operations: [] },
          { module: 'employees', create: false, read: true, update: false, delete: false, scope: 'own', operations: [] },
          { module: 'users', create: false, read: false, update: false, delete: false, scope: 'none', operations: [] },
          { module: 'roles', create: false, read: false, update: false, delete: false, scope: 'none', operations: [] },
          { module: 'dayoff', create: true, read: true, update: true, delete: true, scope: 'own', operations: ['cancel'] },
          { module: 'dayoff.approvals', create: false, read: false, update: false, delete: false, scope: 'none', operations: [] },
          { module: 'dayoff.policies', create: false, read: true, update: false, delete: false, scope: 'all', operations: [] },
          { module: 'chatbot', create: false, read: false, update: false, delete: false, scope: 'all', operations: ['use'] },
        ],
        fieldGrants: sensitiveEmployeeFields.map((fKey) => ({
          module: 'employees',
          field: fKey,
          read: false,
          update: false,
        })),
      },
    ];
}
