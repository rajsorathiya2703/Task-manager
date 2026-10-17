import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { IS_PUBLIC_KEY } from '../auth/decorators/public.decorator';
import { SKIP_TRIAL_KEY } from './skip-trial-check.decorator';
import { CompaniesService } from './companies.service';
import { Company } from './schemas/company.schema';
import {
  TRIAL_EXPIRED_CODE,
  TRIAL_EXPIRED_MESSAGE,
} from './subscription.constants';

@Injectable()
export class TrialGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly companiesService: CompaniesService,
    private readonly configService: ConfigService,
    @InjectModel(Company.name) private readonly companyModel: Model<Company>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // 1. If handler or class has IS_PUBLIC_KEY or SKIP_TRIAL_KEY -> true
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    const skipTrial = this.reflector.getAllAndOverride<boolean>(SKIP_TRIAL_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic || skipTrial) {
      return true;
    }

    const req = context.switchToHttp().getRequest();

    // Per-request cache: if already evaluated on this request -> true
    if (req._trialCheckPassed) {
      return true;
    }

    // 2. user = req.user; if no user -> true (JwtAuthGuard handles authentication)
    const user = req.user;
    if (!user) {
      return true;
    }

    // 3. Platform admin bypass: if user.email lowercased === PLATFORM_ADMIN_EMAIL lowercased -> true
    const platformAdminEmail = (
      this.configService.get<string>('PLATFORM_ADMIN_EMAIL') ||
      process.env.PLATFORM_ADMIN_EMAIL ||
      ''
    )
      .toLowerCase()
      .trim();

    if (user.email && user.email.toLowerCase().trim() === platformAdminEmail) {
      req._trialCheckPassed = true;
      return true;
    }

    // 4. Resolve company:
    // First from req.company (attached by TenantGuard)
    let company: any = req.company;

    // Second from companySlug param if req.company is not yet set
    if (!company && req.params?.companySlug) {
      company = await this.companyModel
        .findOne({ slug: req.params.companySlug.toLowerCase().trim() })
        .select('name slug plan subscriptionStatus trialEndsAt status')
        .lean()
        .exec();
    }

    // Third from user.companyId if available
    if (!company && user.companyId) {
      const companyId = Types.ObjectId.isValid(user.companyId)
        ? new Types.ObjectId(user.companyId)
        : user.companyId;

      company = await this.companyModel
        .findById(companyId)
        .select('name slug plan subscriptionStatus trialEndsAt status')
        .lean()
        .exec();
    }

    // If no company context on this request -> true (non-tenant or not yet registered)
    if (!company) {
      return true;
    }

    // 5. Check if access is allowed
    if (this.companiesService.isAccessAllowed(company)) {
      req._trialCheckPassed = true;
      return true;
    }

    // 6. Otherwise throw ForbiddenException with trial expired payload
    const salesEmail =
      this.configService.get<string>('SALES_CONTACT_EMAIL') ||
      process.env.SALES_CONTACT_EMAIL ||
      'sales@example.com';

    throw new ForbiddenException({
      statusCode: 403,
      code: TRIAL_EXPIRED_CODE,
      message: TRIAL_EXPIRED_MESSAGE,
      salesEmail,
    });
  }
}
