import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req } from '@nestjs/common';
import { UserGroupsService } from './user-groups.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermission } from '../auth/decorators/permissions.decorator';
import { RequireSystemAdmin } from '../auth/decorators/system-admin.decorator';
import { AllowAuthenticated } from '../auth/decorators/allow-authenticated.decorator';
import { CreateUserGroupDto } from './dto/create-user-group.dto';
import { UpdateUserGroupDto } from './dto/update-user-group.dto';

@Controller('user-groups')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class UserGroupsController {
  constructor(private readonly userGroupsService: UserGroupsService) {}

  @Post()
  @RequireSystemAdmin()
  @RequirePermission({ module: 'user-groups', action: 'create' })
  create(@Body() createUserGroupDto: CreateUserGroupDto) {
    return this.userGroupsService.create(createUserGroupDto);
  }

  @Get()
  @RequirePermission({ module: 'user-groups', action: 'read' })
  findAll() {
    return this.userGroupsService.findAll();
  }

  @AllowAuthenticated()
  @Get('my-permissions')
  getMyPermissions(@Req() req: any) {
    const userId = req.user?.id || req.user?._id;
    return this.userGroupsService.getUserPermissions(userId?.toString());
  }

  @Get(':id')
  @RequirePermission({ module: 'user-groups', action: 'read' })
  findOne(@Param('id') id: string) {
    return this.userGroupsService.findOne(id);
  }

  @Patch(':id')
  @RequireSystemAdmin()
  @RequirePermission({ module: 'user-groups', action: 'update' })
  update(@Param('id') id: string, @Body() updateUserGroupDto: UpdateUserGroupDto) {
    return this.userGroupsService.update(id, updateUserGroupDto);
  }

  @Delete(':id')
  @RequireSystemAdmin()
  @RequirePermission({ module: 'user-groups', action: 'delete' })
  remove(@Param('id') id: string) {
    return this.userGroupsService.remove(id);
  }
}
