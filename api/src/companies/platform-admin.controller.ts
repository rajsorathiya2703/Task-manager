import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Request,
  UseGuards,
} from '@nestjs/common';
import { IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { PlatformAdminGuard } from './platform-admin.guard';
import { PlatformAdminService } from './platform-admin.service';
import { SkipTrialCheck } from './skip-trial-check.decorator';
import { NoTenant } from '../common/tenant.decorators';

export class ExtendTrialDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(365)
  days: number;
}

@NoTenant()
@SkipTrialCheck()
@UseGuards(PlatformAdminGuard)
@Controller('platform-admin')
export class PlatformAdminController {
  constructor(
    private readonly platformAdminService: PlatformAdminService,
  ) {}

  @Get('stats')
  async getStats() {
    return this.platformAdminService.getStats();
  }

  @Get('companies')
  async listCompanies() {
    return this.platformAdminService.listCompanies();
  }

  @Post('companies/:id/activate')
  async activateCompany(@Param('id') id: string, @Request() req: any) {
    const adminEmail = req.user?.email || 'admin';
    return this.platformAdminService.activateCompany(id, adminEmail);
  }

  @Post('companies/:id/extend-trial')
  async extendTrial(
    @Param('id') id: string,
    @Body() dto: ExtendTrialDto,
    @Request() req: any,
  ) {
    const adminEmail = req.user?.email || 'admin';
    return this.platformAdminService.extendTrial(id, dto.days, adminEmail);
  }

  @Post('companies/:id/suspend')
  async suspendCompany(@Param('id') id: string) {
    return this.platformAdminService.suspendCompany(id);
  }
}
