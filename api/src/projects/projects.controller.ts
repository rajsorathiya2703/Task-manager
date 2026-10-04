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
  NotFoundException,
} from '@nestjs/common';
import { Types } from 'mongoose';
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RequireAccess } from '../access/decorators/require-access.decorator';
import { CurrentCompany, TenantScoped } from '../common/tenant.decorators';

@Controller('companies/:companySlug/projects')
@UseGuards(JwtAuthGuard)
@TenantScoped()
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Post()
  @RequireAccess({ module: 'projects', action: 'create' })
  create(
    @CurrentCompany() companyId: Types.ObjectId,
    @Request() req: any,
    @Body() createProjectDto: CreateProjectDto,
  ) {
    if (createProjectDto && typeof createProjectDto === 'object') {
      delete (createProjectDto as any).companyId;
    }
    const userId = req.user?.id || req.user?._id;
    return this.projectsService.create(companyId, userId?.toString(), createProjectDto);
  }

  @Get()
  @RequireAccess({ module: 'projects', action: 'read' })
  findAll(
    @CurrentCompany() companyId: Types.ObjectId,
    @Request() req: any,
  ) {
    const isSystemAdmin = req.user?.is_system_admin === true;
    const scope = req.access?.projects?.scope || req.accessDecision?.scope || 'own';
    const userId = req.user?.id || req.user?._id;
    return this.projectsService.findAll(companyId, userId?.toString(), req.user?.email, isSystemAdmin, scope);
  }

  @Get(':id')
  @RequireAccess({ module: 'projects', action: 'read' })
  async findOne(
    @CurrentCompany() companyId: Types.ObjectId,
    @Request() req: any,
    @Param('id') id: string,
  ) {
    const isSystemAdmin = req.user?.is_system_admin === true;
    const scope = req.access?.projects?.scope || req.accessDecision?.scope || 'own';
    const userId = req.user?.id || req.user?._id;
    const project = await this.projectsService.findOne(companyId, id, userId?.toString(), req.user?.email, isSystemAdmin, scope);
    if (!project) {
      throw new NotFoundException(`Project #${id} not found`);
    }
    return project;
  }

  @Patch(':id')
  @RequireAccess({ module: 'projects', action: 'update' })
  update(
    @CurrentCompany() companyId: Types.ObjectId,
    @Request() req: any,
    @Param('id') id: string,
    @Body() updateProjectDto: UpdateProjectDto,
  ) {
    if (updateProjectDto && typeof updateProjectDto === 'object') {
      delete (updateProjectDto as any).companyId;
    }
    const isSystemAdmin = req.user?.is_system_admin === true;
    const scope = req.access?.projects?.scope || req.accessDecision?.scope || 'own';
    const userId = req.user?.id || req.user?._id;
    return this.projectsService.update(companyId, id, updateProjectDto, userId?.toString(), req.user?.email, isSystemAdmin, scope);
  }

  @Delete(':id')
  @RequireAccess({ module: 'projects', action: 'delete' })
  remove(
    @CurrentCompany() companyId: Types.ObjectId,
    @Request() req: any,
    @Param('id') id: string,
  ) {
    const isSystemAdmin = req.user?.is_system_admin === true;
    const scope = req.access?.projects?.scope || req.accessDecision?.scope || 'own';
    const userId = req.user?.id || req.user?._id;
    return this.projectsService.remove(companyId, id, userId?.toString(), req.user?.email, isSystemAdmin, scope);
  }
}
