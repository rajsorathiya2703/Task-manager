import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request } from '@nestjs/common';
import { TeamsService } from './teams.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('teams')
@UseGuards(JwtAuthGuard)
export class TeamsController {
  constructor(private readonly teamsService: TeamsService) {}

  @Post()
  create(@Body() createTeamDto: any) {
    return this.teamsService.create(createTeamDto);
  }

  @Get()
  findAll(@Request() req) {
    const userId = req.user?.id || req.user?._id;
    return this.teamsService.findAll(userId?.toString(), req.user?.email, true, 'all');
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req) {
    const userId = req.user?.id || req.user?._id;
    return this.teamsService.findOne(id, userId?.toString(), req.user?.email, true, 'all');
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateTeamDto: any, @Request() req) {
    const userId = req.user?.id || req.user?._id;
    return this.teamsService.update(id, updateTeamDto, userId?.toString(), req.user?.email, true, 'all');
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req) {
    const userId = req.user?.id || req.user?._id;
    return this.teamsService.remove(id, userId?.toString(), req.user?.email, true, 'all');
  }

  @Get(':id/active-tasks')
  getActiveTasks(@Param('id') id: string, @Request() req) {
    const userId = req.user?.id || req.user?._id;
    return this.teamsService.getActiveTasks(id, userId?.toString(), req.user?.email, true, 'all');
  }

  // ── Comment Endpoints ──

  @Post(':id/comments')
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
  updateComment(
    @Request() req,
    @Param('id') id: string,
    @Param('commentId') commentId: string,
    @Body() updateData: any,
  ) {
    return this.teamsService.updateComment(id, commentId, updateData, req.user.id, req.user.email, req.user);
  }

  @Delete(':id/comments/:commentId')
  deleteComment(
    @Request() req,
    @Param('id') id: string,
    @Param('commentId') commentId: string,
  ) {
    return this.teamsService.deleteComment(id, commentId, req.user.id, req.user.email, req.user);
  }
}
