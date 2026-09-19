import { Controller, Get, Patch, Post, Param, Req } from '@nestjs/common';
import { DayOffService } from './day-off.service';
import { AllowAuthenticated } from '../auth/decorators/allow-authenticated.decorator';

@Controller('notifications')
@AllowAuthenticated()
export class NotificationController {
  constructor(private readonly dayOffService: DayOffService) {}

  @Get()
  getUserNotifications(@Req() req: any) {
    const userId = req.user?.id || req.user?._id;
    return this.dayOffService.getUserNotifications(userId);
  }

  @Patch(':id/read')
  markAsRead(@Param('id') id: string, @Req() req: any) {
    const userId = req.user?.id || req.user?._id;
    return this.dayOffService.markNotificationAsRead(id, userId);
  }

  @Post('read-all')
  markAllAsRead(@Req() req: any) {
    const userId = req.user?.id || req.user?._id;
    return this.dayOffService.markAllNotificationsAsRead(userId);
  }
}
