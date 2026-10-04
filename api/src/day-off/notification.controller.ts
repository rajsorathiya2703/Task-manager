import { Controller, Get, Patch, Post, Param, Req } from '@nestjs/common';
import { Types } from 'mongoose';
import { DayOffService } from './day-off.service';
import { CurrentCompany, TenantScoped } from '../common/tenant.decorators';

@Controller('companies/:companySlug/notifications')
@TenantScoped()
export class NotificationController {
  constructor(private readonly dayOffService: DayOffService) {}

  @Get()
  getUserNotifications(
    @CurrentCompany() companyId: Types.ObjectId,
    @Req() req: any,
  ) {
    const userId = req.user?.id || req.user?._id;
    return this.dayOffService.getUserNotifications(companyId, userId);
  }

  @Patch(':id/read')
  markAsRead(
    @CurrentCompany() companyId: Types.ObjectId,
    @Param('id') id: string,
    @Req() req: any,
  ) {
    const userId = req.user?.id || req.user?._id;
    return this.dayOffService.markNotificationAsRead(companyId, id, userId);
  }

  @Post('read-all')
  markAllAsRead(
    @CurrentCompany() companyId: Types.ObjectId,
    @Req() req: any,
  ) {
    const userId = req.user?.id || req.user?._id;
    return this.dayOffService.markAllNotificationsAsRead(companyId, userId);
  }
}
