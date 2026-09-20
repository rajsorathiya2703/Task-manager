import { Injectable, NotFoundException, BadRequestException, Logger, Optional } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { UserGroup } from './schemas/user-group.schema';
import { PermissionAuditLog, AuditAction } from './schemas/permission-audit-log.schema';
import { User, UserDocument } from '../users/schemas/user.schema';
import {
  CATALOG_MODULES,
  CATALOG_OPERATIONS,
  CATALOG_MODELS_AND_FIELDS,
  PERMISSION_CATALOG,
} from '../permissions/permissions.catalog';
import {
  resolveEffective,
  EffectivePermissions,
  canAny,
  isUnrestricted,
  PermissionCheck,
} from '../permissions/permission-resolver';
import { PermissionCacheService } from '../permissions/permission-cache.service';
import { CreateUserGroupDto } from './dto/create-user-group.dto';
import { UpdateUserGroupDto } from './dto/update-user-group.dto';

@Injectable()
export class UserGroupsService {
  private readonly logger = new Logger(UserGroupsService.name);
  private auditLogModel?: Model<PermissionAuditLog>;

  constructor(
    @InjectModel(UserGroup.name) private userGroupModel: Model<UserGroup>,
    @Optional()
    @InjectModel(PermissionAuditLog.name)
    auditLogModelOrCache?: Model<PermissionAuditLog> | PermissionCacheService,
    @Optional() @InjectModel(User.name) private userModel?: Model<UserDocument>,
    @Optional() private permissionCacheService?: PermissionCacheService,
  ) {
    if (
      auditLogModelOrCache &&
      'invalidate' in (auditLogModelOrCache as any) &&
      typeof (auditLogModelOrCache as any).invalidate === 'function'
    ) {
      this.permissionCacheService = auditLogModelOrCache as PermissionCacheService;
      this.auditLogModel = undefined;
    } else {
      this.auditLogModel = auditLogModelOrCache as Model<PermissionAuditLog>;
    }
  }

  async ensureDefaultGroups(): Promise<{ adminGroup: UserGroup; employeeGroup: UserGroup }> {
    const adminModules = ['tasks', 'projects', 'employees', 'teams', 'dayoff', 'reports', 'settings', 'users', 'user-groups'];
    const adminModulePermissions = adminModules.map((module) => ({
      module,
      create: true,
      read: true,
      update: true,
      delete: true,
      scope: 'all' as const,
    }));
    const adminPermissions = adminModules.flatMap((m) => [
      `${m}:manage`,
      `${m}:create`,
      `${m}:read`,
      `${m}:update`,
      `${m}:delete`,
      `${m}:view`,
    ]);

    const allOperations = [
      { module: 'tasks', operation: 'tasks.core' },
      { module: 'tasks', operation: 'tasks.comments' },
      { module: 'tasks', operation: 'tasks.attachments' },
      { module: 'tasks', operation: 'tasks.time_tracking' },
      { module: 'tasks', operation: 'tasks.assignment' },
      { module: 'projects', operation: 'projects.core' },
      { module: 'projects', operation: 'projects.milestones' },
      { module: 'projects', operation: 'projects.team' },
      { module: 'projects', operation: 'projects.documents' },
      { module: 'employees', operation: 'employees.directory' },
      { module: 'employees', operation: 'employees.profile' },
      { module: 'employees', operation: 'employees.compensation' },
      { module: 'employees', operation: 'employees.status' },
      { module: 'teams', operation: 'teams.core' },
      { module: 'teams', operation: 'teams.members' },
      { module: 'teams', operation: 'teams.leads' },
      { module: 'dayoff', operation: 'dayoff.requests' },
      { module: 'dayoff', operation: 'dayoff.approvals' },
      { module: 'dayoff', operation: 'dayoff.policies' },
      { module: 'dayoff', operation: 'dayoff.calendar' },
      { module: 'reports', operation: 'reports.view' },
      { module: 'reports', operation: 'reports.export' },
      { module: 'reports', operation: 'reports.timesheets' },
      { module: 'users', operation: 'users.manage' },
      { module: 'users', operation: 'users.core' },
      { module: 'user-groups', operation: 'user-groups.manage' },
      { module: 'user-groups', operation: 'user-groups.core' },
      { module: 'settings', operation: 'settings.users' },
      { module: 'settings', operation: 'settings.user_groups' },
      { module: 'settings', operation: 'settings.system' },
    ];

    const adminOperationPermissions = allOperations.map((op) => ({
      ...op,
      read: true,
      write: true,
      update: true,
      delete: true,
    }));

    let adminGroup = await this.userGroupModel.findOne({
      name: { $regex: /^administrators$/i },
    }).exec();

    if (!adminGroup) {
      adminGroup = await this.userGroupModel.create({
        name: 'Administrators',
        description: 'System administrators with full unrestricted access to all modules and operations',
        color: '#ef4444',
        members: [],
        permissions: adminPermissions,
        modulePermissions: adminModulePermissions,
        operationPermissions: adminOperationPermissions,
      });
      this.logger.log('Created default "Administrators" user group.');
    } else {
      const hasUsers = adminGroup.modulePermissions?.some((mp) => mp.module === 'users');
      const missingAdminScope = adminGroup.modulePermissions?.some((mp) => mp.scope !== 'all');
      if (!hasUsers || missingAdminScope || !adminGroup.operationPermissions || adminGroup.operationPermissions.length === 0) {
        adminGroup.permissions = adminPermissions;
        adminGroup.modulePermissions = adminModulePermissions;
        adminGroup.operationPermissions = adminOperationPermissions;
        if (typeof (adminGroup as any).save === 'function') {
          await (adminGroup as any).save();
        }
        this.logger.log('Synchronized permissions on existing "Administrators" user group.');
      }
    }

    const employeeModulePermissions = [
      { module: 'tasks', create: true, read: true, update: true, delete: true, scope: 'own' as const },
      { module: 'projects', create: true, read: true, update: true, delete: false, scope: 'own' as const },
      { module: 'teams', create: true, read: true, update: true, delete: false, scope: 'team' as const },
      { module: 'employees', create: false, read: true, update: false, delete: false, scope: 'own' as const },
      { module: 'dayoff', create: true, read: true, update: true, delete: true, scope: 'own' as const },
      { module: 'reports', create: false, read: true, update: false, delete: false, scope: 'own' as const },
      { module: 'settings', create: false, read: false, update: false, delete: false, scope: 'own' as const },
      { module: 'users', create: false, read: false, update: false, delete: false, scope: 'own' as const },
      { module: 'user-groups', create: false, read: false, update: false, delete: false, scope: 'own' as const },
    ];
    const employeePermissions = [
      'tasks:create', 'tasks:read', 'tasks:update', 'tasks:delete',
      'projects:create', 'projects:read', 'projects:update',
      'teams:create', 'teams:read', 'teams:update',
      'employees:read', 'employees:view',
      'dayoff:create', 'dayoff:read', 'dayoff:update', 'dayoff:delete',
      'reports:read', 'reports:view',
    ];

    const employeeOperationPermissions = [
      // Tasks
      { module: 'tasks', operation: 'tasks.core', read: true, write: true, update: true, delete: true },
      { module: 'tasks', operation: 'tasks.comments', read: true, write: true, update: true, delete: true },
      { module: 'tasks', operation: 'tasks.attachments', read: true, write: true, update: true, delete: true },
      { module: 'tasks', operation: 'tasks.time_tracking', read: true, write: true, update: true, delete: true },
      { module: 'tasks', operation: 'tasks.assignment', read: true, write: true, update: true, delete: true },
      // Projects
      { module: 'projects', operation: 'projects.core', read: true, write: true, update: true, delete: false },
      { module: 'projects', operation: 'projects.milestones', read: true, write: true, update: true, delete: false },
      { module: 'projects', operation: 'projects.team', read: true, write: true, update: true, delete: false },
      { module: 'projects', operation: 'projects.documents', read: true, write: true, update: true, delete: false },
      // Employees
      { module: 'employees', operation: 'employees.directory', read: true, write: false, update: false, delete: false },
      { module: 'employees', operation: 'employees.profile', read: true, write: false, update: false, delete: false },
      { module: 'employees', operation: 'employees.compensation', read: false, write: false, update: false, delete: false },
      { module: 'employees', operation: 'employees.status', read: true, write: false, update: false, delete: false },
      // Teams
      { module: 'teams', operation: 'teams.core', read: true, write: true, update: true, delete: false },
      { module: 'teams', operation: 'teams.members', read: true, write: true, update: true, delete: false },
      { module: 'teams', operation: 'teams.leads', read: true, write: true, update: true, delete: false },
      // Day Off
      { module: 'dayoff', operation: 'dayoff.requests', read: true, write: true, update: true, delete: true },
      { module: 'dayoff', operation: 'dayoff.calendar', read: true, write: false, update: false, delete: false },
      { module: 'dayoff', operation: 'dayoff.approvals', read: false, write: false, update: false, delete: false },
      { module: 'dayoff', operation: 'dayoff.policies', read: false, write: false, update: false, delete: false },
      // Reports
      { module: 'reports', operation: 'reports.view', read: true, write: false, update: false, delete: false },
      { module: 'reports', operation: 'reports.export', read: false, write: false, update: false, delete: false },
      { module: 'reports', operation: 'reports.timesheets', read: true, write: false, update: false, delete: false },
      // Users & User-groups (Strictly no access for standard employees)
      { module: 'users', operation: 'users.manage', read: false, write: false, update: false, delete: false },
      { module: 'users', operation: 'users.core', read: false, write: false, update: false, delete: false },
      { module: 'user-groups', operation: 'user-groups.manage', read: false, write: false, update: false, delete: false },
      { module: 'user-groups', operation: 'user-groups.core', read: false, write: false, update: false, delete: false },
      // Settings
      { module: 'settings', operation: 'settings.users', read: false, write: false, update: false, delete: false },
      { module: 'settings', operation: 'settings.user_groups', read: false, write: false, update: false, delete: false },
      { module: 'settings', operation: 'settings.system', read: false, write: false, update: false, delete: false },
    ];

    const employeeFieldPermissions = [
      { model: 'employees', field: 'baseSalary', read: false, write: false, update: false, delete: false },
      { model: 'employees', field: 'currency', read: false, write: false, update: false, delete: false },
      { model: 'employees', field: 'payFrequency', read: false, write: false, update: false, delete: false },
      { model: 'employees', field: 'bankAccountNumber', read: false, write: false, update: false, delete: false },
      { model: 'employees', field: 'bankRoutingNumber', read: false, write: false, update: false, delete: false },
      { model: 'employees', field: 'taxId', read: false, write: false, update: false, delete: false },
    ];

    let employeeGroup = await this.userGroupModel.findOne({
      name: { $regex: /^employee$/i },
    }).exec();

    if (!employeeGroup) {
      employeeGroup = await this.userGroupModel.create({
        name: 'Employee',
        description: 'Default employee group with standard access to tasks, projects, teams, and time-off',
        color: '#3b82f6',
        members: [],
        permissions: employeePermissions,
        modulePermissions: employeeModulePermissions,
        operationPermissions: employeeOperationPermissions,
        fieldPermissions: employeeFieldPermissions,
      });
      this.logger.log('Created default "Employee" user group.');
    } else {
      const hasApprovals = employeeGroup.operationPermissions?.some((op) => op.operation === 'dayoff.approvals');
      const hasUsers = employeeGroup.modulePermissions?.some((mp) => mp.module === 'users');
      const hasFieldPermissions = employeeGroup.fieldPermissions && employeeGroup.fieldPermissions.length > 0;
      const missingEmployeeScope = employeeGroup.modulePermissions?.some((mp) => !mp.scope);
      if (!hasApprovals || !hasUsers || !hasFieldPermissions || missingEmployeeScope || !employeeGroup.operationPermissions || employeeGroup.operationPermissions.length === 0) {
        employeeGroup.modulePermissions = employeeModulePermissions;
        employeeGroup.operationPermissions = employeeOperationPermissions;
        if (!hasFieldPermissions) {
          employeeGroup.fieldPermissions = employeeFieldPermissions as any;
        }
        if (typeof (employeeGroup as any).save === 'function') {
          await (employeeGroup as any).save();
        }
        this.logger.log('Synchronized permissions on existing "Employee" user group.');
      }
    }

    return { adminGroup, employeeGroup };
  }

  async findByName(name: string): Promise<UserGroup | null> {
    return this.userGroupModel.findOne({
      name: { $regex: new RegExp(`^${name.trim()}$`, 'i') },
    }).exec();
  }

  async addUserToGroup(
    userId: string | Types.ObjectId,
    groupNameOrId: string | Types.ObjectId,
    actor?: { id?: string; email?: string },
  ): Promise<UserGroup | null> {
    if (!userId) return null;
    const userIdObj = typeof userId === 'string' && Types.ObjectId.isValid(userId)
      ? new Types.ObjectId(userId)
      : userId;

    await this.ensureDefaultGroups();

    const isObjectId = typeof groupNameOrId === 'string' && Types.ObjectId.isValid(groupNameOrId);
    const filter = isObjectId
      ? { _id: groupNameOrId }
      : { name: { $regex: new RegExp(`^${groupNameOrId.toString().trim()}$`, 'i') } };

    const updated = await this.userGroupModel.findOneAndUpdate(
      filter,
      { $addToSet: { members: userIdObj } },
      { new: true },
    ).exec();

    this.permissionCacheService?.invalidate(userId.toString());

    if (updated) {
      await this.logAudit({
        actorId: actor?.id,
        actorEmail: actor?.email,
        action: 'member_added',
        groupId: updated._id,
        groupName: updated.name,
        targetUserId: userIdObj as Types.ObjectId,
        details: `Added member to group "${updated.name}"`,
      });
    }

    return updated;
  }

  async removeUserFromGroup(
    userId: string | Types.ObjectId,
    groupNameOrId: string | Types.ObjectId,
    actor?: { id?: string; email?: string },
  ): Promise<UserGroup | null> {
    if (!userId) return null;
    const userIdObj = typeof userId === 'string' && Types.ObjectId.isValid(userId)
      ? new Types.ObjectId(userId)
      : userId;

    const isObjectId = typeof groupNameOrId === 'string' && Types.ObjectId.isValid(groupNameOrId);
    const filter = isObjectId
      ? { _id: groupNameOrId }
      : { name: { $regex: new RegExp(`^${groupNameOrId.toString().trim()}$`, 'i') } };

    const updated = await this.userGroupModel.findOneAndUpdate(
      filter,
      { $pull: { members: userIdObj } },
      { new: true },
    ).exec();

    this.permissionCacheService?.invalidate(userId.toString());

    if (updated) {
      await this.logAudit({
        actorId: actor?.id,
        actorEmail: actor?.email,
        action: 'member_removed',
        groupId: updated._id,
        groupName: updated.name,
        targetUserId: userIdObj as Types.ObjectId,
        details: `Removed member from group "${updated.name}"`,
      });
    }

    return updated;
  }

  async ensureUserInEmployeeGroup(userId: string | Types.ObjectId): Promise<UserGroup | null> {
    return this.addUserToGroup(userId, 'Employee');
  }

  async addUserToDefaultGroup(userId: string | Types.ObjectId): Promise<UserGroup | null> {
    return this.ensureUserInEmployeeGroup(userId);
  }

  async ensureUserInAdminGroup(
    userId: string | Types.ObjectId,
    actor?: { id?: string; email?: string },
  ): Promise<UserGroup | null> {
    return this.addUserToGroup(userId, 'Administrators', actor);
  }

  async removeUserFromAdminGroup(
    userId: string | Types.ObjectId,
    actor?: { id?: string; email?: string },
  ): Promise<UserGroup | null> {
    return this.removeUserFromGroup(userId, 'Administrators', actor);
  }

  validateGroupAgainstCatalog(dto: Partial<CreateUserGroupDto | UpdateUserGroupDto>): void {
    const moduleMap: Record<string, { create?: boolean; read?: boolean; update?: boolean; delete?: boolean }> = {};

    if (dto.modulePermissions) {
      for (const mp of dto.modulePermissions) {
        if (!CATALOG_MODULES.includes(mp.module as any)) {
          throw new BadRequestException(`Invalid module "${mp.module}" in modulePermissions.`);
        }
        moduleMap[mp.module] = mp;
      }
    }

    if (dto.operationPermissions) {
      for (const op of dto.operationPermissions) {
        const match = CATALOG_OPERATIONS.find(
          (co) => co.operation === op.operation && co.module === op.module,
        );
        if (!match) {
          throw new BadRequestException(
            `Invalid operation "${op.operation}" for module "${op.module}". Must match system permissions catalog.`,
          );
        }

        const parentMod = moduleMap[op.module];
        if (parentMod) {
          if (op.read && parentMod.read === false) {
            throw new BadRequestException(`Operation "${op.operation}" grants "read" but module "${op.module}" denies "read".`);
          }
          if (op.write && parentMod.create === false) {
            throw new BadRequestException(`Operation "${op.operation}" grants "write" but module "${op.module}" denies "create".`);
          }
          if (op.update && parentMod.update === false) {
            throw new BadRequestException(`Operation "${op.operation}" grants "update" but module "${op.module}" denies "update".`);
          }
          if (op.delete && parentMod.delete === false) {
            throw new BadRequestException(`Operation "${op.operation}" grants "delete" but module "${op.module}" denies "delete".`);
          }
        }
      }
    }

    if (dto.fieldPermissions) {
      for (const fp of dto.fieldPermissions) {
        const allowedFields = CATALOG_MODELS_AND_FIELDS[fp.model];
        if (!allowedFields) {
          throw new BadRequestException(`Invalid model "${fp.model}" in fieldPermissions.`);
        }
        if (!allowedFields.includes(fp.field)) {
          throw new BadRequestException(
            `Invalid field "${fp.field}" for model "${fp.model}". Allowed fields: ${allowedFields.join(', ')}.`,
          );
        }

        const parentMod = moduleMap[fp.model];
        if (parentMod) {
          if (fp.read && parentMod.read === false) {
            throw new BadRequestException(`Field "${fp.field}" on model "${fp.model}" grants "read" but module "${fp.model}" denies "read".`);
          }
          if (fp.write && parentMod.create === false) {
            throw new BadRequestException(`Field "${fp.field}" on model "${fp.model}" grants "write" but module "${fp.model}" denies "create".`);
          }
          if (fp.update && parentMod.update === false) {
            throw new BadRequestException(`Field "${fp.field}" on model "${fp.model}" grants "update" but module "${fp.model}" denies "update".`);
          }
          if (fp.delete && parentMod.delete === false) {
            throw new BadRequestException(`Field "${fp.field}" on model "${fp.model}" grants "delete" but module "${fp.model}" denies "delete".`);
          }
        }
      }
    }
  }

  computeGroupDiff(before: any, after: any): { beforeDiff: Record<string, any>; afterDiff: Record<string, any> } {
    const beforeDiff: Record<string, any> = {};
    const afterDiff: Record<string, any> = {};

    const fieldsToTrack = [
      'name',
      'description',
      'color',
      'modulePermissions',
      'operationPermissions',
      'fieldPermissions',
    ];

    for (const field of fieldsToTrack) {
      const bVal = before?.[field];
      const aVal = after?.[field];

      if (JSON.stringify(bVal) !== JSON.stringify(aVal)) {
        if (bVal !== undefined) beforeDiff[field] = bVal;
        if (aVal !== undefined) afterDiff[field] = aVal;
      }
    }

    return { beforeDiff, afterDiff };
  }

  async logAudit(entry: {
    actorId?: string;
    actorEmail?: string;
    action: AuditAction;
    groupId?: string | Types.ObjectId;
    groupName?: string;
    targetUserId?: string | Types.ObjectId;
    targetUserEmail?: string;
    before?: Record<string, any>;
    after?: Record<string, any>;
    details?: string;
  }): Promise<PermissionAuditLog | null> {
    if (!this.auditLogModel || typeof this.auditLogModel !== 'function') {
      return null;
    }
    try {
      const audit = new this.auditLogModel({
        actorId: entry.actorId || 'system',
        actorEmail: entry.actorEmail || 'system@internal',
        action: entry.action,
        groupId: entry.groupId,
        groupName: entry.groupName,
        targetUserId: entry.targetUserId,
        targetUserEmail: entry.targetUserEmail,
        before: entry.before,
        after: entry.after,
        details: entry.details,
      });
      return await audit.save();
    } catch (err) {
      this.logger.error('Failed to save permission audit log', err);
      return null;
    }
  }

  async getAuditLogs(params: {
    groupId?: string;
    action?: string;
    page?: number;
    limit?: number;
  }): Promise<{ logs: PermissionAuditLog[]; total: number; page: number; totalPages: number }> {
    if (!this.auditLogModel) {
      return { logs: [], total: 0, page: 1, totalPages: 0 };
    }

    const query: any = {};
    if (params.groupId && Types.ObjectId.isValid(params.groupId)) {
      query.groupId = new Types.ObjectId(params.groupId);
    }
    if (params.action) {
      query.action = params.action;
    }

    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(params.limit) || 20));
    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      this.auditLogModel.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).exec(),
      this.auditLogModel.countDocuments(query).exec(),
    ]);

    return {
      logs,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async create(createUserGroupDto: CreateUserGroupDto, actor?: { id?: string; email?: string }): Promise<UserGroup> {
    this.validateGroupAgainstCatalog(createUserGroupDto);
    const newGroup = new this.userGroupModel(createUserGroupDto);
    const saved = await newGroup.save();
    this.permissionCacheService?.invalidate();

    await this.logAudit({
      actorId: actor?.id,
      actorEmail: actor?.email,
      action: 'group_created',
      groupId: saved._id,
      groupName: saved.name,
      after: {
        name: saved.name,
        description: saved.description,
        color: saved.color,
        modulePermissions: saved.modulePermissions,
        operationPermissions: saved.operationPermissions,
        fieldPermissions: saved.fieldPermissions,
      },
      details: `Created user group "${saved.name}"`,
    });

    return saved;
  }

  async findAll(): Promise<UserGroup[]> {
    return this.userGroupModel.find().populate('members').sort({ createdAt: -1 }).exec();
  }

  async findOne(id: string): Promise<UserGroup> {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException(`User Group #${id} not found`);
    }
    const group = await this.userGroupModel.findById(id).populate('members').exec();
    if (!group) {
      throw new NotFoundException(`User Group #${id} not found`);
    }
    return group;
  }

  async update(
    id: string,
    updateUserGroupDto: UpdateUserGroupDto,
    actor?: { id?: string; email?: string },
  ): Promise<UserGroup> {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException(`User Group #${id} not found`);
    }

    this.validateGroupAgainstCatalog(updateUserGroupDto);

    const existing = await this.userGroupModel.findById(id).exec();
    if (!existing) {
      throw new NotFoundException(`User Group #${id} not found`);
    }

    const existingNameLower = existing.name?.trim().toLowerCase();
    const isSystemGroup = existingNameLower === 'administrators' || existingNameLower === 'employee';
    if (
      isSystemGroup &&
      updateUserGroupDto.name &&
      updateUserGroupDto.name.trim().toLowerCase() !== existingNameLower
    ) {
      throw new BadRequestException(`Cannot rename default system user group "${existing.name}".`);
    }

    const updated = await this.userGroupModel.findByIdAndUpdate(
      id,
      { $set: updateUserGroupDto },
      { new: true },
    ).populate('members').exec();

    if (!updated) {
      throw new NotFoundException(`User Group #${id} not found`);
    }
    this.permissionCacheService?.invalidate();

    const beforeObj = existing.toObject ? existing.toObject() : existing;
    const afterObj = updated.toObject ? updated.toObject() : updated;
    const { beforeDiff, afterDiff } = this.computeGroupDiff(beforeObj, afterObj);

    await this.logAudit({
      actorId: actor?.id,
      actorEmail: actor?.email,
      action: 'group_updated',
      groupId: updated._id,
      groupName: updated.name,
      before: beforeDiff,
      after: afterDiff,
      details: `Updated user group "${updated.name}"`,
    });

    return updated;
  }

  async remove(id: string, actor?: { id?: string; email?: string }): Promise<any> {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException(`User Group #${id} not found`);
    }
    const group = await this.userGroupModel.findById(id).exec();
    if (!group) {
      throw new NotFoundException(`User Group #${id} not found`);
    }

    const groupNameLower = group.name?.trim().toLowerCase();
    if (groupNameLower === 'administrators' || groupNameLower === 'employee') {
      throw new BadRequestException(`Cannot delete default system user group "${group.name}".`);
    }

    const deleted = await this.userGroupModel.findByIdAndDelete(id).exec();
    this.permissionCacheService?.invalidate();

    await this.logAudit({
      actorId: actor?.id,
      actorEmail: actor?.email,
      action: 'group_deleted',
      groupId: group._id,
      groupName: group.name,
      before: { name: group.name, description: group.description },
      details: `Deleted user group "${group.name}"`,
    });

    return deleted;
  }

  async getUserEffectiveAccessDetails(userId: string): Promise<any> {
    if (!Types.ObjectId.isValid(userId)) {
      throw new NotFoundException(`User #${userId} not found`);
    }

    const user = this.userModel ? await this.userModel.findById(userId).exec() : null;

    const effectiveGroups = await this.getEffectiveGroups(userId);
    const effective = resolveEffective(effectiveGroups);
    const isUnrestrictedUser = isUnrestricted(user || { id: userId }, effectiveGroups);

    // Build module-level explanation breakdown
    const moduleExplanations: Record<
      string,
      {
        grantedBy: string[];
        deniedBy: string[];
        winningScope: string;
      }
    > = {};

    for (const mod of PERMISSION_CATALOG.modules) {
      const readCheck = canAny(effectiveGroups, { module: mod.key, action: 'read' });
      const grantedBy = readCheck.results.filter((r) => r.allowed).map((r) => r.group);
      const deniedBy = readCheck.results.filter((r) => !r.allowed).map((r) => r.group);
      const winningScope = effective.moduleScopes[mod.key] || 'own';

      moduleExplanations[mod.key] = {
        grantedBy,
        deniedBy,
        winningScope,
      };
    }

    return {
      user: {
        id: user?._id || userId,
        email: user?.email || 'unknown',
        name: user?.name || 'Unknown User',
        is_system_admin: Boolean(user?.is_system_admin),
      },
      groups: effectiveGroups.map((g) => ({
        id: g._id,
        name: g.name,
        color: g.color || '#6366f1',
      })),
      effective,
      moduleExplanations,
      isUnrestricted: isUnrestrictedUser,
    };
  }

  async checkUserPermission(
    userId: string,
    check: {
      module: string;
      action: 'create' | 'read' | 'update' | 'delete';
      operation?: string;
      model?: string;
      field?: string;
    },
  ): Promise<any> {
    const effectiveGroups = await this.getEffectiveGroups(userId);
    return canAny(effectiveGroups, check);
  }

  async getEffectiveGroups(userId: string): Promise<UserGroup[]> {
    if (!userId) {
      return [];
    }

    const cached = this.permissionCacheService?.get(userId);
    if (cached) {
      return cached;
    }

    const userIdObj = Types.ObjectId.isValid(userId) ? new Types.ObjectId(userId) : null;
    const query: any[] = [{ members: userId }];
    if (userIdObj) query.push({ members: userIdObj });

    const groups = await this.userGroupModel.find({ $or: query }).exec();
    this.permissionCacheService?.set(userId, groups);
    return groups;
  }

  async getUserPermissions(userId: string): Promise<EffectivePermissions> {
    if (!userId) {
      return resolveEffective([], {
        modules: CATALOG_MODULES,
        operations: CATALOG_OPERATIONS,
        modelsAndFields: CATALOG_MODELS_AND_FIELDS,
      });
    }

    const groups = await this.getEffectiveGroups(userId);
    return resolveEffective(groups, {
      modules: CATALOG_MODULES,
      operations: CATALOG_OPERATIONS,
      modelsAndFields: CATALOG_MODELS_AND_FIELDS,
    });
  }
}
