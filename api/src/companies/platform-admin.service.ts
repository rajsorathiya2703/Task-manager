import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Optional,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Company } from './schemas/company.schema';
import { Employee } from '../employees/schemas/employee.schema';
import { Membership } from './schemas/membership.schema';
import { CompaniesService } from './companies.service';

@Injectable()
export class PlatformAdminService {
  constructor(
    @InjectModel(Company.name) private readonly companyModel: Model<Company>,
    private readonly companiesService: CompaniesService,
    @Optional()
    @InjectModel(Employee.name)
    private readonly employeeModel?: Model<Employee>,
    @Optional()
    @InjectModel(Membership.name)
    private readonly membershipModel?: Model<Membership>,
  ) {}

  /**
   * Aggregates summary statistics for the platform admin dashboard.
   */
  async getStats(): Promise<{
    totalCompanies: number;
    onTrial: number;
    trialExpired: number;
    converted: number;
    suspended: number;
  }> {
    const now = new Date();

    const [
      totalCompanies,
      onTrial,
      trialExpired,
      converted,
      suspended,
    ] = await Promise.all([
      this.companyModel.countDocuments().exec(),
      this.companyModel
        .countDocuments({
          $or: [
            { plan: 'trial', trialEndsAt: { $gte: now } },
            { plan: 'trial', trialEndsAt: { $exists: false } },
            { subscriptionStatus: 'trial', trialEndsAt: { $gte: now } },
          ],
        })
        .exec(),
      this.companyModel
        .countDocuments({
          $or: [
            { plan: 'trial', trialEndsAt: { $lt: now } },
            { plan: 'expired' },
            { subscriptionStatus: 'trial', trialEndsAt: { $lt: now } },
            { subscriptionStatus: 'expired' },
          ],
        })
        .exec(),
      this.companyModel
        .countDocuments({
          $or: [
            { plan: 'active' },
            { subscriptionStatus: 'active' },
          ],
        })
        .exec(),
      this.companyModel
        .countDocuments({
          $or: [
            { plan: 'suspended' },
            { subscriptionStatus: 'suspended' },
          ],
        })
        .exec(),
    ]);

    return {
      totalCompanies,
      onTrial,
      trialExpired,
      converted,
      suspended,
    };
  }

  /**
   * Lists all companies sorted by createdAt desc with declared + actual employee counts and effective status.
   */
  async listCompanies(): Promise<any[]> {
    const companies = await this.companyModel
      .find()
      .sort({ createdAt: -1 })
      .lean()
      .exec();

    const results = await Promise.all(
      companies.map(async (comp: any) => {
        let actualEmployeeCount = 0;

        // Count actual members via Membership (preferred) or Employee model
        if (this.membershipModel && comp._id) {
          actualEmployeeCount = await this.membershipModel
            .countDocuments({ companyId: comp._id, status: 'active' })
            .exec();
        } else if (this.employeeModel && comp._id) {
          actualEmployeeCount = await this.employeeModel
            .countDocuments({ companyId: comp._id })
            .exec();
        }

        const effective = this.companiesService.getEffectiveState(comp);

        return {
          _id: comp._id,
          name: comp.name,
          slug: comp.slug,
          industry: comp.industry || '',
          country: comp.country || '',
          contactEmail: comp.contactEmail || '',
          declaredEmployeeCount: comp.employeeCount || '',
          actualEmployeeCount,
          effectiveStatus: effective.status,
          status: effective.status,
          plan: comp.plan || effective.status,
          trialStartedAt: comp.trialStartedAt || comp.createdAt,
          trialEndsAt: comp.trialEndsAt,
          daysLeft: effective.daysLeft,
          convertedAt: comp.convertedAt,
          accessGrantedBy: comp.accessGrantedBy,
          accessGrantedAt: comp.accessGrantedAt,
          createdAt: comp.createdAt,
        };
      }),
    );

    return results;
  }

  /**
   * Activates a company (marks as purchased/paid).
   */
  async activateCompany(id: string, adminEmail: string): Promise<Company> {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Company not found');
    }

    const now = new Date();
    const existing = await this.companyModel.findById(id).exec();
    if (!existing) {
      throw new NotFoundException('Company not found');
    }

    existing.plan = 'active';
    existing.subscriptionStatus = 'active';
    existing.convertedAt = existing.convertedAt || now;
    existing.accessGrantedBy = adminEmail;
    existing.accessGrantedAt = now;

    await existing.save();
    return existing;
  }

  /**
   * Extends the trial for a company by N days (1..365).
   */
  async extendTrial(
    id: string,
    days: number,
    adminEmail: string,
  ): Promise<Company> {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Company not found');
    }

    if (!days || typeof days !== 'number' || days < 1 || days > 365) {
      throw new BadRequestException('Days must be a number between 1 and 365');
    }

    const company = await this.companyModel.findById(id).exec();
    if (!company) {
      throw new NotFoundException('Company not found');
    }

    const now = new Date();
    const currentEnd = company.trialEndsAt ? new Date(company.trialEndsAt) : now;
    const baseDate = currentEnd.getTime() > now.getTime() ? currentEnd : now;
    const newTrialEndsAt = new Date(
      baseDate.getTime() + days * 24 * 60 * 60 * 1000,
    );

    company.plan = 'trial';
    company.subscriptionStatus = 'trial';
    company.trialEndsAt = newTrialEndsAt;
    company.accessGrantedBy = adminEmail;
    company.accessGrantedAt = now;

    await company.save();
    return company;
  }

  /**
   * Suspends a company's access.
   */
  async suspendCompany(id: string): Promise<Company> {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Company not found');
    }

    const company = await this.companyModel.findById(id).exec();
    if (!company) {
      throw new NotFoundException('Company not found');
    }

    company.plan = 'suspended';
    company.subscriptionStatus = 'suspended';

    await company.save();
    return company;
  }
}
