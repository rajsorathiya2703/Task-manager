import { Controller, Get, Post, Body, Patch, Param, Delete, Request } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { RequirePermission } from '../auth/decorators/permissions.decorator';

@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Post()
  @RequirePermission({ module: 'projects', action: 'create', model: 'projects' })
  create(@Request() req, @Body() createProjectDto: CreateProjectDto) {
    return this.projectsService.create(req.user.id, createProjectDto);
  }

  @Get()
  @RequirePermission({ module: 'projects', action: 'read', model: 'projects' })
  findAll(@Request() req) {
    return this.projectsService.findAll(req.user.id, req.user.email);
  }

  @Get(':id')
  @RequirePermission({ module: 'projects', action: 'read', model: 'projects' })
  findOne(@Request() req, @Param('id') id: string) {
    return this.projectsService.findOne(id, req.user.id, req.user.email);
  }

  @Patch(':id')
  @RequirePermission({ module: 'projects', action: 'update', model: 'projects' })
  update(@Request() req, @Param('id') id: string, @Body() updateProjectDto: UpdateProjectDto) {
    return this.projectsService.update(id, updateProjectDto, req.user.id, req.user.email);
  }

  @Delete(':id')
  @RequirePermission({ module: 'projects', action: 'delete', model: 'projects' })
  remove(@Request() req, @Param('id') id: string) {
    return this.projectsService.remove(id, req.user.id, req.user.email);
  }
}
