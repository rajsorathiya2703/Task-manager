import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req } from '@nestjs/common';
import { UserGroupsService } from './user-groups.service';
import { RequirePermission } from '../auth/decorators/permissions.decorator';
import { Authenticated } from '../auth/decorators/authenticated.decorator';
import { SystemAdminGuard } from '../auth/guards/system-admin.guard';

@Controller('user-groups')
export class UserGroupsController {
  constructor(private readonly userGroupsService: UserGroupsService) {}

  @Post()
  @RequirePermission({ module: 'user-groups', action: 'create' })
  @UseGuards(SystemAdminGuard)
  create(@Body() createUserGroupDto: any) {
    return this.userGroupsService.create(createUserGroupDto);
  }

  @Get()
  @RequirePermission({ module: 'user-groups', action: 'read' })
  findAll() {
    return this.userGroupsService.findAll();
  }

  /**
   * GET /user-groups/my-permissions
   *
   * Returns the calling user's effective permissions.
   * Accessible to any authenticated user (no module permission required).
   */
  @Get('my-permissions')
  @Authenticated()
  async getMyPermissions(@Req() req: any) {
    const userId = req.user?.id || req.user?._id;
    const perms = await this.userGroupsService.getUserPermissions(userId?.toString());
    return {
      ...perms,
      is_system_admin: req.user?.is_system_admin === true,
    };
  }

  @Get(':id')
  @RequirePermission({ module: 'user-groups', action: 'read' })
  findOne(@Param('id') id: string) {
    return this.userGroupsService.findOne(id);
  }

  @Patch(':id')
  @RequirePermission({ module: 'user-groups', action: 'update' })
  @UseGuards(SystemAdminGuard)
  update(@Param('id') id: string, @Body() updateUserGroupDto: any) {
    return this.userGroupsService.update(id, updateUserGroupDto);
  }

  @Delete(':id')
  @RequirePermission({ module: 'user-groups', action: 'delete' })
  @UseGuards(SystemAdminGuard)
  remove(@Param('id') id: string) {
    return this.userGroupsService.remove(id);
  }
}
