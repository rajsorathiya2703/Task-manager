import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  Request,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { ThrottlerGuard, Throttle } from '@nestjs/throttler';
import { Public } from '../auth/decorators/public.decorator';
import { SkipTrialCheck } from './skip-trial-check.decorator';
import { NoTenant } from '../common/tenant.decorators';
import { CompaniesService } from './companies.service';
import { CreateCompanyDto } from './dto/create-company.dto';
import { RegisterCompanyDto } from './dto/register-company.dto';

@NoTenant()
@Controller('companies')
export class CompaniesController {
  constructor(private readonly companiesService: CompaniesService) {}

  @SkipTrialCheck()
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 10, ttl: 3_600_000 } })
  @Post()
  async create(@Request() req: any, @Body() dto: CreateCompanyDto) {
    return this.companiesService.registerCompany(req.user, dto);
  }

  @SkipTrialCheck()
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 10, ttl: 3_600_000 } })
  @Post('register')
  async register(@Request() req: any, @Body() dto: RegisterCompanyDto) {
    return this.companiesService.registerCompany(req.user, dto);
  }

  @SkipTrialCheck()
  @Get('me/subscription')
  async getMySubscription(
    @Request() req: any,
    @Query('company') companySlug?: string,
  ) {
    const userId = req.user?.id || req.user?._id;
    return this.companiesService.getSubscriptionForUser(userId, companySlug);
  }

  @Get('mine')
  async findMine(@Request() req: any) {
    const userId = req.user?.id || req.user?._id;
    return this.companiesService.findMine(userId);
  }

  @Public()
  @Get('slug-available')
  async isSlugAvailable(@Query('slug') slug: string) {
    return this.companiesService.isSlugAvailable(slug);
  }

  @Public()
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @Get('public/:slug')
  async getPublicInfo(@Param('slug') slug: string) {
    return this.companiesService.getPublicInfo(slug);
  }

  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post(':slug/join')
  async join(
    @Request() req: any,
    @Param('slug') slug: string,
    @Body() body: any,
  ) {
    const userId = req.user?.id || req.user?._id;
    return this.companiesService.join(userId, slug, body?.secretCode);
  }

  @Get(':slug/membership-status')
  async getMembershipStatus(@Request() req: any, @Param('slug') slug: string) {
    const userId = req.user?.id || req.user?._id;
    return this.companiesService.getMembershipStatus(userId, slug);
  }

  @Post(':slug/regenerate-code')
  async regenerateSecretCode(@Request() req: any, @Param('slug') slug: string) {
    const userId = req.user?.id || req.user?._id;
    return this.companiesService.regenerateSecretCode(userId, slug);
  }

  @Get(':slug')
  async getProfile(@Request() req: any, @Param('slug') slug: string) {
    const userId = req.user?.id || req.user?._id;
    return this.companiesService.getCompanyProfile(userId, slug);
  }

  @Patch(':slug')
  async update(
    @Request() req: any,
    @Param('slug') slug: string,
    @Body() updateDto: any,
  ) {
    const userId = req.user?.id || req.user?._id;
    return this.companiesService.update(userId, slug, updateDto);
  }
}
