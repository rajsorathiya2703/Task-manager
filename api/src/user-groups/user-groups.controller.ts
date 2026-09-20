import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Req,
  Query,
} from '@nestjs/common';
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
  create(@Body() createUserGroupDto: CreateUserGroupDto, @Req() req: any) {
    const actor = { id: req.user?.id || req.user?._id?.toString(), email: req.user?.email };
    return this.userGroupsService.create(createUserGroupDto, actor);
  }

  @Get()
  @RequirePermission({ module: 'user-groups', action: 'read' })
  findAll() {
    return this.userGroupsService.findAll();
  }

  @Get('audit')
  @RequirePermission({ module: 'user-groups', action: 'read' })
  getAuditLogs(
    @Query('groupId') groupId?: string,
    @Query('action') action?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.userGroupsService.getAuditLogs({ groupId, action, page, limit });
  }

  @Get('users/:userId/effective-permissions')
  @RequirePermission({ module: 'user-groups', action: 'read' })
  getUserEffectiveAccess(@Param('userId') userId: string) {
    return this.userGroupsService.getUserEffectiveAccessDetails(userId);
  }

  @Post('users/:userId/check')
  @RequirePermission({ module: 'user-groups', action: 'read' })
  checkUserPermission(
    @Param('userId') userId: string,
    @Body()
    body: {
      module: string;
      action: 'create' | 'read' | 'update' | 'delete';
      operation?: string;
      model?: string;
      field?: string;
    },
  ) {
    return this.userGroupsService.checkUserPermission(userId, body);
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
  update(
    @Param('id') id: string,
    @Body() updateUserGroupDto: UpdateUserGroupDto,
    @Req() req: any,
  ) {
    const actor = { id: req.user?.id || req.user?._id?.toString(), email: req.user?.email };
    return this.userGroupsService.update(id, updateUserGroupDto, actor);
  }

  @Delete(':id')
  @RequireSystemAdmin()
  @RequirePermission({ module: 'user-groups', action: 'delete' })
  remove(@Param('id') id: string, @Req() req: any) {
    const actor = { id: req.user?.id || req.user?._id?.toString(), email: req.user?.email };
    return this.userGroupsService.remove(id, actor);
  }

  @Post(':id/members/:userId')
  @RequireSystemAdmin()
  @RequirePermission({ module: 'user-groups', action: 'update' })
  addMember(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @Req() req: any,
  ) {
    const actor = { id: req.user?.id || req.user?._id?.toString(), email: req.user?.email };
    return this.userGroupsService.addUserToGroup(userId, id, actor);
  }

  @Delete(':id/members/:userId')
  @RequireSystemAdmin()
  @RequirePermission({ module: 'user-groups', action: 'update' })
  removeMember(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @Req() req: any,
  ) {
    const actor = { id: req.user?.id || req.user?._id?.toString(), email: req.user?.email };
    return this.userGroupsService.removeUserFromGroup(userId, id, actor);
  }
}
