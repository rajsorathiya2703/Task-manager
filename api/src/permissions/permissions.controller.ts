import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AllowAuthenticated } from '../auth/decorators/allow-authenticated.decorator';
import { PERMISSION_CATALOG } from './permissions.catalog';
import type { PermissionCatalog } from './permissions.catalog';

@Controller('permissions')
export class PermissionsController {
  @Get('catalog')
  @AllowAuthenticated()
  getCatalog(): PermissionCatalog {
    return PERMISSION_CATALOG;
  }
}
