import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Role, RoleDocument } from '../access/schemas/role.schema';
import { User, UserDocument } from '../users/schemas/user.schema';
import { Membership } from '../companies/schemas/membership.schema';
import { PolicyCompilerService } from '../access/policy-compiler.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { buildDefaultRoles } from '../access/access.seed';

@Injectable()
export class RolesService {
  constructor(
    @InjectModel(Role.name)
    private readonly roleModel: Model<RoleDocument>,
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
    @InjectModel(Membership.name)
    private readonly membershipModel: Model<any>,
    private readonly policyCompilerService: PolicyCompilerService,
  ) {}

  /**
   * Seeds the 5 default system roles for a company if none exist yet.
   */
  async seedDefaultRolesForCompany(
    companyId: Types.ObjectId | string,
    adminUserIds: Types.ObjectId[] = [],
  ): Promise<void> {
    const compObjectId =
      typeof companyId === 'string' ? new Types.ObjectId(companyId) : companyId;

    const existingCount = await this.roleModel.countDocuments({
      companyId: compObjectId,
    });
    if (existingCount === 0) {
      const defaultRoles = buildDefaultRoles(adminUserIds).map((r) => ({
        ...r,
        companyId: compObjectId,
      }));
      try {
        await this.roleModel.insertMany(defaultRoles, { ordered: false });
      } catch (err: any) {
        if (err?.code !== 11000 && !err?.message?.includes('E11000')) {
          throw err;
        }
      }
      try {
        await this.policyCompilerService.compileAndPersist(compObjectId);
      } catch {
        // Fallback: compilation will be retried on next role update or request
      }
    }
  }

  /**
   * Return all roles for the current company sorted descending by priority rank.
   * Automatically bootstraps default company roles if this company has none yet.
   */
  async findAll(companyId: Types.ObjectId | string) {
    const compObjectId =
      typeof companyId === 'string' ? new Types.ObjectId(companyId) : companyId;

    const count = await this.roleModel.countDocuments({
      companyId: compObjectId,
    });

    if (count === 0) {
      // Find company owner membership if any to bootstrap system-admin member
      const ownerMembership = await this.membershipModel
        .findOne({
          companyId: compObjectId,
          isCompanyOwner: true,
        })
        .exec();

      const adminIds = ownerMembership ? [ownerMembership.userId] : [];
      await this.seedDefaultRolesForCompany(compObjectId, adminIds as any);

      if (ownerMembership) {
        const sysAdminRole = await this.roleModel.findOne({
          companyId: compObjectId,
          slug: 'system-admin',
        });
        if (sysAdminRole) {
          await this.membershipModel.updateOne(
            { _id: ownerMembership._id },
            { $addToSet: { roleIds: sysAdminRole._id } },
          );
        }
      }
    }

    return this.roleModel
      .find({ companyId: compObjectId })
      .populate('members', '_id name email avatarUrl')
      .sort({ priority: -1, name: 1 })
      .lean()
      .exec();
  }

  /**
   * Return a single role by ID within the current company.
   */
  async findById(companyId: Types.ObjectId | string, id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException(`Invalid role ID: ${id}`);
    }

    const compObjectId =
      typeof companyId === 'string' ? new Types.ObjectId(companyId) : companyId;

    const role = await this.roleModel
      .findOne({ _id: new Types.ObjectId(id), companyId: compObjectId })
      .populate('members', '_id name email avatarUrl')
      .lean()
      .exec();

    if (!role) {
      throw new NotFoundException(`Role #${id} not found in this company`);
    }

    return role;
  }

  /**
   * Create a new custom role for the current company and recompile company policy.
   */
  async create(companyId: Types.ObjectId | string, dto: CreateRoleDto) {
    const compObjectId =
      typeof companyId === 'string' ? new Types.ObjectId(companyId) : companyId;

    const slug = dto.slug.toLowerCase().trim().replace(/[^a-z0-9_-]/g, '-');

    // Check slug and name uniqueness within this company
    const existing = await this.roleModel.findOne({
      companyId: compObjectId,
      $or: [{ slug }, { name: dto.name.trim() }],
    });

    if (existing) {
      throw new ConflictException(
        `A role with name "${dto.name}" or slug "${slug}" already exists in this company.`,
      );
    }

    // Invariant check on moduleGrants vs fieldGrants
    const normalizedModuleGrants = (dto.moduleGrants || []).map((mg) => ({
      module: mg.module,
      create: mg.create ?? false,
      read: mg.read ?? false,
      update: mg.update ?? false,
      delete: mg.delete ?? false,
      scope: mg.scope ?? 'none',
      operations: mg.operations ?? [],
    }));

    const modMap = new Map<string, any>(
      normalizedModuleGrants.map((m) => [m.module, m]),
    );

    const normalizedFieldGrants = (dto.fieldGrants || []).map((fg) => {
      const parentMod = modMap.get(fg.module);
      let read = fg.read ?? false;
      let update = fg.update ?? false;

      // Invariants: field.read <= module.read
      if (!parentMod || !parentMod.read) {
        read = false;
        update = false;
      }
      // Invariant: field.update <= module.update AND field.read
      if (!parentMod || !parentMod.update || !read) {
        update = false;
      }

      return {
        module: fg.module,
        field: fg.field,
        read,
        update,
      };
    });

    // Validate that candidate members belong to this company
    const inputMemberObjectIds = (dto.members || [])
      .filter((m) => Types.ObjectId.isValid(m))
      .map((m) => new Types.ObjectId(m));

    const validMemberships = await this.membershipModel
      .find({
        companyId: compObjectId,
        userId: { $in: inputMemberObjectIds },
        status: 'active',
      })
      .select('userId')
      .exec();

    const validMemberObjectIds = validMemberships.map(
      (m: any) => m.userId as Types.ObjectId,
    );

    const newRole = new this.roleModel({
      companyId: compObjectId,
      name: dto.name.trim(),
      slug,
      description: dto.description || '',
      color: dto.color || '#6366f1',
      priority: dto.priority ?? 20,
      isSystem: false,
      isActive: dto.isActive !== false,
      members: validMemberObjectIds,
      moduleGrants: normalizedModuleGrants,
      fieldGrants: normalizedFieldGrants,
    });

    const saved = await newRole.save();

    // Sync Membership.roleIds for the assigned members
    if (validMemberObjectIds.length > 0) {
      await this.membershipModel.updateMany(
        {
          companyId: compObjectId,
          userId: { $in: validMemberObjectIds },
        },
        { $addToSet: { roleIds: saved._id } },
      );
    }

    // Recompile policy document for this company
    await this.policyCompilerService.compileAndPersist(compObjectId);

    return this.findById(companyId, saved._id.toString());
  }

  /**
   * Update an existing role in the company and recompile active company policy.
   */
  async update(
    companyId: Types.ObjectId | string,
    id: string,
    dto: UpdateRoleDto,
  ) {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException(`Invalid role ID: ${id}`);
    }

    const compObjectId =
      typeof companyId === 'string' ? new Types.ObjectId(companyId) : companyId;

    const role = await this.roleModel.findOne({
      _id: new Types.ObjectId(id),
      companyId: compObjectId,
    });
    if (!role) {
      throw new NotFoundException(`Role #${id} not found in this company`);
    }

    // Name uniqueness check if name is changed in this company
    if (dto.name && dto.name.trim() !== role.name) {
      const conflict = await this.roleModel.findOne({
        companyId: compObjectId,
        name: dto.name.trim(),
        _id: { $ne: role._id },
      });
      if (conflict) {
        throw new ConflictException(
          `Role with name "${dto.name}" already exists in this company.`,
        );
      }
      role.name = dto.name.trim();
    }

    // Protect system role slug from renaming
    if (dto.slug && !role.isSystem) {
      const slug = dto.slug.toLowerCase().trim().replace(/[^a-z0-9_-]/g, '-');
      if (slug !== role.slug) {
        const conflict = await this.roleModel.findOne({
          companyId: compObjectId,
          slug,
          _id: { $ne: role._id },
        });
        if (conflict) {
          throw new ConflictException(
            `Role with slug "${slug}" already exists in this company.`,
          );
        }
        role.slug = slug;
      }
    }

    if (dto.description !== undefined) {
      role.description = dto.description;
    }

    if (dto.color !== undefined) {
      role.color = dto.color;
    }

    if (dto.priority !== undefined) {
      role.priority = dto.priority;
    }

    if (dto.isActive !== undefined) {
      role.isActive = dto.isActive;
    }

    // Member synchronization scoped to this company
    if (dto.members !== undefined) {
      const candidateUserIds = dto.members
        .filter((m) => Types.ObjectId.isValid(m))
        .map((m) => new Types.ObjectId(m));

      const validMemberships = await this.membershipModel
        .find({
          companyId: compObjectId,
          userId: { $in: candidateUserIds },
          status: 'active',
        })
        .select('userId')
        .exec();

      const newValidUserIds = validMemberships.map((m: any) =>
        m.userId.toString(),
      );

      const previousUserIds = (role.members || []).map((m: any) =>
        m.toString(),
      );

      const addedUserIds = newValidUserIds.filter(
        (uid) => !previousUserIds.includes(uid),
      );
      const removedUserIds = previousUserIds.filter(
        (uid) => !newValidUserIds.includes(uid),
      );

      role.members = newValidUserIds.map(
        (uid) => new Types.ObjectId(uid),
      ) as any;

      if (addedUserIds.length > 0) {
        await this.membershipModel.updateMany(
          {
            companyId: compObjectId,
            userId: { $in: addedUserIds.map((uid) => new Types.ObjectId(uid)) },
          },
          { $addToSet: { roleIds: role._id } },
        );
      }

      if (removedUserIds.length > 0) {
        await this.membershipModel.updateMany(
          {
            companyId: compObjectId,
            userId: { $in: removedUserIds.map((uid) => new Types.ObjectId(uid)) },
          },
          { $pull: { roleIds: role._id } },
        );
      }
    }

    if (dto.moduleGrants !== undefined) {
      role.moduleGrants = dto.moduleGrants.map((mg) => ({
        module: mg.module,
        create: mg.create ?? false,
        read: mg.read ?? false,
        update: mg.update ?? false,
        delete: mg.delete ?? false,
        scope: mg.scope ?? 'none',
        operations: mg.operations ?? [],
      })) as any;
    }

    if (dto.fieldGrants !== undefined) {
      const modMap = new Map<string, any>(
        (role.moduleGrants || []).map((m: any) => [m.module, m]),
      );

      role.fieldGrants = dto.fieldGrants.map((fg) => {
        const parentMod = modMap.get(fg.module);
        let read = fg.read ?? false;
        let update = fg.update ?? false;

        if (!parentMod || !parentMod.read) {
          read = false;
          update = false;
        }
        if (!parentMod || !parentMod.update || !read) {
          update = false;
        }

        return {
          module: fg.module,
          field: fg.field,
          read,
          update,
        };
      }) as any;
    }

    await role.save();

    // Recompile policy document for this company
    await this.policyCompilerService.compileAndPersist(compObjectId);

    return this.findById(companyId, id);
  }

  /**
   * Delete a custom role and recompile active company policy.
   * System roles cannot be deleted.
   */
  async remove(companyId: Types.ObjectId | string, id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException(`Invalid role ID: ${id}`);
    }

    const compObjectId =
      typeof companyId === 'string' ? new Types.ObjectId(companyId) : companyId;

    const role = await this.roleModel.findOne({
      _id: new Types.ObjectId(id),
      companyId: compObjectId,
    });
    if (!role) {
      throw new NotFoundException(`Role #${id} not found in this company`);
    }

    if (role.isSystem) {
      throw new BadRequestException('Built-in system roles cannot be deleted.');
    }

    await this.roleModel.findByIdAndDelete(id);

    // Pull role from all memberships in this company
    await this.membershipModel.updateMany(
      { companyId: compObjectId },
      { $pull: { roleIds: new Types.ObjectId(id) } },
    );

    // Recompile policy document for this company
    await this.policyCompilerService.compileAndPersist(compObjectId);

    return { message: `Role "${role.name}" deleted successfully.` };
  }
}
