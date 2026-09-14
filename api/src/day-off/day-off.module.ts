import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { LeaveType, LeaveTypeSchema } from './schemas/leave-type.schema';
import { LeaveApplication, LeaveApplicationSchema } from './schemas/leave-application.schema';
import { DayOffSettings, DayOffSettingsSchema } from './schemas/day-off-settings.schema';
import { LeaveBalance, LeaveBalanceSchema } from './schemas/leave-balance.schema';
import { Notification, NotificationSchema } from './schemas/notification.schema';
import { Employee, EmployeeSchema } from '../employees/schemas/employee.schema';
import { DayOffService } from './day-off.service';
import { DayOffMailService } from './day-off-mail.service';
import { DayOffController } from './day-off.controller';
import { NotificationController } from './notification.controller';
import { EmployeesModule } from '../employees/employees.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: LeaveType.name, schema: LeaveTypeSchema },
      { name: LeaveApplication.name, schema: LeaveApplicationSchema },
      { name: DayOffSettings.name, schema: DayOffSettingsSchema },
      { name: LeaveBalance.name, schema: LeaveBalanceSchema },
      { name: Notification.name, schema: NotificationSchema },
      { name: Employee.name, schema: EmployeeSchema },
    ]),
    forwardRef(() => EmployeesModule),
    forwardRef(() => UsersModule),
  ],
  controllers: [DayOffController, NotificationController],
  providers: [DayOffService, DayOffMailService],
  exports: [DayOffService, DayOffMailService],
})
export class DayOffModule {}
