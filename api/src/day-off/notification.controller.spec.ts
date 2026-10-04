import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { NotificationController } from './notification.controller';
import { DayOffService } from './day-off.service';
import { Company } from '../companies/schemas/company.schema';
import { Membership } from '../companies/schemas/membership.schema';

describe('NotificationController (MC-28 — Company-Scoped Notifications)', () => {
  let controller: NotificationController;
  let dayOffService: jest.Mocked<DayOffService>;

  const mockCompanyId = new Types.ObjectId();
  const mockUserId = new Types.ObjectId().toString();
  const mockReq = { user: { id: mockUserId } };

  beforeEach(async () => {
    dayOffService = {
      getUserNotifications: jest.fn(),
      markNotificationAsRead: jest.fn(),
      markAllNotificationsAsRead: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [NotificationController],
      providers: [
        { provide: DayOffService, useValue: dayOffService },
        { provide: getModelToken(Company.name), useValue: {} },
        { provide: getModelToken(Membership.name), useValue: {} },
      ],
    }).compile();

    controller = module.get<NotificationController>(NotificationController);
  });

  it('mounts controller under companies/:companySlug/notifications', () => {
    const path = Reflect.getMetadata('path', NotificationController);
    expect(path).toBe('companies/:companySlug/notifications');
  });

  it('delegates getUserNotifications with companyId and userId', async () => {
    dayOffService.getUserNotifications.mockResolvedValue({ list: [], unreadCount: 0 } as any);
    const result = await controller.getUserNotifications(mockCompanyId, mockReq as any);
    expect(dayOffService.getUserNotifications).toHaveBeenCalledWith(mockCompanyId, mockUserId);
    expect(result).toEqual({ list: [], unreadCount: 0 });
  });

  it('delegates markAsRead with companyId, notification id and userId', async () => {
    dayOffService.markNotificationAsRead.mockResolvedValue({ _id: 'notif-1', isRead: true } as any);
    const result = await controller.markAsRead(mockCompanyId, 'notif-1', mockReq as any);
    expect(dayOffService.markNotificationAsRead).toHaveBeenCalledWith(mockCompanyId, 'notif-1', mockUserId);
    expect(result).toEqual({ _id: 'notif-1', isRead: true });
  });

  it('delegates markAllAsRead with companyId and userId', async () => {
    dayOffService.markAllNotificationsAsRead.mockResolvedValue({ success: true } as any);
    const result = await controller.markAllAsRead(mockCompanyId, mockReq as any);
    expect(dayOffService.markAllNotificationsAsRead).toHaveBeenCalledWith(mockCompanyId, mockUserId);
    expect(result).toEqual({ success: true });
  });
});
