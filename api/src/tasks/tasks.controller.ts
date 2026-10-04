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
  Query,
  UseInterceptors,
  UploadedFiles,
  BadRequestException,
  NotFoundException,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { FilesInterceptor } from '@nestjs/platform-express';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { RequireAccess } from '../access/decorators/require-access.decorator';
import { CurrentCompany, TenantScoped } from '../common/tenant.decorators';
import { Types } from 'mongoose';

function validateAttachmentFile(file: Express.Multer.File) {
  if (!file) {
    throw new BadRequestException('No file provided');
  }

  const ext = file.originalname ? file.originalname.split('.').pop()?.toLowerCase() || '' : '';
  const mimetype = (file.mimetype || '').toLowerCase();

  const isPdf = mimetype === 'application/pdf' || ext === 'pdf';
  const isVideo =
    mimetype.startsWith('video/') ||
    ['mp4', 'webm', 'ogg', 'mov', 'avi', 'mkv', 'm4v', 'flv', 'wmv', '3gp', 'ts'].includes(ext);
  const isImage =
    mimetype.startsWith('image/') ||
    ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico', 'tiff', 'tif', 'heic', 'avif'].includes(ext);

  if (!isPdf && !isVideo && !isImage) {
    throw new BadRequestException(
      `File "${file.originalname}" has an unsupported format. Supported formats: images, videos (up to 10MB), and PDFs (up to 2MB).`,
    );
  }

  if (isPdf && file.size > 2 * 1024 * 1024) {
    throw new BadRequestException(
      `PDF document "${file.originalname}" exceeds the 2MB size limit.`,
    );
  }

  if (isVideo && file.size > 10 * 1024 * 1024) {
    throw new BadRequestException(
      `Video "${file.originalname}" exceeds the 10MB size limit.`,
    );
  }

  if (isImage && file.size > 10 * 1024 * 1024) {
    throw new BadRequestException(
      `Image "${file.originalname}" exceeds the 10MB size limit.`,
    );
  }
}

@Controller('companies/:companySlug/tasks')
@UseGuards(JwtAuthGuard)
@TenantScoped()
export class TasksController {
  constructor(
    private readonly tasksService: TasksService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  @Post()
  @RequireAccess({ module: 'tasks', action: 'create' })
  create(
    @CurrentCompany() companyId: Types.ObjectId,
    @Request() req: any,
    @Body() createTaskDto: CreateTaskDto,
  ) {
    if (createTaskDto && typeof createTaskDto === 'object') {
      delete (createTaskDto as any).companyId;
    }
    const isSystemAdmin = req.user?.is_system_admin === true;
    const userId = req.user?.id || req.user?._id;
    return this.tasksService.create(companyId, userId?.toString(), createTaskDto, req.user?.email, isSystemAdmin);
  }

  @Get()
  @RequireAccess({ module: 'tasks', action: 'read' })
  findAll(
    @CurrentCompany() companyId: Types.ObjectId,
    @Request() req: any,
    @Query('projectId') projectId?: string,
  ) {
    const isSystemAdmin = req.user?.is_system_admin === true;
    const scope = req.access?.tasks?.scope || req.accessDecision?.scope || 'own';
    const userId = req.user?.id || req.user?._id;
    return this.tasksService.findAll(companyId, userId?.toString(), req.user?.email, projectId, isSystemAdmin, scope);
  }

  @Get('timeline')
  @RequireAccess({ module: 'timeline', action: 'read' })
  getTimeline(
    @CurrentCompany() companyId: Types.ObjectId,
    @Request() req: any,
    @Query() query: any,
  ) {
    const userId = req.user?.id || req.user?._id;
    return this.tasksService.getTimeline(companyId, userId?.toString(), req.user?.email, query);
  }

  @Get('timer/active')
  @RequireAccess({ module: 'tasks', action: 'read' })
  async getActiveTimer(
    @CurrentCompany() companyId: Types.ObjectId,
    @Request() req: any,
  ) {
    const activeTask = await this.tasksService.getActiveTimer(companyId, req.user?.email);
    return activeTask || null;
  }

  @Get('file/view')
  @RequireAccess({ module: 'tasks', action: 'read' })
  async viewFile(
    @CurrentCompany() companyId: Types.ObjectId,
    @Query('url') fileUrl: string,
    @Query('name') fileName: string,
    @Query('download') download: string,
    @Res() res: Response,
  ) {
    if (!fileUrl) {
      throw new BadRequestException('File URL is required');
    }

    // Validate that the URL is a trusted Cloudinary host or a safe relative path to prevent open redirect
    let isAllowedHost = false;
    try {
      const parsed = new URL(fileUrl, 'http://localhost');
      isAllowedHost =
        parsed.hostname.endsWith('cloudinary.com') ||
        parsed.hostname === 'localhost' ||
        (fileUrl.startsWith('/') && !fileUrl.startsWith('//'));
    } catch {
      isAllowedHost = false;
    }

    if (!isAllowedHost) {
      throw new BadRequestException('Invalid or untrusted file URL host for redirect');
    }

    const fileExistsInCompany = await this.tasksService.verifyFileBelongsToCompany(companyId, fileUrl);
    if (!fileExistsInCompany) {
      throw new NotFoundException('File not found in this company');
    }

    const isPdf =
      fileUrl.toLowerCase().includes('.pdf') ||
      (fileName && fileName.toLowerCase().endsWith('.pdf'));

    const publicId = this.cloudinaryService.extractPublicId(fileUrl);

    if (publicId && isPdf) {
      const fileStreamInfo = await this.cloudinaryService.getFileStream(publicId, 'pdf');
      if (fileStreamInfo) {
        const disposition = download === '1' || download === 'true' ? 'attachment' : 'inline';
        const safeName = (fileName || `${publicId.split('/').pop()}.pdf`).replace(/[^\w\.\-\s]/g, '_');

        res.setHeader('Content-Type', fileStreamInfo.contentType || 'application/pdf');
        res.setHeader('Content-Disposition', `${disposition}; filename="${safeName}"`);
        if (fileStreamInfo.length) {
          res.setHeader('Content-Length', fileStreamInfo.length.toString());
        }

        return fileStreamInfo.stream.pipe(res);
      }
    }

    return res.redirect(fileUrl);
  }

  @Post('upload')
  @RequireAccess({ module: 'tasks', action: 'create' })
  @UseInterceptors(FilesInterceptor('files', 10, { limits: { fileSize: 10 * 1024 * 1024 } }))
  async uploadGenericFiles(@UploadedFiles() files: Express.Multer.File[]) {
    if (!files || files.length === 0) {
      throw new BadRequestException('No files uploaded');
    }

    files.forEach((file) => validateAttachmentFile(file));

    return Promise.all(
      files.map(async (file) => {
        const result: any = await this.cloudinaryService.uploadFile(file);
        return {
          name: file.originalname,
          url: result.secure_url,
          type: 'file' as const,
        };
      })
    );
  }

  @Get(':id')
  @RequireAccess({ module: 'tasks', action: 'read' })
  async findOne(
    @CurrentCompany() companyId: Types.ObjectId,
    @Request() req: any,
    @Param('id') id: string,
  ) {
    const isSystemAdmin = req.user?.is_system_admin === true;
    const scope = req.access?.tasks?.scope || req.accessDecision?.scope || 'own';
    const userId = req.user?.id || req.user?._id;
    const task = await this.tasksService.findOne(companyId, id, userId?.toString(), req.user?.email, isSystemAdmin, scope);
    if (!task) {
      throw new NotFoundException(`Task #${id} not found`);
    }
    return task;
  }

  @Patch(':id')
  @RequireAccess({ module: 'tasks', action: 'update' })
  async update(
    @CurrentCompany() companyId: Types.ObjectId,
    @Request() req: any,
    @Param('id') id: string,
    @Body() updateTaskDto: UpdateTaskDto,
  ) {
    if (updateTaskDto && typeof updateTaskDto === 'object') {
      delete (updateTaskDto as any).companyId;
    }
    const user = {
      name: req.user?.name || req.user?.email || 'User',
      avatarUrl: req.user?.avatarUrl,
      email: req.user?.email,
    };
    const isSystemAdmin = req.user?.is_system_admin === true;
    const scope = req.access?.tasks?.scope || req.accessDecision?.scope || 'own';
    const userId = req.user?.id || req.user?._id;
    const updated = await this.tasksService.update(
      companyId,
      id,
      updateTaskDto,
      userId?.toString(),
      req.user?.email,
      user,
      isSystemAdmin,
      scope,
    );
    if (!updated) {
      throw new NotFoundException(`Task #${id} not found`);
    }
    return updated;
  }

  @Delete(':id')
  @RequireAccess({ module: 'tasks', action: 'delete' })
  async remove(
    @CurrentCompany() companyId: Types.ObjectId,
    @Request() req: any,
    @Param('id') id: string,
  ) {
    const isSystemAdmin = req.user?.is_system_admin === true;
    const scope = req.access?.tasks?.scope || req.accessDecision?.scope || 'own';
    const userId = req.user?.id || req.user?._id;
    const removed = await this.tasksService.remove(
      companyId,
      id,
      userId?.toString(),
      req.user?.email,
      isSystemAdmin,
      scope,
    );
    if (!removed) {
      throw new NotFoundException(`Task #${id} not found`);
    }
    return removed;
  }

  @Post(':id/duplicate')
  @RequireAccess({ module: 'tasks', action: 'create' })
  duplicate(
    @CurrentCompany() companyId: Types.ObjectId,
    @Request() req: any,
    @Param('id') id: string,
  ) {
    const userId = req.user?.id || req.user?._id;
    return this.tasksService.duplicate(companyId, id, userId?.toString(), req.user?.email);
  }

  @Post(':id/upload')
  @RequireAccess({ module: 'tasks', action: 'update' })
  @UseInterceptors(FilesInterceptor('files', 10, { limits: { fileSize: 10 * 1024 * 1024 } }))
  async uploadFiles(
    @CurrentCompany() companyId: Types.ObjectId,
    @Request() req: any,
    @Param('id') id: string,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    if (!files || files.length === 0) {
      throw new BadRequestException('No files uploaded');
    }

    files.forEach((file) => validateAttachmentFile(file));
    
    // Process files and create resource objects via Cloudinary
    const newResources = await Promise.all(
      files.map(async (file) => {
        const result: any = await this.cloudinaryService.uploadFile(file);
        return {
          name: file.originalname,
          url: result.secure_url,
          type: 'file' as const,
        };
      })
    );

    const userId = req.user?.id || req.user?._id;
    const task = await this.tasksService.findOne(companyId, id, userId?.toString(), req.user?.email);
    if (!task) {
      throw new NotFoundException(`Task #${id} not found`);
    }

    const updatedResources = [...(task.resources || []), ...newResources];
    
    const updatedTask = await this.tasksService.update(
      companyId,
      id,
      { resources: updatedResources },
      userId?.toString(),
      req.user?.email,
    );
    return updatedTask;
  }

  @Post(':id/comments')
  @RequireAccess({ module: 'tasks', action: 'read' })
  async addComment(
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
    const task = await this.tasksService.addComment(companyId, id, newComment, userId?.toString(), req.user?.email);
    if (!task) {
      throw new NotFoundException(`Task #${id} not found`);
    }
    return task;
  }

  @Patch(':id/comments/:commentId')
  @RequireAccess({ module: 'tasks', action: 'read' })
  async updateComment(
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
    const task = await this.tasksService.updateComment(
      companyId,
      id,
      commentId,
      updateData,
      userId?.toString(),
      req.user?.email,
      req.user,
    );
    if (!task) {
      throw new NotFoundException(`Task #${id} not found`);
    }
    return task;
  }

  @Delete(':id/comments/:commentId')
  @RequireAccess({ module: 'tasks', action: 'read' })
  async deleteComment(
    @CurrentCompany() companyId: Types.ObjectId,
    @Request() req: any,
    @Param('id') id: string,
    @Param('commentId') commentId: string,
  ) {
    const userId = req.user?.id || req.user?._id;
    const task = await this.tasksService.deleteComment(
      companyId,
      id,
      commentId,
      userId?.toString(),
      req.user?.email,
      req.user,
    );
    if (!task) {
      throw new NotFoundException(`Task #${id} not found`);
    }
    return task;
  }

  @Post(':id/invite')
  @RequireAccess({ module: 'tasks', action: 'update' })
  async inviteMember(
    @CurrentCompany() companyId: Types.ObjectId,
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: { email: string; name: string },
  ) {
    const isSystemAdmin = req.user?.is_system_admin === true;
    const inviterName = req.user?.name || 'A team member';
    const userId = req.user?.id || req.user?._id;
    return this.tasksService.inviteMember(
      companyId,
      id,
      body.email,
      body.name,
      inviterName,
      userId?.toString(),
      req.user?.email,
      isSystemAdmin,
    );
  }

  @Post(':id/timer/start')
  @RequireAccess({ module: 'tasks', action: 'read' })
  async startTimer(
    @CurrentCompany() companyId: Types.ObjectId,
    @Request() req: any,
    @Param('id') id: string,
  ) {
    const user = {
      name: req.user?.name || req.user?.email || 'User',
      email: req.user?.email,
      avatarUrl: req.user?.avatarUrl,
    };
    const userId = req.user?.id || req.user?._id;
    return this.tasksService.startTimer(companyId, id, user, userId?.toString(), req.user?.email);
  }

  @Post(':id/timer/stop')
  @RequireAccess({ module: 'tasks', action: 'read' })
  async stopTimer(
    @CurrentCompany() companyId: Types.ObjectId,
    @Request() req: any,
    @Param('id') id: string,
  ) {
    const user = {
      name: req.user?.name || req.user?.email || 'User',
      email: req.user?.email,
      avatarUrl: req.user?.avatarUrl,
    };
    const userId = req.user?.id || req.user?._id;
    return this.tasksService.stopTimer(companyId, id, user, userId?.toString(), req.user?.email);
  }
}
