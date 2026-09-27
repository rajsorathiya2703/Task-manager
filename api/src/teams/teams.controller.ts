import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request } from '@nestjs/common';
import { TeamsService } from './teams.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RequireAccess } from '../access/decorators/require-access.decorator';

@Controller('teams')
@UseGuards(JwtAuthGuard)
export class TeamsController {
  constructor(private readonly teamsService: TeamsService) {}

  @Post()
  @RequireAccess({ module: 'teams', action: 'create' })
  create(@Body() createTeamDto: any) {
    return this.teamsService.create(createTeamDto);
  }

  @Get()
  @RequireAccess({ module: 'teams', action: 'read' })
  findAll(@Request() req) {
    const isSystemAdmin = req.user?.is_system_admin === true;
    const scope = req.access?.teams?.scope || req.accessDecision?.scope || 'own';
    const userId = req.user?.id || req.user?._id;
    return this.teamsService.findAll(userId?.toString(), req.user?.email, isSystemAdmin, scope);
  }

  @Get(':id')
  @RequireAccess({ module: 'teams', action: 'read' })
  findOne(@Param('id') id: string, @Request() req) {
    const isSystemAdmin = req.user?.is_system_admin === true;
    const scope = req.access?.teams?.scope || req.accessDecision?.scope || 'own';
    const userId = req.user?.id || req.user?._id;
    return this.teamsService.findOne(id, userId?.toString(), req.user?.email, isSystemAdmin, scope);
  }

  @Patch(':id')
  @RequireAccess({ module: 'teams', action: 'update' })
  update(@Param('id') id: string, @Body() updateTeamDto: any, @Request() req) {
    const isSystemAdmin = req.user?.is_system_admin === true;
    const scope = req.access?.teams?.scope || req.accessDecision?.scope || 'own';
    const userId = req.user?.id || req.user?._id;
    return this.teamsService.update(id, updateTeamDto, userId?.toString(), req.user?.email, isSystemAdmin, scope);
  }

  @Delete(':id')
  @RequireAccess({ module: 'teams', action: 'delete' })
  remove(@Param('id') id: string, @Request() req) {
    const isSystemAdmin = req.user?.is_system_admin === true;
    const scope = req.access?.teams?.scope || req.accessDecision?.scope || 'own';
    const userId = req.user?.id || req.user?._id;
    return this.teamsService.remove(id, userId?.toString(), req.user?.email, isSystemAdmin, scope);
  }

  @Get(':id/active-tasks')
  @RequireAccess({ module: 'teams', action: 'read' })
  getActiveTasks(@Param('id') id: string, @Request() req) {
    const isSystemAdmin = req.user?.is_system_admin === true;
    const scope = req.access?.teams?.scope || req.accessDecision?.scope || 'own';
    const userId = req.user?.id || req.user?._id;
    return this.teamsService.getActiveTasks(id, userId?.toString(), req.user?.email, isSystemAdmin, scope);
  }

  // ── Comment Endpoints ──

  @Post(':id/comments')
  @RequireAccess({ module: 'teams', action: 'read' })
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
  @RequireAccess({ module: 'teams', action: 'read' })
  updateComment(
    @Request() req,
    @Param('id') id: string,
    @Param('commentId') commentId: string,
    @Body() updateData: any,
  ) {
    return this.teamsService.updateComment(id, commentId, updateData, req.user.id, req.user.email, req.user);
  }

  @Delete(':id/comments/:commentId')
  @RequireAccess({ module: 'teams', action: 'read' })
  deleteComment(
    @Request() req,
    @Param('id') id: string,
    @Param('commentId') commentId: string,
  ) {
    return this.teamsService.deleteComment(id, commentId, req.user.id, req.user.email, req.user);
  }
}
