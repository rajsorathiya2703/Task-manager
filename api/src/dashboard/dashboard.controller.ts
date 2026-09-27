import { Controller, Get, Query, UseGuards, Request } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { EmployeeActivityQueryDto } from './dto/employee-activity-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RequireAccess } from '../access/decorators/require-access.decorator';

@Controller('dashboard')
@UseGuards(JwtAuthGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('employee-activity')
  @RequireAccess({ module: 'dashboard', action: 'read' })
  getEmployeeActivity(@Request() req, @Query() query: EmployeeActivityQueryDto) {
    const userId = req.user?.id || req.user?._id;
    const isSystemAdmin = req.user?.is_system_admin === true;
    const scope = req.access?.dashboard?.scope || req.accessDecision?.scope || 'own';

    return this.dashboardService.getEmployeeActivity(
      query,
      userId?.toString(),
      req.user?.email,
      isSystemAdmin,
      scope,
    );
  }
}

