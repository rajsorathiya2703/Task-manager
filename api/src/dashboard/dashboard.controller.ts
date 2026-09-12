import { Controller, Get, Query, UseGuards, Request } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { EmployeeActivityQueryDto } from './dto/employee-activity-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermission } from '../auth/decorators/permissions.decorator';

@Controller('dashboard')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('employee-activity')
  @RequirePermission({ module: 'reports', action: 'read' })
  getEmployeeActivity(@Request() req, @Query() query: EmployeeActivityQueryDto) {
    return this.dashboardService.getEmployeeActivity(query, req.user?.id, req.user?.email);
  }
}
