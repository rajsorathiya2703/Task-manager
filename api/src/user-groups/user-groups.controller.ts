import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req } from '@nestjs/common';
import { UserGroupsService } from './user-groups.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermission } from '../auth/decorators/permissions.decorator';

@Controller('user-groups')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class UserGroupsController {
  constructor(private readonly userGroupsService: UserGroupsService) {}

  @Post()
  @RequirePermission({ module: 'settings', action: 'create' })
  create(@Body() createUserGroupDto: any) {
    return this.userGroupsService.create(createUserGroupDto);
  }

  @Get()
  @RequirePermission({ module: 'settings', action: 'read' })
  findAll() {
    return this.userGroupsService.findAll();
  }

  @Get('my-permissions')
  getMyPermissions(@Req() req: any) {
    const userId = req.user?.id || req.user?._id;
    return this.userGroupsService.getUserPermissions(userId?.toString());
  }

  @Get(':id')
  @RequirePermission({ module: 'settings', action: 'read' })
  findOne(@Param('id') id: string) {
    return this.userGroupsService.findOne(id);
  }

  @Patch(':id')
  @RequirePermission({ module: 'settings', action: 'update' })
  update(@Param('id') id: string, @Body() updateUserGroupDto: any) {
    return this.userGroupsService.update(id, updateUserGroupDto);
  }

  @Delete(':id')
  @RequirePermission({ module: 'settings', action: 'delete' })
  remove(@Param('id') id: string) {
    return this.userGroupsService.remove(id);
  }
}
