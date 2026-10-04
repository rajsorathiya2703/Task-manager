import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
} from '@nestjs/common';
import { Types } from 'mongoose';
import { TeamsService } from './teams.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RequireAccess } from '../access/decorators/require-access.decorator';
import { CurrentCompany, TenantScoped } from '../common/tenant.decorators';

@Controller('companies/:companySlug/teams')
@UseGuards(JwtAuthGuard)
@TenantScoped()
export class TeamsController {
  constructor(private readonly teamsService: TeamsService) {}

  @Post()
  @RequireAccess({ module: 'teams', action: 'create' })
  create(
    @CurrentCompany() companyId: Types.ObjectId,
    @Body() createTeamDto: any,
  ) {
    if (createTeamDto && typeof createTeamDto === 'object') {
      delete createTeamDto.companyId;
    }
    return this.teamsService.create(companyId, createTeamDto);
  }

  @Get()
  @RequireAccess({ module: 'teams', action: 'read' })
  findAll(
    @CurrentCompany() companyId: Types.ObjectId,
    @Request() req: any,
  ) {
    const isSystemAdmin = req.user?.is_system_admin === true;
    const scope = req.access?.teams?.scope || req.accessDecision?.scope || 'own';
    const userId = req.user?.id || req.user?._id;
    return this.teamsService.findAll(companyId, userId?.toString(), req.user?.email, isSystemAdmin, scope);
  }

  @Get(':id')
  @RequireAccess({ module: 'teams', action: 'read' })
  findOne(
    @CurrentCompany() companyId: Types.ObjectId,
    @Param('id') id: string,
    @Request() req: any,
  ) {
    const isSystemAdmin = req.user?.is_system_admin === true;
    const scope = req.access?.teams?.scope || req.accessDecision?.scope || 'own';
    const userId = req.user?.id || req.user?._id;
    return this.teamsService.findOne(companyId, id, userId?.toString(), req.user?.email, isSystemAdmin, scope);
  }

  @Patch(':id')
  @RequireAccess({ module: 'teams', action: 'update' })
  update(
    @CurrentCompany() companyId: Types.ObjectId,
    @Param('id') id: string,
    @Body() updateTeamDto: any,
    @Request() req: any,
  ) {
    if (updateTeamDto && typeof updateTeamDto === 'object') {
      delete updateTeamDto.companyId;
    }
    const isSystemAdmin = req.user?.is_system_admin === true;
    const scope = req.access?.teams?.scope || req.accessDecision?.scope || 'own';
    const userId = req.user?.id || req.user?._id;
    return this.teamsService.update(companyId, id, updateTeamDto, userId?.toString(), req.user?.email, isSystemAdmin, scope);
  }

  @Delete(':id')
  @RequireAccess({ module: 'teams', action: 'delete' })
  remove(
    @CurrentCompany() companyId: Types.ObjectId,
    @Param('id') id: string,
    @Request() req: any,
  ) {
    const isSystemAdmin = req.user?.is_system_admin === true;
    const scope = req.access?.teams?.scope || req.accessDecision?.scope || 'own';
    const userId = req.user?.id || req.user?._id;
    return this.teamsService.remove(companyId, id, userId?.toString(), req.user?.email, isSystemAdmin, scope);
  }

  @Get(':id/active-tasks')
  @RequireAccess({ module: 'teams', action: 'read' })
  getActiveTasks(
    @CurrentCompany() companyId: Types.ObjectId,
    @Param('id') id: string,
    @Request() req: any,
  ) {
    const isSystemAdmin = req.user?.is_system_admin === true;
    const scope = req.access?.teams?.scope || req.accessDecision?.scope || 'own';
    const userId = req.user?.id || req.user?._id;
    return this.teamsService.getActiveTasks(companyId, id, userId?.toString(), req.user?.email, isSystemAdmin, scope);
  }

  // ── Comment Endpoints ──

  @Post(':id/comments')
  @RequireAccess({ module: 'teams', action: 'read' })
  addComment(
    @CurrentCompany() companyId: Types.ObjectId,
    @Request() req: any,
    @Param('id') id: string,
    @Body() commentData: any,
  ) {
    if (commentData && typeof commentData === 'object') {
      delete commentData.companyId;
    }
    const userId = req.user?.id || req.user?._id;
    const employeeId = req.membership?.employeeId?.toString() || req.membership?.employeeId;
    const user: any = {
      name: req.user?.name || req.user?.email || 'User',
      avatarUrl: req.user?.avatarUrl,
      userId: userId?.toString(),
      email: req.user?.email,
    };
    if (employeeId) {
      user.employeeId = employeeId;
    }
    const newComment = { ...commentData, user };
    return this.teamsService.addComment(companyId, id, newComment, userId?.toString(), req.user?.email);
  }

  @Patch(':id/comments/:commentId')
  @RequireAccess({ module: 'teams', action: 'read' })
  updateComment(
    @CurrentCompany() companyId: Types.ObjectId,
    @Request() req: any,
    @Param('id') id: string,
    @Param('commentId') commentId: string,
    @Body() updateData: any,
  ) {
    if (updateData && typeof updateData === 'object') {
      delete updateData.companyId;
    }
    const userId = req.user?.id || req.user?._id;
    return this.teamsService.updateComment(companyId, id, commentId, updateData, userId?.toString(), req.user?.email, req.user);
  }

  @Delete(':id/comments/:commentId')
  @RequireAccess({ module: 'teams', action: 'read' })
  deleteComment(
    @CurrentCompany() companyId: Types.ObjectId,
    @Request() req: any,
    @Param('id') id: string,
    @Param('commentId') commentId: string,
  ) {
    const userId = req.user?.id || req.user?._id;
    return this.teamsService.deleteComment(companyId, id, commentId, userId?.toString(), req.user?.email, req.user);
  }
}
