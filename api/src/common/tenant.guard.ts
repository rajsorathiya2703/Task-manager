import {
  CanActivate,
  ExecutionContext,
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Company } from '../companies/schemas/company.schema';
import { Membership } from '../companies/schemas/membership.schema';

export const NO_TENANT_KEY = 'noTenant';

@Injectable()
export class TenantGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @InjectModel(Company.name) private readonly companyModel: Model<Company>,
    @InjectModel(Membership.name) private readonly membershipModel: Model<Membership>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isNoTenant = this.reflector.getAllAndOverride<boolean>(NO_TENANT_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isNoTenant) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const companySlug = request.params?.companySlug;

    if (!companySlug) {
      throw new BadRequestException('Missing companySlug parameter');
    }

    const company = await this.companyModel
      .findOne({ slug: companySlug.trim().toLowerCase(), status: 'active' })
      .exec();

    if (!company) {
      throw new NotFoundException('Company not found');
    }

    const userId = request.user?.id || request.user?._id;
    if (!userId) {
      throw new ForbiddenException('User is not authenticated');
    }

    if (request.user?.authType === 'guest') {
      throw new ForbiddenException(
        'Guest accounts cannot use companies. Please sign in with Google.',
      );
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

    request.company = company;
    request.membership = membership;

    return true;
  }
}
