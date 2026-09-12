import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request, Query, UseInterceptors, UploadedFiles, BadRequestException } from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermission } from '../auth/decorators/permissions.decorator';
import { CloudinaryService } from '../cloudinary/cloudinary.service';

@Controller('tasks')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class TasksController {
  constructor(
    private readonly tasksService: TasksService,
    private readonly cloudinaryService: CloudinaryService
  ) {}

  @Post()
  @RequirePermission({ module: 'tasks', action: 'create', model: 'tasks' })
  create(@Request() req, @Body() createTaskDto: CreateTaskDto) {
    return this.tasksService.create(req.user.id, createTaskDto, req.user.email);
  }

  @Get()
  @RequirePermission({ module: 'tasks', action: 'read', model: 'tasks' })
  findAll(@Request() req, @Query('projectId') projectId?: string) {
    return this.tasksService.findAll(req.user.id, req.user.email, projectId);
  }

  @Get('timeline')
  @RequirePermission({ module: 'tasks', action: 'read', model: 'tasks' })
  getTimeline(@Request() req, @Query() query: any) {
    return this.tasksService.getTimeline(req.user.id, req.user.email, query);
  }

  @Get('timer/active')
  async getActiveTimer(@Request() req) {
    const activeTask = await this.tasksService.getActiveTimer(req.user.email);
    return activeTask || null;
  }

  @Get(':id')
  @RequirePermission({ module: 'tasks', action: 'read', model: 'tasks' })
  findOne(@Request() req, @Param('id') id: string) {
    return this.tasksService.findOne(id, req.user.id, req.user.email);
  }

  @Patch(':id')
  @RequirePermission({ module: 'tasks', action: 'update', model: 'tasks' })
  update(@Request() req, @Param('id') id: string, @Body() updateTaskDto: UpdateTaskDto) {
    const user = {
      name: req.user?.name || req.user?.email || 'User',
      avatarUrl: req.user?.avatarUrl,
      email: req.user?.email,
    };
    return this.tasksService.update(id, updateTaskDto, req.user.id, req.user.email, user);
  }

  @Delete(':id')
  @RequirePermission({ module: 'tasks', action: 'delete', model: 'tasks' })
  remove(@Request() req, @Param('id') id: string) {
    return this.tasksService.remove(id, req.user.id, req.user.email);
  }

  @Post(':id/duplicate')
  @RequirePermission({ module: 'tasks', action: 'create', model: 'tasks' })
  duplicate(@Request() req, @Param('id') id: string) {
    return this.tasksService.duplicate(id, req.user.id, req.user.email);
  }

  @Post(':id/upload')
  @RequirePermission({ module: 'tasks', action: 'update', model: 'tasks' })
  @UseInterceptors(FilesInterceptor('files', 10))
  async uploadFiles(
    @Request() req,
    @Param('id') id: string,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    if (!files || files.length === 0) {
      throw new BadRequestException('No files uploaded');
    }
    
    // Process files and create resource objects via Cloudinary
    const newResources = await Promise.all(
      files.map(async (file) => {
        const result: any = await this.cloudinaryService.uploadFile(file);
        return {
          name: file.originalname,
          url: result.secure_url,
          type: 'file' as const
        };
      })
    );

    // Find the task and append the new resources
    const task = await this.tasksService.findOne(id, req.user.id, req.user.email);
    if (!task) {
      throw new BadRequestException('Task not found');
    }

    const updatedResources = [...(task.resources || []), ...newResources];
    
    // We update using tasksService.update
    const updatedTask = await this.tasksService.update(id, { resources: updatedResources }, req.user.id, req.user.email);
    return updatedTask;
  }

  @Post('upload')
  @UseInterceptors(FilesInterceptor('files', 10))
  async uploadGenericFiles(@UploadedFiles() files: Express.Multer.File[]) {
    if (!files || files.length === 0) {
      throw new BadRequestException('No files uploaded');
    }
    return Promise.all(
      files.map(async (file) => {
        const result: any = await this.cloudinaryService.uploadFile(file);
        return {
          name: file.originalname,
          url: result.secure_url,
          type: 'file' as const
        };
      })
    );
  }

  @Post(':id/comments')
  @RequirePermission({ module: 'tasks', action: 'update', model: 'tasks' })
  async addComment(
    @Request() req,
    @Param('id') id: string,
    @Body() commentData: any,
  ) {
    const user = {
      name: req.user.name || req.user.email || 'User',
      avatarUrl: req.user.avatarUrl,
      userId: (req.user.id || req.user._id)?.toString(),
      email: req.user.email,
    };
    const newComment = { ...commentData, user };
    return this.tasksService.addComment(id, newComment, req.user.id, req.user.email);
  }

  @Patch(':id/comments/:commentId')
  @RequirePermission({ module: 'tasks', action: 'update', model: 'tasks' })
  async updateComment(
    @Request() req,
    @Param('id') id: string,
    @Param('commentId') commentId: string,
    @Body() updateData: any,
  ) {
    return this.tasksService.updateComment(id, commentId, updateData, req.user.id, req.user.email, req.user);
  }

  @Delete(':id/comments/:commentId')
  @RequirePermission({ module: 'tasks', action: 'update', model: 'tasks' })
  async deleteComment(
    @Request() req,
    @Param('id') id: string,
    @Param('commentId') commentId: string,
  ) {
    return this.tasksService.deleteComment(id, commentId, req.user.id, req.user.email, req.user);
  }

  @Post(':id/invite')
  @RequirePermission({ module: 'tasks', action: 'update', model: 'tasks' })
  async inviteMember(
    @Request() req,
    @Param('id') id: string,
    @Body() body: { email: string; name: string },
  ) {
    try {
      const inviterName = req.user?.name || 'A team member';
      return await this.tasksService.inviteMember(id, body.email, body.name, inviterName, req.user.id, req.user.email);
    } catch (e) {
      require('fs').writeFileSync('invite-error.log', e.stack || e.message);
      throw e;
    }
  }

  @Post(':id/timer/start')
  async startTimer(@Request() req, @Param('id') id: string) {
    const user = {
      name: req.user?.name || req.user?.email || 'User',
      email: req.user?.email,
      avatarUrl: req.user?.avatarUrl,
    };
    return this.tasksService.startTimer(id, user, req.user.id, req.user.email);
  }

  @Post(':id/timer/stop')
  async stopTimer(@Request() req, @Param('id') id: string) {
    const user = {
      name: req.user?.name || req.user?.email || 'User',
      email: req.user?.email,
      avatarUrl: req.user?.avatarUrl,
    };
    return this.tasksService.stopTimer(id, user, req.user.id, req.user.email);
  }
}
