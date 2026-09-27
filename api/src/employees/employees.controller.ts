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
  NotFoundException,
} from '@nestjs/common';
import { EmployeesService } from './employees.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RequireAccess } from '../access/decorators/require-access.decorator';

@Controller('employees')
@UseGuards(JwtAuthGuard)
export class EmployeesController {
  constructor(private readonly employeesService: EmployeesService) {}

  @Post()
  @RequireAccess({ module: 'employees', action: 'create' })
  create(@Body() createEmployeeDto: any) {
    return this.employeesService.create(createEmployeeDto);
  }

  @Get()
  @RequireAccess({ module: 'employees', action: 'read' })
  findAll(@Req() req: any) {
    const isSystemAdmin = req.user?.is_system_admin === true;
    const scope = req.access?.employees?.scope || req.accessDecision?.scope || 'own';
    return this.employeesService.findAll(req.user?.id || req.user?._id, req.user?.email, isSystemAdmin, scope);
  }

  @Get(':id')
  @RequireAccess({ module: 'employees', action: 'read' })
  findOne(@Param('id') id: string, @Req() req: any) {
    const isSystemAdmin = req.user?.is_system_admin === true;
    const scope = req.access?.employees?.scope || req.accessDecision?.scope || 'own';
    return this.employeesService.findOne(id, req.user?.id || req.user?._id, req.user?.email, isSystemAdmin, scope);
  }

  /**
   * GET /employees/:id/link-status
   *
   * Returns whether this Employee is linked to a User account.
   * Response: { linked: boolean, userId: string|null, employeeEmail: string|null }
   */
  @Get(':id/link-status')
  @RequireAccess({ module: 'employees', action: 'read' })
  async getLinkStatus(@Param('id') id: string, @Req() req: any) {
    const isSystemAdmin = req.user?.is_system_admin === true;
    const scope = req.access?.employees?.scope || req.accessDecision?.scope || 'own';
    return this.employeesService.getLinkStatus(id, req.user?.id || req.user?._id, req.user?.email, isSystemAdmin, scope);
  }

  /**
   * POST /employees/:id/link-user
   *
   * Triggers verified link repair for the given Employee using the
   * authenticated user's email.
   *
   * Response: { linked: boolean, employee: Employee | null }
   */
  @Post(':id/link-user')
  @RequireAccess({ module: 'employees', action: 'update' })
  async linkUser(@Param('id') _id: string, @Req() req: any) {
    const userId = req.user?.id || req.user?._id;
    const userEmail = req.user?.email;

    if (!userId || !userEmail) {
      throw new NotFoundException('Authenticated user identity incomplete — cannot link.');
    }

    const employee = await this.employeesService.linkByUserId(userId, userEmail);
    return {
      linked: !!employee,
      employee: employee || null,
    };
  }

  @Patch(':id')
  @RequireAccess({ module: 'employees', action: 'update' })
  update(@Param('id') id: string, @Body() updateEmployeeDto: any, @Req() req: any) {
    const isSystemAdmin = req.user?.is_system_admin === true;
    const scope = req.access?.employees?.scope || req.accessDecision?.scope || 'own';
    return this.employeesService.update(
      id,
      updateEmployeeDto,
      req.user?.id || req.user?._id,
      req.user?.email,
      isSystemAdmin,
      scope,
    );
  }

  @Delete(':id')
  @RequireAccess({ module: 'employees', action: 'delete' })
  remove(@Param('id') id: string, @Req() req: any) {
    const isSystemAdmin = req.user?.is_system_admin === true;
    const scope = req.access?.employees?.scope || req.accessDecision?.scope || 'own';
    return this.employeesService.remove(
      id,
      req.user?.id || req.user?._id,
      req.user?.email,
      isSystemAdmin,
      scope,
    );
  }
}
