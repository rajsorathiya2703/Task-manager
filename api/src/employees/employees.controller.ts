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

@Controller('employees')
@UseGuards(JwtAuthGuard)
export class EmployeesController {
  constructor(private readonly employeesService: EmployeesService) {}

  @Post()
  create(@Body() createEmployeeDto: any) {
    return this.employeesService.create(createEmployeeDto);
  }

  @Get()
  findAll(@Req() req: any) {
    return this.employeesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.employeesService.findOne(id);
  }

  /**
   * GET /employees/:id/link-status
   *
   * Returns whether this Employee is linked to a User account.
   * Response: { linked: boolean, userId: string|null, employeeEmail: string|null }
   */
  @Get(':id/link-status')
  async getLinkStatus(@Param('id') id: string) {
    return this.employeesService.getLinkStatus(id);
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
  update(@Param('id') id: string, @Body() updateEmployeeDto: any) {
    return this.employeesService.update(id, updateEmployeeDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.employeesService.remove(id);
  }
}
