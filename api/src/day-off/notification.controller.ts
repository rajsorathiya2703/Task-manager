import { Controller, Get, Patch, Post, Param, Req } from '@nestjs/common';
import { DayOffService } from './day-off.service';
import { Authenticated } from '../auth/decorators/authenticated.decorator';

@Controller('notifications')
export class NotificationController {
  constructor(private readonly dayOffService: DayOffService) {}

  @Get()
  @Authenticated()
  getUserNotifications(@Req() req: any) {
    const userId = req.user?.id || req.user?._id;
    return this.dayOffService.getUserNotifications(userId);
  }

  @Patch(':id/read')
  @Authenticated()
  markAsRead(@Param('id') id: string, @Req() req: any) {
    const userId = req.user?.id || req.user?._id;
    return this.dayOffService.markNotificationAsRead(id, userId);
  }

  @Post('read-all')
  @Authenticated()
  markAllAsRead(@Req() req: any) {
    const userId = req.user?.id || req.user?._id;
    return this.dayOffService.markAllNotificationsAsRead(userId);
  }
}
