import {
  Injectable,
  ConflictException,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  Inject,
  forwardRef,
  Optional,
} from '@nestjs/common';
import { DayOffService } from '../day-off/day-off.service';
import { EmployeesService } from '../employees/employees.service';
import { UsersService } from '../users/users.service';

export const defaultRoleNames = [
  'System Admin',
  'Admin',
  'Manager',
  'Team Leader',
  'Employee',
] as const;
import { InjectModel, InjectConnection } from '@nestjs/mongoose';
import { Model, Types, Connection } from 'mongoose';
import { Company } from './schemas/company.schema';
import { Membership } from './schemas/membership.schema';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { isValidSlug, isReservedSlug } from './slug.util';
import {
  generateSecretCode,
  hashSecretCode,
  verifySecretCode,
} from './secret-code.util';
import { Role, RoleDocument } from '../access/schemas/role.schema';
import { PolicyCompilerService } from '../access/policy-compiler.service';
import { buildDefaultRoles } from '../access/access.seed';

@Injectable()
export class CompaniesService {
  constructor(
    @InjectModel(Company.name) private readonly companyModel: Model<Company>,
    @InjectModel(Membership.name) private readonly membershipModel: Model<Membership>,
    @InjectConnection() private readonly connection: Connection,
    @Inject(forwardRef(() => EmployeesService))
    private readonly employeesService: EmployeesService,
    @Inject(forwardRef(() => UsersService))
    private readonly usersService: UsersService,
    @Optional()
    @Inject(forwardRef(() => DayOffService))
    private readonly dayOffService?: DayOffService,
    @Optional()
    @InjectModel(Role.name)
    private readonly roleModel?: Model<RoleDocument>,
    @Optional()
    @Inject(forwardRef(() => PolicyCompilerService))
    private readonly policyCompilerService?: PolicyCompilerService,
  ) {}

  /**
   * Creates a new company and assigns the creator as owner in Membership.
   * Atomically executes in a Mongo transaction if supported; otherwise falls
   * back to sequential execution with best-effort rollback.
   */
  async create(
    userId: string | Types.ObjectId,
    dto: CreateCompanyDto,
  ): Promise<{ company: Partial<Company>; secretCode: string }> {
    const slug = (dto.slug || '').trim().toLowerCase();

    if (!isValidSlug(slug)) {
      throw new BadRequestException(
        'Invalid slug format. Slugs must be 3-40 lowercase alphanumeric characters and single hyphens.',
      );
    }

    if (isReservedSlug(slug)) {
      throw new ConflictException(`Slug "${slug}" is a reserved word and cannot be used.`);
    }

    const existingCompany = await this.companyModel
      .findOne({ slug })
      .select('_id')
      .lean()
      .exec();

    if (existingCompany) {
      throw new ConflictException(`Slug "${slug}" is already in use.`);
    }

    const secretCode = generateSecretCode();
    const secretCodeHash = await hashSecretCode(secretCode);

    const userObjectId = new Types.ObjectId(userId);
    const user = await this.usersService.findById(userId.toString());
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const companyData: Partial<Company> = {
      name: dto.name.trim(),
      slug,
      secretCodeHash,
      industry: dto.industry,
      sizeRange: dto.sizeRange,
      country: dto.country,
      timezone: dto.timezone || 'UTC',
      currency: dto.currency || 'USD',
      workWeek: dto.workWeek || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
      fiscalYearStart: dto.fiscalYearStart || 1,
      contactEmail: dto.contactEmail,
      phone: dto.phone,
      address: dto.address,
      website: dto.website,
      logoUrl: dto.logoUrl,
      ownerUserId: userObjectId,
      status: 'active',
      settings: {
        requireCodeOnEveryLogin: false,
      },
    };

    let session: any = null;
    let useTransaction = false;

    try {
      if (this.connection && typeof this.connection.startSession === 'function') {
        session = await this.connection.startSession();
        if (session && typeof session.startTransaction === 'function') {
          session.startTransaction();
          useTransaction = true;
        }
      }
    } catch {
      if (session) {
        try {
          await session.endSession();
        } catch {
          // ignore
        }
        session = null;
      }
      useTransaction = false;
    }

    let createdCompanyDoc: any;

    if (useTransaction && session) {
      try {
        const [company] = await this.companyModel.create([companyData], { session });
        createdCompanyDoc = company;

        const [membership] = await this.membershipModel.create(
          [
            {
              userId: userObjectId,
              companyId: company._id,
              isCompanyOwner: true,
              isSystemAdmin: true,
              roleIds: [],
              status: 'active',
            },
          ],
          { session },
        );

        const employee = await this.employeesService.createFromUser(
          company._id,
          user,
          'Owner',
          'Active',
        );

        if (membership && employee) {
          membership.employeeId = employee._id;
          if (typeof membership.save === 'function') {
            await membership.save({ session });
          } else if (typeof this.membershipModel.findByIdAndUpdate === 'function') {
            await this.membershipModel.findByIdAndUpdate(
              membership._id,
              { $set: { employeeId: employee._id } },
              { session },
            );
          }
        }

        const roleIds = await this.seedCompanyRolesAndAssignOwner(
          company._id,
          userObjectId,
          session,
        );
        if (roleIds.length > 0) {
          membership.roleIds = roleIds;
          if (typeof membership.save === 'function') {
            await membership.save({ session });
          } else if (typeof this.membershipModel.findByIdAndUpdate === 'function') {
            await this.membershipModel.findByIdAndUpdate(
              membership._id,
              { $set: { roleIds } },
              { session },
            );
          }
        }

        if (this.dayOffService) {
          const adminEmail = dto.contactEmail || user.email;
          await this.dayOffService.seedCompanyDefaults(company._id, adminEmail, session);
        }

        await session.commitTransaction();
      } catch (err: any) {
        try {
          await session.abortTransaction();
        } catch {
          // ignore
        }
        const isNotReplicaSet =
          err?.message?.includes('replica set') ||
          err?.message?.includes('retryable writes') ||
          err?.code === 20 ||
          err?.codeName === 'IllegalOperation' ||
          err?.message?.includes('Transaction numbers are only allowed');

        if (!isNotReplicaSet) {
          throw err;
        }
        useTransaction = false;
      } finally {
        try {
          await session.endSession();
        } catch {
          // ignore
        }
      }
    }

    if (!useTransaction) {
      // Non-replica set fallback with best-effort rollback
      createdCompanyDoc = await this.companyModel.create(companyData);

      try {
        const membership = await this.membershipModel.create({
          userId: userObjectId,
          companyId: createdCompanyDoc._id,
          isCompanyOwner: true,
          isSystemAdmin: true,
          roleIds: [],
          status: 'active',
        });

        const employee = await this.employeesService.createFromUser(
          createdCompanyDoc._id,
          user,
          'Owner',
          'Active',
        );

        if (membership && employee) {
          membership.employeeId = employee._id;
          if (typeof membership.save === 'function') {
            await membership.save();
          } else if (typeof this.membershipModel.findByIdAndUpdate === 'function') {
            await this.membershipModel.findByIdAndUpdate(membership._id, {
              $set: { employeeId: employee._id },
            });
          }
        }

        const roleIds = await this.seedCompanyRolesAndAssignOwner(
          createdCompanyDoc._id,
          userObjectId,
        );
        if (roleIds.length > 0) {
          membership.roleIds = roleIds;
          if (typeof membership.save === 'function') {
            await membership.save();
          } else if (typeof this.membershipModel.findByIdAndUpdate === 'function') {
            await this.membershipModel.findByIdAndUpdate(membership._id, {
              $set: { roleIds },
            });
          }
        }

        if (this.dayOffService) {
          const adminEmail = dto.contactEmail || user.email;
          await this.dayOffService.seedCompanyDefaults(createdCompanyDoc._id, adminEmail);
        }
      } catch (creationError) {
        try {
          await this.membershipModel.deleteMany({ companyId: createdCompanyDoc._id }).exec();
        } catch {
          // ignore cleanup error
        }
        try {
          await this.companyModel.findByIdAndDelete(createdCompanyDoc._id).exec();
        } catch {
          // ignore cleanup error
        }
        throw creationError;
      }
    }

    const companyObject = createdCompanyDoc.toObject
      ? createdCompanyDoc.toObject()
      : { ...createdCompanyDoc };

    delete companyObject.secretCodeHash;

    return {
      company: companyObject,
      secretCode,
    };
  }

  /**
   * Checks if a slug is valid, not reserved, and not yet taken.
   */
  async isSlugAvailable(slug: string): Promise<boolean> {
    const cleanSlug = (slug || '').trim().toLowerCase();
    if (!isValidSlug(cleanSlug) || isReservedSlug(cleanSlug)) {
      return false;
    }
    const existing = await this.companyModel
      .findOne({ slug: cleanSlug })
      .select('_id')
      .lean()
      .exec();

    return !existing;
  }

  /**
   * Finds a company document by its slug, or returns null.
   */
  async findBySlug(slug: string): Promise<Company | null> {
    if (!slug) return null;
    return this.companyModel.findOne({ slug: slug.trim().toLowerCase() }).exec();
  }

  /**
   * Returns limited public company profile information for login branding.
   */
  async getPublicInfo(slug: string): Promise<{ name: string; slug: string; logoUrl?: string }> {
    if (!slug) {
      throw new NotFoundException('Company not found');
    }
    const company = await this.companyModel
      .findOne({ slug: slug.trim().toLowerCase(), status: 'active' })
      .select('name slug logoUrl')
      .lean()
      .exec();

    if (!company) {
      throw new NotFoundException('Company not found');
    }

    return {
      name: company.name,
      slug: company.slug,
      logoUrl: company.logoUrl,
    };
  }

  /**
   * Retrieves the full company profile for authenticated members.
   * Excludes sensitive fields like secretCodeHash.
   */
  async getCompanyProfile(userId: string | Types.ObjectId, slug: string): Promise<Company> {
    const cleanSlug = (slug || '').trim().toLowerCase();
    const company = await this.companyModel
      .findOne({ slug: cleanSlug, status: 'active' })
      .select('-secretCodeHash')
      .exec();

    if (!company) {
      throw new NotFoundException('Company not found');
    }

    const membership = await this.membershipModel
      .findOne({
        userId: new Types.ObjectId(userId),
        companyId: company._id,
        status: 'active',
      })
      .exec();

    if (!membership) {
      throw new ForbiddenException('You are not a member of this company');
    }

    return company;
  }

  /**
   * Lists all active companies the given user belongs to.
   */
  async listMine(
    userId: string | Types.ObjectId,
  ): Promise<Array<{ slug: string; name: string; logoUrl?: string; isCompanyOwner: boolean }>> {
    const memberships = await this.membershipModel
      .find({ userId: new Types.ObjectId(userId), status: 'active' })
      .populate('companyId', 'slug name logoUrl status')
      .lean()
      .exec();

    const results: Array<{
      slug: string;
      name: string;
      logoUrl?: string;
      isCompanyOwner: boolean;
    }> = [];

    for (const m of memberships) {
      const comp = m.companyId as any;
      if (comp && comp.status !== 'suspended' && comp.slug) {
        results.push({
          slug: comp.slug,
          name: comp.name,
          logoUrl: comp.logoUrl,
          isCompanyOwner: !!m.isCompanyOwner,
        });
      }
    }

    return results;
  }

  /**
   * Joins a company using its secret code.
   * - Validates code against the stored hash.
   * - Idempotent for existing active members.
   * - Blocks suspended members.
   */
  async join(
    userId: string | Types.ObjectId,
    slug: string,
    secretCode: string,
  ): Promise<{ slug: string; name: string }> {
    const cleanSlug = (slug || '').trim().toLowerCase();
    const company = await this.companyModel
      .findOne({ slug: cleanSlug })
      .select('+secretCodeHash')
      .exec();

    if (!company || company.status === 'suspended') {
      throw new NotFoundException('Company not found');
    }

    const userObjectId = new Types.ObjectId(userId);
    const existingMembership = await this.membershipModel
      .findOne({ userId: userObjectId, companyId: company._id })
      .exec();

    if (existingMembership) {
      if (existingMembership.status === 'suspended') {
        throw new ForbiddenException('Your membership in this company has been suspended');
      }
      return {
        slug: company.slug,
        name: company.name,
      };
    }

    const isValid = await verifySecretCode(secretCode, company.secretCodeHash);
    if (!isValid) {
      throw new ForbiddenException('Invalid company code');
    }

    const user = await this.usersService.findById(userId.toString());
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Find default Employee role for this company
    let defaultRoleIds: Types.ObjectId[] = [];
    if (this.roleModel) {
      const employeeRole = await this.roleModel.findOne({
        companyId: company._id,
        slug: 'employee',
      });
      if (employeeRole) {
        defaultRoleIds = [employeeRole._id as Types.ObjectId];
        await this.roleModel.updateOne(
          { _id: employeeRole._id },
          { $addToSet: { members: userObjectId } },
        );
      }
    }

    const membership = await this.membershipModel.create({
      userId: userObjectId,
      companyId: company._id,
      roleIds: defaultRoleIds,
      isCompanyOwner: false,
      isSystemAdmin: false,
      status: 'active',
    });

    let employee: any = null;
    if (user.email) {
      employee = await this.employeesService.linkUserByEmail(
        company._id,
        user.email,
        userObjectId,
      );
    }

    if (!employee) {
      employee = await this.employeesService.createFromUser(company._id, user);
    }

    if (membership && employee) {
      membership.employeeId = employee._id;
      if (typeof membership.save === 'function') {
        await membership.save();
      } else if (typeof this.membershipModel.findByIdAndUpdate === 'function') {
        await this.membershipModel.findByIdAndUpdate(membership._id, {
          $set: { employeeId: employee._id },
        });
      }
    }

    // TODO: MC-30/MC-34 - Assign default "Employee" role

    return {
      slug: company.slug,
      name: company.name,
    };
  }

  /**
   * Checks whether the user is an active member of the specified company.
   */
  async getMembershipStatus(
    userId: string | Types.ObjectId,
    slug: string,
  ): Promise<{ isMember: boolean }> {
    const cleanSlug = (slug || '').trim().toLowerCase();
    const company = await this.companyModel
      .findOne({ slug: cleanSlug, status: 'active' })
      .select('_id')
      .lean()
      .exec();

    if (!company) {
      throw new NotFoundException('Company not found');
    }

    const membership = await this.membershipModel
      .findOne({
        userId: new Types.ObjectId(userId),
        companyId: company._id,
        status: 'active',
      })
      .select('_id')
      .lean()
      .exec();

    return {
      isMember: !!membership,
    };
  }

  /**
   * Temporary ownership assertion until TenantGuard / @RequireAccess is established in MC-10/MC-11.
   * TODO: Replace with TenantGuard / @RequireAccess in MC-10/MC-11.
   */
  private async assertCompanyOwner(
    userId: string | Types.ObjectId,
    companyId: Types.ObjectId,
  ): Promise<Membership> {
    const membership = await this.membershipModel
      .findOne({
        userId: new Types.ObjectId(userId),
        companyId,
        status: 'active',
      })
      .exec();

    if (!membership || !membership.isCompanyOwner) {
      throw new ForbiddenException('Only the company owner can perform this action');
    }

    return membership;
  }

  /**
   * Regenerates a new secret code for the company. Only callable by company owner.
   * Invalidates previous secret code immediately.
   */
  async regenerateSecretCode(
    userId: string | Types.ObjectId,
    slug: string,
  ): Promise<{ secretCode: string }> {
    const cleanSlug = (slug || '').trim().toLowerCase();
    const company = await this.companyModel
      .findOne({ slug: cleanSlug, status: 'active' })
      .exec();

    if (!company) {
      throw new NotFoundException('Company not found');
    }

    await this.assertCompanyOwner(userId, company._id);

    const secretCode = generateSecretCode();
    const secretCodeHash = await hashSecretCode(secretCode);

    await this.companyModel
      .findByIdAndUpdate(company._id, { $set: { secretCodeHash } })
      .exec();

    return { secretCode };
  }

  /**
   * Updates company profile fields. Only callable by company owner.
   * Disallows modifying slug, secretCodeHash, ownerUserId, or status.
   */
  async update(
    userId: string | Types.ObjectId,
    slug: string,
    dto: UpdateCompanyDto,
  ): Promise<Company> {
    const cleanSlug = (slug || '').trim().toLowerCase();
    const company = await this.companyModel
      .findOne({ slug: cleanSlug, status: 'active' })
      .exec();

    if (!company) {
      throw new NotFoundException('Company not found');
    }

    await this.assertCompanyOwner(userId, company._id);

    const updateData: Record<string, any> = {};

    if (dto.name !== undefined) updateData.name = dto.name.trim();
    if (dto.industry !== undefined) updateData.industry = dto.industry;
    if (dto.sizeRange !== undefined) updateData.sizeRange = dto.sizeRange;
    if (dto.country !== undefined) updateData.country = dto.country;
    if (dto.timezone !== undefined) updateData.timezone = dto.timezone;
    if (dto.currency !== undefined) updateData.currency = dto.currency;
    if (dto.workWeek !== undefined) updateData.workWeek = dto.workWeek;
    if (dto.fiscalYearStart !== undefined) updateData.fiscalYearStart = dto.fiscalYearStart;
    if (dto.contactEmail !== undefined) updateData.contactEmail = dto.contactEmail;
    if (dto.phone !== undefined) updateData.phone = dto.phone;
    if (dto.address !== undefined) updateData.address = dto.address;
    if (dto.website !== undefined) updateData.website = dto.website;
    if (dto.logoUrl !== undefined) updateData.logoUrl = dto.logoUrl;
    if (dto.settings?.requireCodeOnEveryLogin !== undefined) {
      updateData['settings.requireCodeOnEveryLogin'] = dto.settings.requireCodeOnEveryLogin;
    }

    const updated = await this.companyModel
      .findByIdAndUpdate(company._id, { $set: updateData }, { new: true, runValidators: true })
      .select('-secretCodeHash')
      .exec();

    return updated!;
  }

  /**
   * Seeds the 5 default system roles for a newly registered company and returns
   * the System Admin role ObjectId to assign to the company owner's membership.
   */
  private async seedCompanyRolesAndAssignOwner(
    companyId: Types.ObjectId,
    ownerUserId: Types.ObjectId,
    session?: any,
  ): Promise<Types.ObjectId[]> {
    if (!this.roleModel) return [];

    const defaultRoles = buildDefaultRoles([ownerUserId]).map((r) => ({
      ...r,
      companyId,
    }));

    const options = session ? { session } : {};
    const createdRoles = await this.roleModel.create(defaultRoles, options);

    const sysAdminRole = createdRoles.find((r) => r.slug === 'system-admin');
    const assignedRoleIds = sysAdminRole ? [sysAdminRole._id as Types.ObjectId] : [];

    if (this.policyCompilerService) {
      await this.policyCompilerService
        .compileAndPersist(companyId)
        .catch(() => {});
    }

    return assignedRoleIds;
  }
}
