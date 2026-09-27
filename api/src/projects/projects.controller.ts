import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RequireAccess } from '../access/decorators/require-access.decorator';

@Controller('projects')
@UseGuards(JwtAuthGuard)
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Post()
  @RequireAccess({ module: 'projects', action: 'create' })
  create(@Request() req, @Body() createProjectDto: CreateProjectDto) {
    return this.projectsService.create(req.user.id, createProjectDto);
  }

  @Get()
  @RequireAccess({ module: 'projects', action: 'read' })
  findAll(@Request() req) {
    const isSystemAdmin = req.user?.is_system_admin === true;
    const scope = req.access?.projects?.scope || req.accessDecision?.scope || 'own';
    return this.projectsService.findAll(req.user?.id, req.user?.email, isSystemAdmin, scope);
  }

  @Get(':id')
  @RequireAccess({ module: 'projects', action: 'read' })
  findOne(@Request() req, @Param('id') id: string) {
    const isSystemAdmin = req.user?.is_system_admin === true;
    const scope = req.access?.projects?.scope || req.accessDecision?.scope || 'own';
    return this.projectsService.findOne(id, req.user?.id, req.user?.email, isSystemAdmin, scope);
  }

  @Patch(':id')
  @RequireAccess({ module: 'projects', action: 'update' })
  update(@Request() req, @Param('id') id: string, @Body() updateProjectDto: UpdateProjectDto) {
    const isSystemAdmin = req.user?.is_system_admin === true;
    const scope = req.access?.projects?.scope || req.accessDecision?.scope || 'own';
    return this.projectsService.update(id, updateProjectDto, req.user?.id, req.user?.email, isSystemAdmin, scope);
  }

  @Delete(':id')
  @RequireAccess({ module: 'projects', action: 'delete' })
  remove(@Request() req, @Param('id') id: string) {
    const isSystemAdmin = req.user?.is_system_admin === true;
    const scope = req.access?.projects?.scope || req.accessDecision?.scope || 'own';
    return this.projectsService.remove(id, req.user?.id, req.user?.email, isSystemAdmin, scope);
  }
}
