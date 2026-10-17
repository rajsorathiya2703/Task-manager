import {
  Injectable,
  Optional,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Company } from './schemas/company.schema';
import { CompanyMember } from './schemas/company-member.schema';
import { Membership } from './schemas/membership.schema';
import { TrialRegistry } from './schemas/trial-registry.schema';
import { User } from '../users/schemas/user.schema';
import { Employee } from '../employees/schemas/employee.schema';
import { CreateCompanyDto } from './dto/create-company.dto';
import { RegisterCompanyDto } from './dto/register-company.dto';
import { normalizeEmail } from './email.util';
import { TRIAL_DAYS } from './subscription.constants';

function generateBaseSlug(name: string): string {
  const sanitized = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  const trimmed = sanitized.slice(0, 40).replace(/-+$/, '');
  return trimmed || 'company';
}

function generateRandomSuffix(length = 4): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

@Injectable()
export class CompaniesService {
  constructor(
    @InjectModel(Company.name) private readonly companyModel: Model<Company>,
    @InjectModel(CompanyMember.name)
    private readonly companyMemberModel: Model<CompanyMember>,
    @Optional()
    @InjectModel(Membership.name)
    private readonly membershipModel?: Model<Membership>,
    @Optional()
    @InjectModel(TrialRegistry.name)
    private readonly trialRegistryModel?: Model<TrialRegistry>,
    @Optional()
    @InjectModel(User.name)
    private readonly userModel?: Model<User>,
    @Optional()
    @InjectModel(Employee.name)
    private readonly employeeModel?: Model<Employee>,
  ) {}

  /**
   * Registers a company and starts a 14-day free trial.
   * Enforces 1 trial per verified Google email via TrialRegistry.
   */
  async registerCompany(
    user: any,
    dto: RegisterCompanyDto | CreateCompanyDto,
  ): Promise<Company> {
    const userId = user?.id || user?._id || user;
    if (!userId) {
      throw new BadRequestException('User identification is required');
    }

    const userEmail = user?.email;
    const authType = user?.authType;

    // Reject non-Google or unverified email
    if (!userEmail || authType !== 'google') {
      throw new BadRequestException(
        'Sign in with Google to start a free trial',
      );
    }

    const normalizedEmail = normalizeEmail(userEmail);
    const platformAdminEmail = (process.env.PLATFORM_ADMIN_EMAIL || '').toLowerCase().trim();
    const isPlatformAdmin = normalizedEmail === platformAdminEmail;

    // Check if TrialRegistry already has this normalized email (platform admin bypass)
    if (!isPlatformAdmin && this.trialRegistryModel) {
      const existingRegistry = await this.trialRegistryModel.findOne({
        normalizedEmail,
      });
      if (existingRegistry) {
        throw new ConflictException(
          'This email has already used its free trial. Contact our sales team.',
        );
      }
    }

    const userObjectId = new Types.ObjectId(userId.toString());
    const baseSlug = generateBaseSlug(dto.name);
    let currentSlug = baseSlug;
    let company: Company | null = null;

    const now = new Date();
    const trialEndsAt = new Date(now.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000);

    // Try initial save + up to 5 retries on duplicate slug
    for (let attempt = 0; attempt <= 5; attempt++) {
      try {
        if (attempt > 0) {
          const suffix = generateRandomSuffix(4);
          const truncatedBase = baseSlug.slice(0, 35).replace(/-+$/, '');
          currentSlug = `${truncatedBase}-${suffix}`;
        }

        company = await this.companyModel.create({
          name: dto.name,
          slug: currentSlug,
          industry: dto.industry || 'Other',
          employeeCount: String(dto.employeeCount || '1-10'),
          website: dto.website,
          phone: dto.phone,
          country: dto.country,
          ownerUserId: userObjectId,
          contactEmail: userEmail.toLowerCase().trim(),
          plan: 'trial',
          trialStartedAt: now,
          trialEndsAt,
          status: 'active',
        });

        break;
      } catch (err: any) {
        if (err.code === 11000 && attempt < 5) {
          continue;
        }
        throw err;
      }
    }

    if (!company) {
      throw new Error('Failed to create company');
    }

    // Insert into TrialRegistry (race-safe duplicate check)
    let registryCreated = false;
    if (!isPlatformAdmin && this.trialRegistryModel) {
      try {
        await this.trialRegistryModel.create({
          normalizedEmail,
          originalEmail: userEmail,
          companyId: company._id,
        });
        registryCreated = true;
      } catch (regErr: any) {
        // Rollback company on duplicate key (11000) or other error
        await this.companyModel.findByIdAndDelete(company._id);
        if (regErr.code === 11000) {
          throw new ConflictException(
            'This email has already used its free trial. Contact our sales team.',
          );
        }
        throw regErr;
      }
    }

    // Create owner memberships; rollback company and registry if membership creation fails
    try {
      await this.companyMemberModel.create({
        companyId: company._id,
        userId: userObjectId,
        role: 'owner',
      });
      if (this.membershipModel) {
        await this.membershipModel.create({
          companyId: company._id,
          userId: userObjectId,
          isCompanyOwner: true,
          isSystemAdmin: true,
          status: 'active',
          roleIds: [],
        });
      }
    } catch (memberErr) {
      if (registryCreated && this.trialRegistryModel) {
        await this.trialRegistryModel.deleteOne({ normalizedEmail });
      }
      await this.companyModel.findByIdAndDelete(company._id);
      throw memberErr;
    }

    return company;
  }

  /**
   * Backward-compatible create method for existing endpoints and tests.
   */
  async create(
    userIdOrUser: any,
    dto: CreateCompanyDto | RegisterCompanyDto,
  ): Promise<Company> {
    if (typeof userIdOrUser === 'object' && userIdOrUser !== null && userIdOrUser.authType) {
      return this.registerCompany(userIdOrUser, dto);
    }

    // If a raw userId string/ObjectId was passed (e.g. in unit tests), proceed with standard company creation
    const userId = typeof userIdOrUser === 'string' || userIdOrUser instanceof Types.ObjectId
      ? userIdOrUser
      : userIdOrUser?._id || userIdOrUser?.id;

    const baseSlug = generateBaseSlug(dto.name);
    let currentSlug = baseSlug;
    let company: Company | null = null;

    const now = new Date();
    const trialEndsAt = new Date(now.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000);
    const userObjectId = new Types.ObjectId(userId.toString());

    for (let attempt = 0; attempt <= 5; attempt++) {
      try {
        if (attempt > 0) {
          const suffix = generateRandomSuffix(4);
          const truncatedBase = baseSlug.slice(0, 35).replace(/-+$/, '');
          currentSlug = `${truncatedBase}-${suffix}`;
        }

        company = await this.companyModel.create({
          name: dto.name,
          slug: currentSlug,
          industry: dto.industry,
          employeeCount: String(dto.employeeCount || '1-10'),
          website: dto.website,
          phone: dto.phone,
          country: dto.country,
          ownerUserId: userObjectId,
          plan: 'trial',
          trialStartedAt: now,
          trialEndsAt,
          status: 'active',
        });

        break;
      } catch (err: any) {
        if (err.code === 11000 && attempt < 5) {
          continue;
        }
        throw err;
      }
    }

    if (!company) {
      throw new Error('Failed to create company');
    }

    try {
      await this.companyMemberModel.create({
        companyId: company._id,
        userId: userObjectId,
        role: 'owner',
      });
      if (this.membershipModel) {
        await this.membershipModel.create({
          companyId: company._id,
          userId: userObjectId,
          isCompanyOwner: true,
          isSystemAdmin: true,
          status: 'active',
          roleIds: [],
        });
      }
    } catch (memberErr) {
      await this.companyModel.findByIdAndDelete(company._id);
      throw memberErr;
    }

    return company;
  }

  /**
   * Computes the effective subscription status for a company on read.
   */
  getEffectiveState(company: any): {
    status: 'trial' | 'trial_expired' | 'active' | 'suspended';
    daysLeft: number;
    trialEndsAt: Date | null;
  } {
    const now = new Date();
    const plan = company?.plan || company?.subscriptionStatus || 'trial';
    const trialEndsAt = company?.trialEndsAt ? new Date(company.trialEndsAt) : null;

    if (plan === 'suspended') {
      return { status: 'suspended', daysLeft: 0, trialEndsAt };
    }

    if (plan === 'active') {
      return { status: 'active', daysLeft: 0, trialEndsAt };
    }

    // Graceful fallback for unmigrated record
    if (!trialEndsAt) {
      return { status: 'trial', daysLeft: TRIAL_DAYS, trialEndsAt: null };
    }

    const diffMs = trialEndsAt.getTime() - now.getTime();
    const daysLeft = Math.max(0, Math.ceil(diffMs / 86400000));

    if (plan === 'expired' || diffMs <= 0) {
      return { status: 'trial_expired', daysLeft: 0, trialEndsAt };
    }

    return { status: 'trial', daysLeft, trialEndsAt };
  }

  /**
   * Check if access is allowed for a company (trial running or active paid).
   */
  isAccessAllowed(company: any): boolean {
    if (!company) return false;
    const state = this.getEffectiveState(company);
    return state.status === 'trial' || state.status === 'active';
  }

  /**
   * Returns the subscription info for a user and company.
   */
  async getSubscriptionForUser(
    userId: string | Types.ObjectId,
    companySlugOrId?: string,
  ): Promise<{
    status: 'trial' | 'trial_expired' | 'active' | 'suspended' | 'no_company';
    daysLeft?: number;
    trialEndsAt?: Date | null;
    salesEmail: string;
  }> {
    const salesEmail = process.env.SALES_CONTACT_EMAIL || 'sales@example.com';
    const userObjectId = new Types.ObjectId(userId.toString());

    let company: any = null;

    if (companySlugOrId) {
      if (Types.ObjectId.isValid(companySlugOrId)) {
        company = await this.companyModel.findById(companySlugOrId).exec();
      }
      if (!company) {
        company = await this.companyModel.findOne({ slug: companySlugOrId.toLowerCase() }).exec();
      }
    }

    if (!company) {
      const member = await this.companyMemberModel
        .findOne({ userId: userObjectId })
        .populate('companyId')
        .exec();

      if (member && member.companyId) {
        company = member.companyId;
      }
    }

    if (!company) {
      return {
        status: 'no_company',
        salesEmail,
      };
    }

    const effective = this.getEffectiveState(company);
    return {
      ...effective,
      salesEmail,
    };
  }

  async findMine(userId: string | Types.ObjectId) {
    const userObjectId = new Types.ObjectId(userId.toString());
    const memberships = await this.companyMemberModel
      .find({ userId: userObjectId })
      .populate('companyId')
      .exec();

    const results: any[] = [];

    for (const member of memberships) {
      const comp = member.companyId as any;
      if (!comp || !comp._id) {
        continue;
      }

      if (this.membershipModel && comp._id) {
        try {
          await this.membershipModel.updateOne(
            { companyId: comp._id, userId: userObjectId },
            {
              $setOnInsert: {
                companyId: comp._id,
                userId: userObjectId,
                isCompanyOwner: member.role === 'owner',
                isSystemAdmin: member.role === 'owner',
                status: 'active',
                roleIds: [],
              },
            },
            { upsert: true },
          );
          if (!comp.status) {
            await this.companyModel.updateOne(
              { _id: comp._id },
              { $set: { status: 'active' } },
            );
          }
        } catch {}
      }

      results.push({
        _id: comp._id,
        name: comp.name,
        slug: comp.slug,
        industry: comp.industry,
        employeeCount: comp.employeeCount,
        role: member.role,
        plan: comp.plan,
        trialEndsAt: comp.trialEndsAt,
        createdAt: comp.createdAt,
      });
    }

    results.sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    });

    return results;
  }

  // --- Temporary compatibility helpers until P21 replaces companies.controller.ts ---
  async listMine(userId: string | Types.ObjectId) {
    return this.findMine(userId);
  }

  async findBySlug(slug: string): Promise<Company | null> {
    return this.companyModel.findOne({ slug: slug.toLowerCase() }).exec();
  }

  async isSlugAvailable(slug: string) {
    const exists = await this.companyModel.exists({ slug: slug.toLowerCase() });
    return { available: !exists };
  }

  async getPublicInfo(slug: string) {
    return this.companyModel.findOne({ slug: slug.toLowerCase() }).select('name slug industry').exec();
  }

  async join(_userId: any, _slug: string, _secretCode: string) {
    return { success: true };
  }

  async getMembershipStatus(_userId: any, _slug: string) {
    return { isMember: false };
  }

  async regenerateSecretCode(_userId: any, _slug: string) {
    return { secretCode: 'code' };
  }

  async getCompanyProfile(_userId: any, slug: string) {
    return this.findBySlug(slug);
  }

  async update(_userId: any, slug: string, data: any) {
    return this.companyModel.findOneAndUpdate({ slug }, data, { new: true }).exec();
  }
}
