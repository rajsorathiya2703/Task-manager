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
import { Types } from 'mongoose';
import { CurrentCompany, TenantScoped } from '../common/tenant.decorators';

@Controller('companies/:companySlug/employees')
@UseGuards(JwtAuthGuard)
@TenantScoped()
export class EmployeesController {
  constructor(private readonly employeesService: EmployeesService) {}

  @Post()
  @RequireAccess({ module: 'employees', action: 'create' })
  create(
    @CurrentCompany() companyId: Types.ObjectId,
    @Body() createEmployeeDto: any,
  ) {
    // DO NOT add companyId to the request body; strip any companyId sent by the client
    if (createEmployeeDto && typeof createEmployeeDto === 'object') {
      delete createEmployeeDto.companyId;
    }

    return this.employeesService.create(companyId, createEmployeeDto);
  }

  @Get()
  @RequireAccess({ module: 'employees', action: 'read' })
  findAll(
    @CurrentCompany() companyId: Types.ObjectId,
    @Req() req: any,
  ) {
    const isSystemAdmin = req?.user?.is_system_admin === true;
    const scope = req?.access?.employees?.scope || req?.accessDecision?.scope || 'own';
    return this.employeesService.findAll(
      companyId,
      req?.user?.id || req?.user?._id,
      req?.user?.email,
      isSystemAdmin,
      scope,
    );
  }

  @Get(':id')
  @RequireAccess({ module: 'employees', action: 'read' })
  findOne(
    @CurrentCompany() companyId: Types.ObjectId,
    @Param('id') id: string,
    @Req() req: any,
  ) {
    const isSystemAdmin = req?.user?.is_system_admin === true;
    const scope = req?.access?.employees?.scope || req?.accessDecision?.scope || 'own';
    return this.employeesService.findOne(
      companyId,
      id,
      req?.user?.id || req?.user?._id,
      req?.user?.email,
      isSystemAdmin,
      scope,
    );
  }

  /**
   * GET /companies/:companySlug/employees/:id/link-status
   *
   * Returns whether this Employee is linked to a User account.
   * Response: { linked: boolean, userId: string|null, employeeEmail: string|null }
   */
  @Get(':id/link-status')
  @RequireAccess({ module: 'employees', action: 'read' })
  async getLinkStatus(
    @CurrentCompany() companyId: Types.ObjectId,
    @Param('id') id: string,
    @Req() req: any,
  ) {
    const isSystemAdmin = req?.user?.is_system_admin === true;
    const scope = req?.access?.employees?.scope || req?.accessDecision?.scope || 'own';
    return this.employeesService.getLinkStatus(
      companyId,
      id,
      req?.user?.id || req?.user?._id,
      req?.user?.email,
      isSystemAdmin,
      scope,
    );
  }

  /**
   * POST /companies/:companySlug/employees/:id/link-user
   *
   * Triggers verified link repair for the given Employee within the company.
   *
   * Response: { linked: boolean, employee: Employee | null }
   */
  @Post(':id/link-user')
  @RequireAccess({ module: 'employees', action: 'update' })
  async linkUser(
    @CurrentCompany() companyId: Types.ObjectId,
    @Param('id') id: string,
    @Req() req: any,
  ) {
    const userId = req?.user?.id || req?.user?._id;
    if (!userId) {
      throw new NotFoundException('Authenticated user identity incomplete — cannot link.');
    }

    let emailToMatch = req?.user?.email;
    if (!emailToMatch && Types.ObjectId.isValid(id)) {
      const existing = await this.employeesService.findOne(
        companyId,
        id,
        userId,
        undefined,
        req?.user?.is_system_admin,
        'all',
      );
      emailToMatch = existing?.email;
    }

    if (!emailToMatch) {
      return { linked: false, employee: null };
    }

    const employee = await this.employeesService.linkByUserId(companyId, userId, emailToMatch);
    return {
      linked: !!employee,
      employee: employee || null,
    };
  }

  @Patch(':id')
  @RequireAccess({ module: 'employees', action: 'update' })
  update(
    @CurrentCompany() companyId: Types.ObjectId,
    @Param('id') id: string,
    @Body() updateEmployeeDto: any,
    @Req() req: any,
  ) {
    // DO NOT add companyId to the request body; strip any companyId sent by the client
    if (updateEmployeeDto && typeof updateEmployeeDto === 'object') {
      delete updateEmployeeDto.companyId;
    }

    const isSystemAdmin = req?.user?.is_system_admin === true;
    const scope = req?.access?.employees?.scope || req?.accessDecision?.scope || 'own';
    return this.employeesService.update(
      companyId,
      id,
      updateEmployeeDto,
      req?.user?.id || req?.user?._id,
      req?.user?.email,
      isSystemAdmin,
      scope,
    );
  }

  @Delete(':id')
  @RequireAccess({ module: 'employees', action: 'delete' })
  remove(
    @CurrentCompany() companyId: Types.ObjectId,
    @Param('id') id: string,
    @Req() req: any,
  ) {
    const isSystemAdmin = req?.user?.is_system_admin === true;
    const scope = req?.access?.employees?.scope || req?.accessDecision?.scope || 'own';
    return this.employeesService.remove(
      companyId,
      id,
      req?.user?.id || req?.user?._id,
      req?.user?.email,
      isSystemAdmin,
      scope,
    );
  }
}
