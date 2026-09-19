import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { UserGroup } from './schemas/user-group.schema';
import { resolveAllPermissions } from '../permissions/permission-resolver';

@Injectable()
export class UserGroupsService {
  private readonly logger = new Logger(UserGroupsService.name);

  constructor(
    @InjectModel(UserGroup.name) private userGroupModel: Model<UserGroup>,
  ) {}

  async create(createUserGroupDto: any): Promise<UserGroup> {
    const newGroup = new this.userGroupModel(createUserGroupDto);
    return newGroup.save();
  }

  async findAll(): Promise<UserGroup[]> {
    // Populate only name and email from members — not the full User document
    return this.userGroupModel
      .find()
      .populate('members', 'name email avatarUrl')
      .sort({ createdAt: -1 })
      .exec();
  }

  async findOne(id: string): Promise<UserGroup> {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException(`User Group #${id} not found`);
    }
    const group = await this.userGroupModel
      .findById(id)
      .populate('members', 'name email avatarUrl')
      .exec();
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
    ).populate('members', 'name email avatarUrl').exec();

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

    // Warn if group still has members
    if (group.members && group.members.length > 0) {
      this.logger.warn(
        `Deleting group "${group.name}" which still has ${group.members.length} member(s). ` +
        `Those users will lose permissions from this group.`,
      );
    }

    // Clean up dangling references in LeaveType.applicableUserGroups
    try {
      const mongoose = require('mongoose');
      const LeaveTypeModel = mongoose.connection.model('LeaveType');
      if (LeaveTypeModel) {
        await LeaveTypeModel.updateMany(
          { applicableUserGroups: new Types.ObjectId(id) },
          { $pull: { applicableUserGroups: new Types.ObjectId(id) } },
        );
      }
    } catch {
      // LeaveType model may not be registered yet — ignore
    }

    const deleted = await this.userGroupModel.findByIdAndDelete(id).exec();
    return deleted;
  }

  /**
   * Find all raw group documents for a given user.
   * Used by the permissions guard for the resolver.
   */
  async findGroupsForUser(userId: string): Promise<UserGroup[]> {
    if (!userId) return [];

    const userIdObj = Types.ObjectId.isValid(userId) ? new Types.ObjectId(userId) : null;
    const query: any[] = [{ members: userId }];
    if (userIdObj) query.push({ members: userIdObj });

    return this.userGroupModel.find({ $or: query }).exec();
  }

  /**
   * Add a user to the default "Employee" group.
   * Called on guest creation and new Google sign-ups.
   * Idempotent — does nothing if user is already a member.
   */
  async addUserToDefaultGroup(userId: string | Types.ObjectId): Promise<void> {
    const group = await this.userGroupModel.findOne({ name: 'Employee' }).exec();
    if (!group) {
      this.logger.warn('Default "Employee" group not found — user will not be auto-assigned.');
      return;
    }

    const id = new Types.ObjectId(userId.toString());
    const alreadyMember = group.members.some((m) => m.toString() === id.toString());
    if (alreadyMember) return;

    await this.userGroupModel.findByIdAndUpdate(
      group._id,
      { $addToSet: { members: id } },
    ).exec();

    this.logger.log(`Auto-added user ${userId} to "Employee" group.`);
  }

  /**
   * Resolve a user's effective permissions across all their groups.
   * Uses the new per-group OR evaluation semantics.
   */
  async getUserPermissions(userId: string): Promise<{
    groups: string[];
    permissions: string[];
    modulePermissions: Record<string, { create: boolean; read: boolean; update: boolean; delete: boolean; scope: string }>;
    operationPermissions: Record<string, { read: boolean; write: boolean; update: boolean; delete: boolean }>;
    fieldPermissions: Record<string, Record<string, { read: boolean; write: boolean; update: boolean; delete: boolean }>>;
  }> {
    if (!userId) {
      return { groups: [], permissions: [], modulePermissions: {}, operationPermissions: {}, fieldPermissions: {} };
    }

    const groups = await this.findGroupsForUser(userId);

    // Collect legacy permission strings
    const permissionsSet = new Set<string>();
    for (const group of groups) {
      if (group.permissions) {
        group.permissions.forEach((p) => permissionsSet.add(p));
      }
    }

    // Use the new resolver for module/operation/field permissions
    const resolved = resolveAllPermissions(groups as any);

    return {
      groups: resolved.groups,
      permissions: Array.from(permissionsSet),
      modulePermissions: resolved.modulePermissions,
      operationPermissions: resolved.operationPermissions,
      fieldPermissions: resolved.fieldPermissions,
    };
  }
}
