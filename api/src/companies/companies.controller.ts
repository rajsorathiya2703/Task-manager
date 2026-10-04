import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  Request,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Public } from '../auth/decorators/public.decorator';
import { CompaniesService } from './companies.service';
import { CreateCompanyDto } from './dto/create-company.dto';
import { JoinCompanyDto } from './dto/join-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { NoTenant } from '../common/tenant.decorators';

@NoTenant()
@Controller('companies')
export class CompaniesController {
  constructor(private readonly companiesService: CompaniesService) {}

  /**
   * Registers a new company. The authenticated caller becomes the company owner.
   * Returns the company profile and the one-time plain secret code.
   */
  @Post()
  async create(@Request() req: any, @Body() createCompanyDto: CreateCompanyDto) {
    const userId = req.user?.id || req.user?._id;
    return this.companiesService.create(userId, createCompanyDto);
  }

  /**
   * Lists all companies the authenticated user belongs to.
   */
  @Get('mine')
  async listMine(@Request() req: any) {
    const userId = req.user?.id || req.user?._id;
    return this.companiesService.listMine(userId);
  }

  /**
   * Checks whether a slug is available for registration (public).
   */
  @Public()
  @Get('slug-available')
  async isSlugAvailable(@Query('slug') slug: string) {
    const available = await this.companiesService.isSlugAvailable(slug);
    return { available };
  }

  /**
   * Public endpoint returning minimal branding information (name, slug, logoUrl)
   * for login and join screens. Rate-limited to 30 requests/min to prevent enumeration.
   */
  @Public()
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @Get('public/:slug')
  async getPublicInfo(@Param('slug') slug: string) {
    return this.companiesService.getPublicInfo(slug);
  }

  /**
   * Joins a company using its secret code.
   * Rate limited to 5 attempts per minute to mitigate brute-force guessing.
   */
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post(':slug/join')
  async join(
    @Request() req: any,
    @Param('slug') slug: string,
    @Body() joinCompanyDto: JoinCompanyDto,
  ) {
    const userId = req.user?.id || req.user?._id;
    return this.companiesService.join(userId, slug, joinCompanyDto.secretCode);
  }

  /**
   * Returns whether the authenticated user is an active member of the company.
   */
  @Get(':slug/membership-status')
  async getMembershipStatus(@Request() req: any, @Param('slug') slug: string) {
    const userId = req.user?.id || req.user?._id;
    return this.companiesService.getMembershipStatus(userId, slug);
  }

  /**
   * Regenerates the secret join code. Only permitted for the company owner.
   * Returns the new plain code once.
   */
  @Post(':slug/regenerate-code')
  async regenerateSecretCode(@Request() req: any, @Param('slug') slug: string) {
    const userId = req.user?.id || req.user?._id;
    return this.companiesService.regenerateSecretCode(userId, slug);
  }

  /**
   * Retrieves the full company profile for authenticated members.
   */
  @Get(':slug')
  async getProfile(@Request() req: any, @Param('slug') slug: string) {
    const userId = req.user?.id || req.user?._id;
    return this.companiesService.getCompanyProfile(userId, slug);
  }

  /**
   * Updates company profile fields. Only permitted for the company owner.
   */
  @Patch(':slug')
  async update(
    @Request() req: any,
    @Param('slug') slug: string,
    @Body() updateCompanyDto: UpdateCompanyDto,
  ) {
    const userId = req.user?.id || req.user?._id;
    return this.companiesService.update(userId, slug, updateCompanyDto);
  }
}
