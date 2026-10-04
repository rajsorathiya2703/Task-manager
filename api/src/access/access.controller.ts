import {
  Controller,
  Get,
  Param,
  UseGuards,
  NotFoundException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RequireAccess } from './decorators/require-access.decorator';
import { AccessService } from './access.service';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../users/schemas/user.schema';
import { MODULE_CATALOG } from './catalog';
import { NoTenant } from '../common/tenant.decorators';

/**
 * AccessController (Phase 3 — P3-10)
 *
 * Provides the live access preview endpoint so that admins can
 * inspect the computed effective permissions for any user, as well
 * as the module & field catalog for role builders.
 */
@NoTenant()
@Controller('access')
@UseGuards(JwtAuthGuard)
export class AccessController {
  constructor(
    private readonly accessService: AccessService,
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
  ) {}

  /**
   * GET /access/catalog
   *
   * Returns the registered modules, actions, and fields.
   */
  @Get('catalog')
  @RequireAccess({ module: 'roles', action: 'read' })
  getCatalog() {
    return MODULE_CATALOG;
  }

  /**
   * GET /access/preview/:userId
   *
   * Returns the full EffectiveAccessResult for the target user.
   * Requires the caller to have users.read permission.
   */
  @Get('preview/:userId')
  @RequireAccess({ module: 'users', action: 'read' })
  async previewAccess(@Param('userId') userId: string) {
    // Validate that the target user exists
    const user = await this.userModel.findById(userId).lean().exec();
    if (!user) {
      throw new NotFoundException(`User #${userId} not found`);
    }

    return this.accessService.getEffectiveAccess(userId);
  }
}

