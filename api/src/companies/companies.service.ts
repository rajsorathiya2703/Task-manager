import { Injectable, Optional } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Company } from './schemas/company.schema';
import { CompanyMember } from './schemas/company-member.schema';
import { Membership } from './schemas/membership.schema';
import { CreateCompanyDto } from './dto/create-company.dto';

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
  ) {}

  async create(
    userId: string | Types.ObjectId,
    dto: CreateCompanyDto,
  ): Promise<Company> {
    const baseSlug = generateBaseSlug(dto.name);
    let currentSlug = baseSlug;
    let company: Company | null = null;

    const now = new Date();
    const trialEndsAt = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
    const userObjectId = new Types.ObjectId(userId.toString());

    // Try initial save + up to 5 retries on duplicate slug (code 11000)
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
          employeeCount: dto.employeeCount,
          website: dto.website,
          phone: dto.phone,
          country: dto.country,
          ownerUserId: userObjectId,
          plan: 'trial',
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

    // Create owner membership; if it fails, rollback company and rethrow
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

      // Ensure backward compatibility: activate status & sync Membership for multi-company workspace
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
