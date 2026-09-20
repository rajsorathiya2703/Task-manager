import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
  OnModuleInit,
  Optional,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { randomBytes } from 'crypto';
import { LeaveType } from './schemas/leave-type.schema';
import { LeaveApplication } from './schemas/leave-application.schema';
import { DayOffSettings } from './schemas/day-off-settings.schema';
import { LeaveBalance } from './schemas/leave-balance.schema';
import { Notification } from './schemas/notification.schema';
import { Employee } from '../employees/schemas/employee.schema';
import { DayOffMailService } from './day-off-mail.service';
import { AccessScopeService } from '../permissions/access-scope.service';

@Injectable()
export class DayOffService implements OnModuleInit {
  private readonly logger = new Logger(DayOffService.name);

  constructor(
    @InjectModel(LeaveType.name) private leaveTypeModel: Model<LeaveType>,
    @InjectModel(LeaveApplication.name) private applicationModel: Model<LeaveApplication>,
    @InjectModel(DayOffSettings.name) private settingsModel: Model<DayOffSettings>,
    @InjectModel(LeaveBalance.name) private balanceModel: Model<LeaveBalance>,
    @InjectModel(Notification.name) private notificationModel: Model<Notification>,
    @InjectModel(Employee.name) private employeeModel: Model<Employee>,
    private mailService: DayOffMailService,
    @Optional() private readonly accessScopeService?: AccessScopeService,
  ) {}

  async onModuleInit() {
    await this.seedDefaultData();
  }

  private async seedDefaultData() {
    try {
      // Seed default settings if empty
      const settingsCount = await this.settingsModel.countDocuments();
      if (settingsCount === 0) {
        const defaultAdminEmail = process.env.BREVO_SENDER_EMAIL || process.env.SMTP_USER || 'admin@taskmanager.com';
        await this.settingsModel.create({
          defaultAdminEmail,
          isEnabled: true,
        });
        this.logger.log(`Initialized DayOffSettings with default admin email: ${defaultAdminEmail}`);
      }

      // Seed default leave types if empty
      const count = await this.leaveTypeModel.countDocuments();
      if (count === 0) {
        const defaultTypes = [
          {
            name: 'Paid Leave',
            code: 'PAID',
            color: '#10b981', // green
            canCarryForward: true,
            carryForwardLimit: 5,
            salaryDeductionPercent: 0,
            refillCycle: 'yearly',
            defaultAllocation: 14,
            rules: 'Standard annual paid time off. Can carry forward up to 5 days.',
            isActive: true,
          },
          {
            name: 'Unpaid Leave',
            code: 'UNPAID',
            color: '#64748b', // slate
            canCarryForward: false,
            carryForwardLimit: 0,
            salaryDeductionPercent: 100,
            refillCycle: 'yearly',
            defaultAllocation: 0,
            rules: 'Leave taken without pay. 100% salary deduction applies for the duration.',
            isActive: true,
          },
          {
            name: 'Half Day Leave',
            code: 'HALF_DAY',
            color: '#f59e0b', // amber
            canCarryForward: false,
            carryForwardLimit: 0,
            salaryDeductionPercent: 50,
            refillCycle: 'monthly',
            defaultAllocation: 2,
            rules: 'Half day absence (4 hours). 50% salary deduction for the day.',
            isActive: true,
          },
          {
            name: 'Medical Leave',
            code: 'MEDICAL',
            color: '#ef4444', // red
            canCarryForward: false,
            carryForwardLimit: 0,
            salaryDeductionPercent: 0,
            refillCycle: 'yearly',
            defaultAllocation: 10,
            rules: 'Time off for health and medical appointments. No salary deduction.',
            isActive: true,
          },
        ];

        await this.leaveTypeModel.insertMany(defaultTypes);
        this.logger.log('Default Leave Types seeded successfully.');
      }
    } catch (err: any) {
      this.logger.warn(`Failed seeding Day Off default data: ${err.message}`);
    }
  }

  // --- Settings ---
  async getSettings(): Promise<DayOffSettings> {
    let settings = await this.settingsModel.findOne().exec();
    if (!settings) {
      const defaultAdminEmail = process.env.BREVO_SENDER_EMAIL || process.env.SMTP_USER || 'admin@taskmanager.com';
      settings = await this.settingsModel.create({
        defaultAdminEmail,
        isEnabled: true,
      });
    }
    return settings;
  }

  async updateSettings(data: Partial<DayOffSettings>): Promise<DayOffSettings> {
    let settings = await this.settingsModel.findOne().exec();
    if (!settings) {
      settings = new this.settingsModel(data);
      return settings.save();
    }
    Object.assign(settings, data);
    return settings.save();
  }

  // --- Leave Types CRUD ---
  async getLeaveTypes(query?: { activeOnly?: boolean }): Promise<LeaveType[]> {
    const filter: any = {};
    if (query?.activeOnly) {
      filter.isActive = true;
    }
    return this.leaveTypeModel.find(filter).populate('applicableUserGroups').sort({ createdAt: 1 }).exec();
  }

  async getLeaveTypeById(id: string): Promise<LeaveType> {
    const item = await this.leaveTypeModel.findById(id).populate('applicableUserGroups').exec();
    if (!item) throw new NotFoundException(`Leave Type #${id} not found`);
    return item;
  }

  async createLeaveType(dto: any): Promise<LeaveType> {
    if (!dto.code && dto.name) {
      dto.code = dto.name.toUpperCase().replace(/[^A-Z0-9]/g, '_');
    }
    const created = new this.leaveTypeModel(dto);
    return created.save();
  }

  async updateLeaveType(id: string, dto: any): Promise<LeaveType> {
    const updated = await this.leaveTypeModel.findByIdAndUpdate(id, { $set: dto }, { new: true }).exec();
    if (!updated) throw new NotFoundException(`Leave Type #${id} not found`);
    return updated;
  }

  async deleteLeaveType(id: string): Promise<any> {
    const deleted = await this.leaveTypeModel.findByIdAndDelete(id).exec();
    if (!deleted) throw new NotFoundException(`Leave Type #${id} not found`);
    return { success: true, message: 'Leave type deleted successfully' };
  }

  // --- Leave Balances ---
  async getEmployeeBalances(employeeId: string, year: number = new Date().getFullYear()): Promise<any[]> {
    const activeTypes = await this.leaveTypeModel.find({ isActive: true }).exec();
    const balances = await this.balanceModel.find({ employeeId: new Types.ObjectId(employeeId), year }).exec();

    // Map each active type to balance record or default allocation
    const result = await Promise.all(
      activeTypes.map(async (lt) => {
        let bal = balances.find((b) => b.leaveTypeId.toString() === lt._id.toString());
        if (!bal) {
          bal = await this.balanceModel.create({
            employeeId: new Types.ObjectId(employeeId),
            leaveTypeId: lt._id,
            year,
            allocated: lt.defaultAllocation,
            used: 0,
            carriedForward: 0,
          });
        }
        return {
          leaveType: lt,
          year,
          allocated: bal.allocated,
          used: bal.used,
          carriedForward: bal.carriedForward,
          remaining: Math.max(0, bal.allocated + bal.carriedForward - bal.used),
        };
      }),
    );

    return result;
  }

  // --- Leave Applications ---
  async applyLeave(user: any, dto: {
    leaveTypeId: string;
    fromDate: string;
    toDate: string;
    reason: string;
    description?: string;
    isHalfDay?: boolean;
  }): Promise<LeaveApplication> {
    const userId = user.id || user._id;

    // Find linked employee
    let employee = await this.employeeModel.findOne({ userId }).exec();
    if (!employee && user.email) {
      employee = await this.employeeModel.findOne({
        email: { $regex: new RegExp(`^${user.email.trim()}$`, 'i') },
      }).exec();
    }

    if (!employee) {
      throw new BadRequestException('Your user account is not linked to an active Employee profile.');
    }

    const leaveType = await this.leaveTypeModel.findById(dto.leaveTypeId).exec();
    if (!leaveType || !leaveType.isActive) {
      throw new BadRequestException('Selected Leave Type is invalid or currently inactive.');
    }

    const fromDate = new Date(dto.fromDate);
    const toDate = new Date(dto.toDate);

    if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
      throw new BadRequestException('Invalid date provided.');
    }

    if (fromDate > toDate) {
      throw new BadRequestException('From Date cannot be after To Date.');
    }

    // Calculate days count
    let daysCount = 1;
    if (dto.isHalfDay || leaveType.code === 'HALF_DAY') {
      daysCount = 0.5;
    } else {
      const diffMs = toDate.getTime() - fromDate.getTime();
      const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24)) + 1;
      daysCount = Math.max(1, diffDays);
    }

    // Generate secure approval token
    const approvalToken = randomBytes(32).toString('hex');

    const application = new this.applicationModel({
      employeeId: employee._id,
      userId: new Types.ObjectId(userId),
      leaveTypeId: leaveType._id,
      fromDate,
      toDate,
      daysCount,
      reason: dto.reason,
      description: dto.description || '',
      status: 'pending',
      approvalToken,
      tokenUsed: false,
    });

    await application.save();

    // Send email to configured admin
    const settings = await this.getSettings();
    const adminEmail = settings.defaultAdminEmail;

    const employeeName = employee.fullName
      ? `${employee.fullName.firstName || ''} ${employee.fullName.lastName || ''}`.trim()
      : user.name || 'Employee';

    const fromDateStr = fromDate.toISOString().split('T')[0];
    const toDateStr = toDate.toISOString().split('T')[0];

    // Fire email asynchronously
    this.mailService.sendLeaveRequestToAdmin({
      adminEmail,
      applicationId: application._id.toString(),
      approvalToken,
      employeeName,
      employeeEmail: employee.email || user.email,
      leaveTypeName: leaveType.name,
      fromDateStr,
      toDateStr,
      daysCount,
      reason: dto.reason,
      description: dto.description,
    }).catch((err) => {
      this.logger.error(`Error sending leave request email to admin: ${err.message}`);
    });

    // Create In-App Notification for employee
    await this.createNotification({
      userId: new Types.ObjectId(userId),
      title: 'Leave Request Submitted',
      message: `Your request for ${leaveType.name} (${fromDateStr} to ${toDateStr}) has been submitted and is pending approval.`,
      type: 'leave_applied',
      link: '/dayoff',
    });

    return application;
  }

  async getMyApplications(user: any, year?: number): Promise<LeaveApplication[]> {
    const userId = user.id || user._id;
    const filter: any = { userId: new Types.ObjectId(userId) };

    if (year) {
      const start = new Date(`${year}-01-01T00:00:00.000Z`);
      const end = new Date(`${year}-12-31T23:59:59.999Z`);
      filter.fromDate = { $gte: start, $lte: end };
    }

    return this.applicationModel
      .find(filter)
      .populate('leaveTypeId')
      .populate('employeeId')
      .sort({ fromDate: -1 })
      .exec();
  }

  async getAllApplications(
    query?: { status?: string; year?: number },
    user?: any,
    scope: 'own' | 'team' | 'all' = 'all',
  ): Promise<LeaveApplication[]> {
    const filter: any = {};
    if (query?.status) {
      filter.status = query.status;
    }
    if (query?.year) {
      const start = new Date(`${query.year}-01-01T00:00:00.000Z`);
      const end = new Date(`${query.year}-12-31T23:59:59.999Z`);
      filter.fromDate = { $gte: start, $lte: end };
    }

    if (user && !user.is_system_admin && scope !== 'all' && this.accessScopeService) {
      const scopeFilter = await this.accessScopeService.buildFilter('dayoff', user, scope);
      if (Object.keys(scopeFilter).length > 0) {
        if (filter.fromDate || filter.status) {
          return this.applicationModel
            .find({ $and: [filter, scopeFilter] })
            .populate('leaveTypeId')
            .populate('employeeId')
            .populate('userId')
            .sort({ fromDate: -1 })
            .exec();
        }
        return this.applicationModel
          .find(scopeFilter)
          .populate('leaveTypeId')
          .populate('employeeId')
          .populate('userId')
          .sort({ fromDate: -1 })
          .exec();
      }
    }

    return this.applicationModel
      .find(filter)
      .populate('leaveTypeId')
      .populate('employeeId')
      .populate('userId')
      .sort({ fromDate: -1 })
      .exec();
  }

  async approveByToken(applicationId: string, token: string): Promise<{ success: boolean; message: string; application?: any }> {
    const application = await this.applicationModel
      .findById(applicationId)
      .populate('leaveTypeId')
      .populate('employeeId')
      .exec();

    if (!application) {
      throw new NotFoundException('Leave application not found.');
    }

    if (application.status === 'approved') {
      return {
        success: true,
        message: 'This leave application has already been approved.',
        application,
      };
    }

    if (application.status !== 'pending') {
      throw new BadRequestException(`Cannot approve leave with current status: ${application.status}`);
    }

    if (application.approvalToken !== token) {
      throw new BadRequestException('Invalid or expired approval token.');
    }

    // Mark as approved
    application.status = 'approved';
    application.tokenUsed = true;
    application.approvedAt = new Date();
    application.approvedBy = 'Email Quick Approval';
    await application.save();

    // Deduct from leave balance
    await this.deductLeaveBalance(
      application.employeeId._id?.toString() || application.employeeId.toString(),
      (application.leaveTypeId as any)._id?.toString() || application.leaveTypeId.toString(),
      new Date(application.fromDate).getFullYear(),
      application.daysCount,
    );

    // Notify employee via email and in-app notification
    const employee = application.employeeId as any;
    const leaveType = application.leaveTypeId as any;
    const employeeEmail = employee?.email;
    const employeeName = employee?.fullName
      ? `${employee.fullName.firstName || ''} ${employee.fullName.lastName || ''}`.trim()
      : 'Employee';

    const fromDateStr = new Date(application.fromDate).toISOString().split('T')[0];
    const toDateStr = new Date(application.toDate).toISOString().split('T')[0];
    const approvedAtStr = application.approvedAt.toLocaleString();

    if (employeeEmail) {
      this.mailService.sendLeaveApprovedToEmployee({
        employeeEmail,
        employeeName,
        leaveTypeName: leaveType?.name || 'Leave',
        fromDateStr,
        toDateStr,
        daysCount: application.daysCount,
        approvedAtStr,
      }).catch((err) => {
        this.logger.error(`Failed to send approval email to employee: ${err.message}`);
      });
    }

    // In-app notification
    await this.createNotification({
      userId: application.userId,
      title: 'Leave Approved!',
      message: `Your leave request for ${leaveType?.name || 'Leave'} (${fromDateStr} to ${toDateStr}) has been approved.`,
      type: 'leave_approved',
      link: '/dayoff',
    });

    return {
      success: true,
      message: 'Leave application approved successfully.',
      application,
    };
  }

  async updateApplicationStatus(
    id: string,
    status: 'approved' | 'rejected',
    adminUser: any,
    reason?: string,
  ): Promise<LeaveApplication> {
    const application = await this.applicationModel
      .findById(id)
      .populate('leaveTypeId')
      .populate('employeeId')
      .exec();

    if (!application) {
      throw new NotFoundException(`Application #${id} not found`);
    }

    // Prevent self-approval or self-rejection
    const currentUserId = (adminUser?.id || adminUser?._id)?.toString();
    const applicationUserId = application.userId?.toString();
    const applicationEmployeeUserId = (application.employeeId as any)?.userId?.toString();

    if (
      currentUserId &&
      (currentUserId === applicationUserId || currentUserId === applicationEmployeeUserId)
    ) {
      throw new ForbiddenException('You cannot approve or reject your own leave application.');
    }

    if (application.status === status) {
      return application;
    }

    const previousStatus = application.status;
    application.status = status;

    if (status === 'approved') {
      application.approvedAt = new Date();
      application.approvedBy = adminUser?.name || adminUser?.email || 'Admin';

      // Deduct balance if transitioning to approved
      if (previousStatus !== 'approved') {
        await this.deductLeaveBalance(
          (application.employeeId as any)._id?.toString() || application.employeeId.toString(),
          (application.leaveTypeId as any)._id?.toString() || application.leaveTypeId.toString(),
          new Date(application.fromDate).getFullYear(),
          application.daysCount,
        );
      }

      // Notify employee
      const employee = application.employeeId as any;
      const leaveType = application.leaveTypeId as any;
      const employeeEmail = employee?.email;
      const employeeName = employee?.fullName
        ? `${employee.fullName.firstName || ''} ${employee.fullName.lastName || ''}`.trim()
        : 'Employee';
      const fromDateStr = new Date(application.fromDate).toISOString().split('T')[0];
      const toDateStr = new Date(application.toDate).toISOString().split('T')[0];
      const approvedAtStr = application.approvedAt.toLocaleString();

      if (employeeEmail) {
        this.mailService.sendLeaveApprovedToEmployee({
          employeeEmail,
          employeeName,
          leaveTypeName: leaveType?.name || 'Leave',
          fromDateStr,
          toDateStr,
          daysCount: application.daysCount,
          approvedAtStr,
        }).catch((err) => {
          this.logger.error(`Failed to send approval email: ${err.message}`);
        });
      }

      await this.createNotification({
        userId: application.userId,
        title: 'Leave Approved!',
        message: `Your leave request for ${leaveType?.name || 'Leave'} (${fromDateStr} to ${toDateStr}) has been approved.`,
        type: 'leave_approved',
        link: '/dayoff',
      });
    } else if (status === 'rejected') {
      application.rejectionReason = reason || '';

      const leaveType = application.leaveTypeId as any;
      const fromDateStr = new Date(application.fromDate).toISOString().split('T')[0];
      const toDateStr = new Date(application.toDate).toISOString().split('T')[0];

      await this.createNotification({
        userId: application.userId,
        title: 'Leave Request Declined',
        message: `Your leave request for ${leaveType?.name || 'Leave'} (${fromDateStr} to ${toDateStr}) was declined.${reason ? ` Reason: ${reason}` : ''}`,
        type: 'leave_rejected',
        link: '/dayoff',
      });
    }

    await application.save();
    return application;
  }

  async cancelApplication(id: string, user: any): Promise<LeaveApplication> {
    const userId = user.id || user._id;
    const application = await this.applicationModel.findOne({
      _id: new Types.ObjectId(id),
      userId: new Types.ObjectId(userId),
    }).exec();

    if (!application) {
      throw new NotFoundException('Leave application not found.');
    }

    if (application.status !== 'pending') {
      throw new BadRequestException('Only pending leave applications can be cancelled.');
    }

    application.status = 'cancelled';
    await application.save();
    return application;
  }

  private async deductLeaveBalance(employeeId: string, leaveTypeId: string, year: number, daysCount: number) {
    let balance = await this.balanceModel.findOne({
      employeeId: new Types.ObjectId(employeeId),
      leaveTypeId: new Types.ObjectId(leaveTypeId),
      year,
    }).exec();

    if (!balance) {
      const leaveType = await this.leaveTypeModel.findById(leaveTypeId).exec();
      balance = new this.balanceModel({
        employeeId: new Types.ObjectId(employeeId),
        leaveTypeId: new Types.ObjectId(leaveTypeId),
        year,
        allocated: leaveType?.defaultAllocation || 0,
        used: 0,
        carriedForward: 0,
      });
    }

    balance.used = (balance.used || 0) + daysCount;
    await balance.save();
  }

  // --- Notifications ---
  async createNotification(data: {
    userId: Types.ObjectId;
    title: string;
    message: string;
    type?: string;
    link?: string;
  }): Promise<Notification> {
    const notification = new this.notificationModel({
      ...data,
      isRead: false,
    });
    return notification.save();
  }

  async getUserNotifications(userId: string): Promise<{ list: Notification[]; unreadCount: number }> {
    const userObjId = new Types.ObjectId(userId);
    const [list, unreadCount] = await Promise.all([
      this.notificationModel
        .find({ userId: userObjId })
        .sort({ createdAt: -1 })
        .limit(20)
        .exec(),
      this.notificationModel.countDocuments({ userId: userObjId, isRead: false }),
    ]);

    return { list, unreadCount };
  }

  async markNotificationAsRead(id: string, userId: string): Promise<Notification> {
    const notification = await this.notificationModel.findOneAndUpdate(
      { _id: new Types.ObjectId(id), userId: new Types.ObjectId(userId) },
      { $set: { isRead: true } },
      { new: true },
    ).exec();

    if (!notification) throw new NotFoundException('Notification not found');
    return notification;
  }

  async markAllNotificationsAsRead(userId: string): Promise<any> {
    await this.notificationModel.updateMany(
      { userId: new Types.ObjectId(userId), isRead: false },
      { $set: { isRead: true } },
    ).exec();
    return { success: true };
  }
}
