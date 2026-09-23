import { Controller, Get, Query, UseGuards, Request } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { EmployeeActivityQueryDto } from './dto/employee-activity-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('dashboard')
@UseGuards(JwtAuthGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('employee-activity')
  getEmployeeActivity(@Request() req, @Query() query: EmployeeActivityQueryDto) {
    const userId = req.user?.id || req.user?._id;
    return this.dashboardService.getEmployeeActivity(
      query,
      userId?.toString(),
      req.user?.email,
    );
  }
}
