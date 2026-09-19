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
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermission } from '../auth/decorators/permissions.decorator';

@Controller('employees')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class EmployeesController {
  constructor(private readonly employeesService: EmployeesService) {}

  @Post()
  @RequirePermission({ module: 'employees', action: 'create', model: 'employees' })
  create(@Body() createEmployeeDto: any) {
    return this.employeesService.create(createEmployeeDto);
  }

  @Get()
  @RequirePermission({ module: 'employees', action: 'read', model: 'employees' })
  findAll() {
    return this.employeesService.findAll();
  }

  @Get(':id')
  @RequirePermission({ module: 'employees', action: 'read', model: 'employees' })
  findOne(@Param('id') id: string) {
    return this.employeesService.findOne(id);
  }

  /**
   * GET /employees/:id/link-status
   *
   * Returns whether this Employee is linked to a User account.
   * Useful for admins to identify employees that need manual link repair.
   *
   * Response: { linked: boolean, userId: string|null, employeeEmail: string|null }
   */
  @Get(':id/link-status')
  @RequirePermission({ module: 'employees', action: 'read', model: 'employees' })
  async getLinkStatus(@Param('id') id: string) {
    return this.employeesService.getLinkStatus(id);
  }

  /**
   * POST /employees/:id/link-user
   *
   * Triggers verified link repair for the given Employee using the
   * authenticated user's email. The link is only written when:
   *  - The Employee has no userId yet (unlinked).
   *  - The Employee's email matches the requesting user's email.
   *
   * This endpoint is safe to call multiple times (idempotent).
   *
   * Response: { linked: boolean, employee: Employee | null }
   */
  @Post(':id/link-user')
  @RequirePermission({ module: 'employees', action: 'update', model: 'employees' })
  async linkUser(@Param('id') id: string, @Req() req: any) {
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
  @RequirePermission({ module: 'employees', action: 'update', model: 'employees' })
  update(@Param('id') id: string, @Body() updateEmployeeDto: any) {
    return this.employeesService.update(id, updateEmployeeDto);
  }

  @Delete(':id')
  @RequirePermission({ module: 'employees', action: 'delete', model: 'employees' })
  remove(@Param('id') id: string) {
    return this.employeesService.remove(id);
  }
}
