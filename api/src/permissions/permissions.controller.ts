import { Controller, Get } from '@nestjs/common';
import { Authenticated } from '../auth/decorators/authenticated.decorator';
import { PERMISSION_CATALOG } from './permission-catalog';

@Controller('permissions')
export class PermissionsController {
  /**
   * GET /permissions/catalog
   *
   * Returns the full permission catalog so the frontend can dynamically
   * build the group editor without hard-coding module/operation/field lists.
   *
   * Accessible to any authenticated user.
   */
  @Get('catalog')
  @Authenticated()
  getCatalog() {
    return PERMISSION_CATALOG;
  }
}
