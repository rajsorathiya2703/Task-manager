import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { UserGroup } from './schemas/user-group.schema';

@Injectable()
export class UserGroupsService {
  constructor(
    @InjectModel(UserGroup.name) private userGroupModel: Model<UserGroup>,
  ) {}

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
    const deleted = await this.userGroupModel.findByIdAndDelete(id).exec();
    if (!deleted) {
      throw new NotFoundException(`User Group #${id} not found`);
    }
    return deleted;
  }

  async getUserPermissions(userId: string): Promise<{
    groups: string[];
    permissions: string[];
    modulePermissions: Record<string, { create: boolean; read: boolean; update: boolean; delete: boolean }>;
    fieldPermissions: Record<string, Record<string, { read: boolean; write: boolean; update: boolean; delete: boolean }>>;
  }> {
    if (!userId) {
      return { groups: [], permissions: [], modulePermissions: {}, fieldPermissions: {} };
    }

    const userIdObj = Types.ObjectId.isValid(userId) ? new Types.ObjectId(userId) : null;
    const query: any[] = [{ members: userId }];
    if (userIdObj) query.push({ members: userIdObj });

    const groups = await this.userGroupModel.find({ $or: query }).exec();

    const groupNames: string[] = [];
    const permissionsSet = new Set<string>();
    const moduleMap: Record<string, { create: boolean; read: boolean; update: boolean; delete: boolean }> = {};
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
      fieldPermissions: fieldMap,
    };
  }
}
