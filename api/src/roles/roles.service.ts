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
import { PolicyCompilerService } from '../access/policy-compiler.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';

@Injectable()
export class RolesService {
  constructor(
    @InjectModel(Role.name)
    private readonly roleModel: Model<RoleDocument>,
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
    private readonly policyCompilerService: PolicyCompilerService,
  ) {}

  /**
   * Return all roles sorted descending by priority rank.
   */
  async findAll() {
    return this.roleModel
      .find()
      .populate('members', '_id name email avatarUrl')
      .sort({ priority: -1, name: 1 })
      .lean()
      .exec();
  }

  /**
   * Return a single role by ID.
   */
  async findById(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException(`Invalid role ID: ${id}`);
    }

    const role = await this.roleModel
      .findById(id)
      .populate('members', '_id name email avatarUrl')
      .lean()
      .exec();

    if (!role) {
      throw new NotFoundException(`Role #${id} not found`);
    }

    return role;
  }

  /**
   * Create a new custom role and recompile active policy.
   */
  async create(dto: CreateRoleDto) {
    const slug = dto.slug.toLowerCase().trim().replace(/[^a-z0-9_-]/g, '-');

    // Check slug and name uniqueness
    const existing = await this.roleModel.findOne({
      $or: [{ slug }, { name: dto.name.trim() }],
    });

    if (existing) {
      throw new ConflictException(
        `A role with name "${dto.name}" or slug "${slug}" already exists.`,
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

    // Map member IDs
    const memberObjectIds = (dto.members || [])
      .filter((m) => Types.ObjectId.isValid(m))
      .map((m) => new Types.ObjectId(m));

    const newRole = new this.roleModel({
      name: dto.name.trim(),
      slug,
      description: dto.description || '',
      color: dto.color || '#6366f1',
      priority: dto.priority ?? 20,
      isSystem: false,
      isActive: dto.isActive !== false,
      members: memberObjectIds,
      moduleGrants: normalizedModuleGrants,
      fieldGrants: normalizedFieldGrants,
    });

    const saved = await newRole.save();

    // Recompile policy document
    await this.policyCompilerService.compileAndPersist();

    return this.findById(saved._id.toString());
  }

  /**
   * Update an existing role and recompile active policy.
   */
  async update(id: string, dto: UpdateRoleDto) {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException(`Invalid role ID: ${id}`);
    }

    const role = await this.roleModel.findById(id);
    if (!role) {
      throw new NotFoundException(`Role #${id} not found`);
    }

    // Name uniqueness check if name is changed
    if (dto.name && dto.name.trim() !== role.name) {
      const conflict = await this.roleModel.findOne({
        name: dto.name.trim(),
        _id: { $ne: role._id },
      });
      if (conflict) {
        throw new ConflictException(`Role with name "${dto.name}" already exists.`);
      }
      role.name = dto.name.trim();
    }

    // Protect system role slug from renaming
    if (dto.slug && !role.isSystem) {
      const slug = dto.slug.toLowerCase().trim().replace(/[^a-z0-9_-]/g, '-');
      if (slug !== role.slug) {
        const conflict = await this.roleModel.findOne({
          slug,
          _id: { $ne: role._id },
        });
        if (conflict) {
          throw new ConflictException(`Role with slug "${slug}" already exists.`);
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

    if (dto.members !== undefined) {
      role.members = dto.members
        .filter((m) => Types.ObjectId.isValid(m))
        .map((m) => new Types.ObjectId(m)) as any;
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

    // Recompile policy document
    await this.policyCompilerService.compileAndPersist();

    return this.findById(id);
  }

  /**
   * Delete a custom role and recompile active policy.
   * System roles cannot be deleted.
   */
  async remove(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException(`Invalid role ID: ${id}`);
    }

    const role = await this.roleModel.findById(id);
    if (!role) {
      throw new NotFoundException(`Role #${id} not found`);
    }

    if (role.isSystem) {
      throw new BadRequestException('Built-in system roles cannot be deleted.');
    }

    await this.roleModel.findByIdAndDelete(id);

    // Recompile policy document
    await this.policyCompilerService.compileAndPersist();

    return { message: `Role "${role.name}" deleted successfully.` };
  }
}
