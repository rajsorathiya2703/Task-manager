import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { UserGroup } from './schemas/user-group.schema';

@Injectable()
export class UserGroupsService {
  private readonly logger = new Logger(UserGroupsService.name);

  constructor(
    @InjectModel(UserGroup.name) private userGroupModel: Model<UserGroup>,
  ) {}

  async ensureDefaultGroups(): Promise<{ adminGroup: UserGroup; employeeGroup: UserGroup }> {
    const adminModules = ['tasks', 'projects', 'employees', 'teams', 'dayoff', 'reports', 'settings'];
    const adminModulePermissions = adminModules.map((module) => ({
      module,
      create: true,
      read: true,
      update: true,
      delete: true,
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
    } else if (!adminGroup.operationPermissions || adminGroup.operationPermissions.length === 0) {
      adminGroup.operationPermissions = adminOperationPermissions;
      if (typeof (adminGroup as any).save === 'function') {
        await (adminGroup as any).save();
      }
      this.logger.log('Synchronized operationPermissions on existing "Administrators" user group.');
    }

    const employeeModulePermissions = [
      { module: 'tasks', create: true, read: true, update: true, delete: true },
      { module: 'projects', create: true, read: true, update: true, delete: false },
      { module: 'teams', create: true, read: true, update: true, delete: false },
      { module: 'employees', create: false, read: true, update: false, delete: false },
      { module: 'dayoff', create: true, read: true, update: true, delete: true },
      { module: 'reports', create: false, read: true, update: false, delete: false },
      { module: 'settings', create: false, read: false, update: false, delete: false },
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
      // Settings
      { module: 'settings', operation: 'settings.users', read: false, write: false, update: false, delete: false },
      { module: 'settings', operation: 'settings.user_groups', read: false, write: false, update: false, delete: false },
      { module: 'settings', operation: 'settings.system', read: false, write: false, update: false, delete: false },
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
      });
      this.logger.log('Created default "Employee" user group.');
    } else {
      const hasApprovals = employeeGroup.operationPermissions?.some((op) => op.operation === 'dayoff.approvals');
      if (!hasApprovals || !employeeGroup.operationPermissions || employeeGroup.operationPermissions.length === 0) {
        employeeGroup.operationPermissions = employeeOperationPermissions;
        if (typeof (employeeGroup as any).save === 'function') {
          await (employeeGroup as any).save();
        }
        this.logger.log('Synchronized operationPermissions on existing "Employee" user group.');
      }
    }

    return { adminGroup, employeeGroup };
  }

  async findByName(name: string): Promise<UserGroup | null> {
    return this.userGroupModel.findOne({
      name: { $regex: new RegExp(`^${name.trim()}$`, 'i') },
    }).exec();
  }

  async addUserToGroup(userId: string | Types.ObjectId, groupName: string): Promise<UserGroup | null> {
    if (!userId) return null;
    const userIdObj = typeof userId === 'string' && Types.ObjectId.isValid(userId)
      ? new Types.ObjectId(userId)
      : userId;

    await this.ensureDefaultGroups();

    return this.userGroupModel.findOneAndUpdate(
      { name: { $regex: new RegExp(`^${groupName.trim()}$`, 'i') } },
      { $addToSet: { members: userIdObj } },
      { new: true },
    ).exec();
  }

  async ensureUserInEmployeeGroup(userId: string | Types.ObjectId): Promise<UserGroup | null> {
    return this.addUserToGroup(userId, 'Employee');
  }

  async ensureUserInAdminGroup(userId: string | Types.ObjectId): Promise<UserGroup | null> {
    return this.addUserToGroup(userId, 'Administrators');
  }

  async removeUserFromAdminGroup(userId: string | Types.ObjectId): Promise<UserGroup | null> {
    if (!userId) return null;
    const userIdObj = typeof userId === 'string' && Types.ObjectId.isValid(userId)
      ? new Types.ObjectId(userId)
      : userId;

    return this.userGroupModel.findOneAndUpdate(
      { name: { $regex: /^administrators$/i } },
      { $pull: { members: userIdObj } },
      { new: true },
    ).exec();
  }

  async create(createUserGroupDto: any): Promise<UserGroup> {
    const newGroup = new this.userGroupModel(createUserGroupDto);
    return newGroup.save();
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

  async update(id: string, updateUserGroupDto: any): Promise<UserGroup> {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException(`User Group #${id} not found`);
    }
    const updated = await this.userGroupModel.findByIdAndUpdate(
      id,
      { $set: updateUserGroupDto },
      { new: true },
    ).populate('members').exec();

    if (!updated) {
      throw new NotFoundException(`User Group #${id} not found`);
    }
    return updated;
  }

  async remove(id: string): Promise<any> {
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
    return deleted;
  }

  async getUserPermissions(userId: string): Promise<{
    groups: string[];
    permissions: string[];
    modulePermissions: Record<string, { create: boolean; read: boolean; update: boolean; delete: boolean }>;
    operationPermissions: Record<string, { read: boolean; write: boolean; update: boolean; delete: boolean }>;
    fieldPermissions: Record<string, Record<string, { read: boolean; write: boolean; update: boolean; delete: boolean }>>;
  }> {
    if (!userId) {
      return { groups: [], permissions: [], modulePermissions: {}, operationPermissions: {}, fieldPermissions: {} };
    }

    const userIdObj = Types.ObjectId.isValid(userId) ? new Types.ObjectId(userId) : null;
    const query: any[] = [{ members: userId }];
    if (userIdObj) query.push({ members: userIdObj });

    const groups = await this.userGroupModel.find({ $or: query }).exec();

    const groupNames: string[] = [];
    const permissionsSet = new Set<string>();
    const moduleMap: Record<string, { create: boolean; read: boolean; update: boolean; delete: boolean }> = {};
    const operationMap: Record<string, { read: boolean; write: boolean; update: boolean; delete: boolean }> = {};
    const fieldMap: Record<string, Record<string, { read: boolean; write: boolean; update: boolean; delete: boolean }>> = {};

    for (const group of groups) {
      groupNames.push(group.name);
      if (group.permissions) {
        group.permissions.forEach((p) => permissionsSet.add(p));
      }

      if (group.modulePermissions) {
        for (const mp of group.modulePermissions) {
          if (!moduleMap[mp.module]) {
            moduleMap[mp.module] = { create: false, read: false, update: false, delete: false };
          }
          if (mp.create) moduleMap[mp.module].create = true;
          if (mp.read) moduleMap[mp.module].read = true;
          if (mp.update) moduleMap[mp.module].update = true;
          if (mp.delete) moduleMap[mp.module].delete = true;
        }
      }

      if (group.operationPermissions) {
        for (const op of group.operationPermissions) {
          if (!operationMap[op.operation]) {
            operationMap[op.operation] = { read: false, write: false, update: false, delete: false };
          }
          if (op.read) operationMap[op.operation].read = true;
          if (op.write) operationMap[op.operation].write = true;
          if (op.update) operationMap[op.operation].update = true;
          if (op.delete) operationMap[op.operation].delete = true;
        }
      }

      if (group.fieldPermissions) {
        for (const fp of group.fieldPermissions) {
          if (!fieldMap[fp.model]) {
            fieldMap[fp.model] = {};
          }
          if (!fieldMap[fp.model][fp.field]) {
            fieldMap[fp.model][fp.field] = { read: false, write: false, update: false, delete: false };
          }
          // Union of permissions (if in any group, grant)
          if (fp.read) fieldMap[fp.model][fp.field].read = true;
          if (fp.write) fieldMap[fp.model][fp.field].write = true;
          if (fp.update) fieldMap[fp.model][fp.field].update = true;
          if (fp.delete) fieldMap[fp.model][fp.field].delete = true;
        }
      }
    }

    return {
      groups: groupNames,
      permissions: Array.from(permissionsSet),
      modulePermissions: moduleMap,
      operationPermissions: operationMap,
      fieldPermissions: fieldMap,
    };
  }
}
