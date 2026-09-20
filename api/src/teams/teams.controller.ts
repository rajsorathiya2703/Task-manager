import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request } from '@nestjs/common';
import { TeamsService } from './teams.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermission } from '../auth/decorators/permissions.decorator';

@Controller('teams')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class TeamsController {
  constructor(private readonly teamsService: TeamsService) {}

  @Post()
  @RequirePermission({ module: 'teams', action: 'create', model: 'teams' })
  create(@Body() createTeamDto: any) {
    return this.teamsService.create(createTeamDto);
  }

  @Get()
  @RequirePermission({ module: 'teams', action: 'read', model: 'teams' })
  findAll(@Request() req) {
    const userId = req.user?.id || req.user?._id;
    const isSystemAdmin = Boolean(req.isSystemAdmin || req.user?.is_system_admin);
    return this.teamsService.findAll(userId?.toString(), req.user?.email, isSystemAdmin);
  }

  @Get(':id')
  @RequirePermission({ module: 'teams', action: 'read', model: 'teams' })
  findOne(@Param('id') id: string, @Request() req) {
    const userId = req.user?.id || req.user?._id;
    const isSystemAdmin = Boolean(req.isSystemAdmin || req.user?.is_system_admin);
    return this.teamsService.findOne(id, userId?.toString(), req.user?.email, isSystemAdmin);
  }

  @Patch(':id')
  @RequirePermission({ module: 'teams', action: 'update', model: 'teams' })
  update(@Param('id') id: string, @Body() updateTeamDto: any, @Request() req) {
    const userId = req.user?.id || req.user?._id;
    const isSystemAdmin = Boolean(req.isSystemAdmin || req.user?.is_system_admin);
    return this.teamsService.update(id, updateTeamDto, userId?.toString(), req.user?.email, isSystemAdmin);
  }

  @Delete(':id')
  @RequirePermission({ module: 'teams', action: 'delete', model: 'teams' })
  remove(@Param('id') id: string) {
    return this.teamsService.remove(id);
  }

  @Get(':id/active-tasks')
  @RequirePermission({ module: 'teams', action: 'read', model: 'teams' })
  getActiveTasks(@Param('id') id: string, @Request() req) {
    const userId = req.user?.id || req.user?._id;
    const isSystemAdmin = Boolean(req.isSystemAdmin || req.user?.is_system_admin);
    return this.teamsService.getActiveTasks(id, userId?.toString(), req.user?.email, isSystemAdmin);
  }

  // ── Comment Endpoints ──

  @Post(':id/comments')
  @RequirePermission({ module: 'teams', action: 'update', model: 'teams' })
  addComment(@Request() req, @Param('id') id: string, @Body() commentData: any) {
    const userId = req.user?.id || req.user?._id;
    const user = {
      name: req.user.name || req.user.email || 'User',
      avatarUrl: req.user.avatarUrl,
      userId: userId?.toString(),
      email: req.user.email,
    };
    const newComment = { ...commentData, user };
    return this.teamsService.addComment(id, newComment, userId?.toString(), req.user?.email);
  }

  @Patch(':id/comments/:commentId')
  @RequirePermission({ module: 'teams', action: 'update', model: 'teams' })
  updateComment(
    @Request() req,
    @Param('id') id: string,
    @Param('commentId') commentId: string,
    @Body() updateData: any,
  ) {
    return this.teamsService.updateComment(id, commentId, updateData, req.user.id, req.user.email, req.user);
  }

  @Delete(':id/comments/:commentId')
  @RequirePermission({ module: 'teams', action: 'update', model: 'teams' })
  deleteComment(
    @Request() req,
    @Param('id') id: string,
    @Param('commentId') commentId: string,
  ) {
    return this.teamsService.deleteComment(id, commentId, req.user.id, req.user.email, req.user);
  }
}
