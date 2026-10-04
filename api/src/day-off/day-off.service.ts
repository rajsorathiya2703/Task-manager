import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
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
import { Team } from '../teams/schemas/team.schema';
import { Company } from '../companies/schemas/company.schema';
import { DayOffMailService } from './day-off-mail.service';
import { ScopeType } from '../access/policy.engine';

@Injectable()
export class DayOffService {
  private readonly logger = new Logger(DayOffService.name);

  constructor(
    @InjectModel(LeaveType.name) private leaveTypeModel: Model<LeaveType>,
    @InjectModel(LeaveApplication.name) private applicationModel: Model<LeaveApplication>,
    @InjectModel(DayOffSettings.name) private settingsModel: Model<DayOffSettings>,
    @InjectModel(LeaveBalance.name) private balanceModel: Model<LeaveBalance>,
    @InjectModel(Notification.name) private notificationModel: Model<Notification>,
    @InjectModel(Employee.name) private employeeModel: Model<Employee>,
    @InjectModel(Team.name) private teamModel: Model<Team>,
    @Optional() @InjectModel(Company.name) private companyModel?: Model<Company>,
    private mailService?: DayOffMailService,
  ) {}

  /**
   * Seed company defaults (settings and default leave types) on company creation.
   * Called by MC-30 on tenant setup.
   */
  async seedCompanyDefaults(
    companyId: Types.ObjectId | string,
    adminEmail?: string,
    session?: any,
  ): Promise<void> {
    const companyObjId = new Types.ObjectId(companyId);
    try {
      // Seed default settings for company if missing
      let existingSettings: any;
      const settingsResult = this.settingsModel.findOne({ companyId: companyObjId });
      if (session && typeof (settingsResult as any)?.session === 'function') {
        (settingsResult as any).session(session);
      }
      if (settingsResult && typeof (settingsResult as any).exec === 'function') {
        existingSettings = await (settingsResult as any).exec();
      } else {
        existingSettings = await settingsResult;
      }

      if (!existingSettings) {
        let resolvedEmail = adminEmail;
        if (!resolvedEmail && this.companyModel) {
          const compResult = this.companyModel.findById(companyObjId);
          if (session && typeof (compResult as any)?.session === 'function') {
            (compResult as any).session(session);
          }
          const company = compResult && typeof (compResult as any).exec === 'function'
            ? await (compResult as any).exec()
            : await compResult;
          resolvedEmail = company?.contactEmail;
        }
        resolvedEmail = resolvedEmail || process.env.BREVO_SENDER_EMAIL || process.env.SMTP_USER || 'admin@taskmanager.com';
        if (session) {
          await this.settingsModel.create(
            [
              {
                companyId: companyObjId,
                defaultAdminEmail: resolvedEmail,
                isEnabled: true,
              },
            ],
            { session },
          );
        } else {
          await this.settingsModel.create({
            companyId: companyObjId,
            defaultAdminEmail: resolvedEmail,
            isEnabled: true,
          });
        }
        this.logger.log(`Initialized DayOffSettings for company ${companyId} with default admin email: ${resolvedEmail}`);
      }

      // Seed default leave types for company if empty
      let count: number;
      const countResult = this.leaveTypeModel.countDocuments({ companyId: companyObjId });
      if (session && typeof (countResult as any)?.session === 'function') {
        (countResult as any).session(session);
      }
      if (countResult && typeof (countResult as any).exec === 'function') {
        count = await (countResult as any).exec();
      } else {
        count = await countResult;
      }
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
            companyId: companyObjId,
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
            companyId: companyObjId,
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
            companyId: companyObjId,
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
            companyId: companyObjId,
          },
        ];

        if (session) {
          await this.leaveTypeModel.insertMany(defaultTypes, { session });
        } else {
          await this.leaveTypeModel.insertMany(defaultTypes);
        }
        this.logger.log(`Default Leave Types seeded successfully for company: ${companyId}`);
      }
    } catch (err: any) {
      this.logger.warn(`Failed seeding Day Off default data for company ${companyId}: ${err.message}`);
    }
  }

  private async getCompanySlug(companyId?: Types.ObjectId | string): Promise<string | undefined> {
    if (!companyId || !this.companyModel) return undefined;
    try {
      const company = await this.companyModel.findById(companyId).select('slug').lean().exec();
      return company?.slug;
    } catch {
      return undefined;
    }
  }

  // --- Settings ---
  async getSettings(companyId?: Types.ObjectId | string): Promise<DayOffSettings> {
    const filter: any = {};
    let companyObjId: Types.ObjectId | undefined;
    if (companyId) {
      companyObjId = new Types.ObjectId(companyId);
      filter.companyId = companyObjId;
    }

    let settings = await this.settingsModel.findOne(filter).exec();
    if (!settings) {
      let contactEmail: string | undefined;
      if (companyObjId && this.companyModel) {
        const company = await this.companyModel.findById(companyObjId).exec();
        contactEmail = company?.contactEmail;
      }
      const defaultAdminEmail = contactEmail || process.env.BREVO_SENDER_EMAIL || process.env.SMTP_USER || 'admin@taskmanager.com';
      settings = await this.settingsModel.create({
        ...(companyObjId ? { companyId: companyObjId } : {}),
        defaultAdminEmail,
        isEnabled: true,
      });
    }
    return settings;
  }

  async updateSettings(
    companyIdOrData: Types.ObjectId | string | Partial<DayOffSettings>,
    maybeData?: Partial<DayOffSettings>,
  ): Promise<DayOffSettings> {
    let companyId: Types.ObjectId | undefined;
    let data: Partial<DayOffSettings>;
    if (maybeData !== undefined || typeof companyIdOrData === 'string' || companyIdOrData instanceof Types.ObjectId) {
      companyId = new Types.ObjectId(companyIdOrData as any);
      data = maybeData || {};
    } else {
      data = companyIdOrData as Partial<DayOffSettings>;
    }

    const filter: any = companyId ? { companyId } : {};
    let settings = await this.settingsModel.findOne(filter).exec();
    if (!settings) {
      settings = new this.settingsModel({ ...data, ...(companyId ? { companyId } : {}) });
      return settings.save();
    }
    Object.assign(settings, data);
    if (companyId) {
      settings.companyId = companyId;
    }
    return settings.save();
  }

  // --- Leave Types CRUD ---
  async getLeaveTypes(
    companyIdOrQuery?: Types.ObjectId | string | { activeOnly?: boolean },
    maybeQuery?: { activeOnly?: boolean },
  ): Promise<LeaveType[]> {
    let companyId: Types.ObjectId | undefined;
    let query: { activeOnly?: boolean } | undefined;
    if (typeof companyIdOrQuery === 'string' || companyIdOrQuery instanceof Types.ObjectId) {
      companyId = new Types.ObjectId(companyIdOrQuery);
      query = maybeQuery;
    } else {
      query = companyIdOrQuery;
    }
    const filter: any = {};
    if (companyId) filter.companyId = companyId;
    if (query?.activeOnly) {
      filter.isActive = true;
    }
    return this.leaveTypeModel.find(filter).sort({ createdAt: 1 }).exec();
  }

  async getLeaveTypeById(companyIdOrId: Types.ObjectId | string, maybeId?: string): Promise<LeaveType> {
    let companyId: Types.ObjectId | undefined;
    let id: string;
    if (maybeId !== undefined) {
      companyId = new Types.ObjectId(companyIdOrId);
      id = maybeId;
    } else {
      id = companyIdOrId.toString();
    }
    const filter: any = { _id: id };
    if (companyId) filter.companyId = companyId;
    const item = await this.leaveTypeModel.findOne(filter).exec();
    if (!item) throw new NotFoundException(`Leave Type #${id} not found`);
    return item;
  }

  async createLeaveType(companyIdOrDto: Types.ObjectId | string | any, maybeDto?: any): Promise<LeaveType> {
    let companyId: Types.ObjectId | undefined;
    let dto: any;
    if (maybeDto !== undefined) {
      companyId = new Types.ObjectId(companyIdOrDto);
      dto = { ...maybeDto };
    } else {
      dto = { ...companyIdOrDto };
    }
    if (companyId) {
      dto.companyId = companyId;
    }
    if (!dto.code && dto.name) {
      dto.code = dto.name.toUpperCase().replace(/[^A-Z0-9]/g, '_');
    }
    const created = new this.leaveTypeModel(dto);
    return created.save();
  }

  async updateLeaveType(
    companyIdOrId: Types.ObjectId | string,
    idOrDto: string | any,
    maybeDto?: any,
  ): Promise<LeaveType> {
    let companyId: Types.ObjectId | undefined;
    let id: string;
    let dto: any;
    if (maybeDto !== undefined) {
      companyId = new Types.ObjectId(companyIdOrId);
      id = idOrDto;
      dto = maybeDto;
    } else {
      id = companyIdOrId.toString();
      dto = idOrDto;
    }
    const filter: any = { _id: id };
    if (companyId) filter.companyId = companyId;
    const updated = await this.leaveTypeModel.findOneAndUpdate(filter, { $set: dto }, { new: true }).exec();
    if (!updated) throw new NotFoundException(`Leave Type #${id} not found`);
    return updated;
  }

  async deleteLeaveType(companyIdOrId: Types.ObjectId | string, maybeId?: string): Promise<any> {
    let companyId: Types.ObjectId | undefined;
    let id: string;
    if (maybeId !== undefined) {
      companyId = new Types.ObjectId(companyIdOrId);
      id = maybeId;
    } else {
      id = companyIdOrId.toString();
    }
    const filter: any = { _id: id };
    if (companyId) filter.companyId = companyId;
    const deleted = await this.leaveTypeModel.findOneAndDelete(filter).exec();
    if (!deleted) throw new NotFoundException(`Leave Type #${id} not found`);
    return { success: true, message: 'Leave type deleted successfully' };
  }

  // --- Leave Balances ---
  async getEmployeeBalances(
    companyIdOrEmployeeId: Types.ObjectId | string,
    employeeIdOrYear?: Types.ObjectId | string | number,
    maybeYear?: number,
  ): Promise<any[]> {
    let companyId: Types.ObjectId | undefined;
    let employeeId: Types.ObjectId;
    let year: number;

    if (
      maybeYear !== undefined ||
      (typeof employeeIdOrYear === 'string' && Types.ObjectId.isValid(employeeIdOrYear)) ||
      employeeIdOrYear instanceof Types.ObjectId
    ) {
      companyId = new Types.ObjectId(companyIdOrEmployeeId);
      employeeId = new Types.ObjectId(employeeIdOrYear as any);
      year = maybeYear !== undefined ? maybeYear : new Date().getFullYear();
    } else {
      // Fallback for (employeeId, year)
      employeeId = new Types.ObjectId(companyIdOrEmployeeId);
      year = typeof employeeIdOrYear === 'number' ? employeeIdOrYear : new Date().getFullYear();
    }

    const filterLt: any = { isActive: true };
    if (companyId) filterLt.companyId = companyId;
    const activeTypes = await this.leaveTypeModel.find(filterLt).exec();

    const filterBal: any = { employeeId, year };
    if (companyId) filterBal.companyId = companyId;
    const balances = await this.balanceModel.find(filterBal).exec();

    // Map each active type to balance record or default allocation
    const result = await Promise.all(
      activeTypes.map(async (lt) => {
        let bal = balances.find((b) => b.leaveTypeId.toString() === lt._id.toString());
        if (!bal) {
          bal = await this.balanceModel.create({
            ...(companyId ? { companyId } : {}),
            employeeId,
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
  async applyLeave(
    companyIdOrUser: Types.ObjectId | string | any,
    employeeIdOrDto: Types.ObjectId | string | any,
    userOrUndefined?: any,
    maybeDto?: {
      leaveTypeId: string;
      fromDate: string;
      toDate: string;
      reason: string;
      description?: string;
      isHalfDay?: boolean;
    },
  ): Promise<LeaveApplication> {
    let companyId: Types.ObjectId | undefined;
    let employeeId: Types.ObjectId | undefined;
    let user: any;
    let dto: {
      leaveTypeId: string;
      fromDate: string;
      toDate: string;
      reason: string;
      description?: string;
      isHalfDay?: boolean;
    };

    if (maybeDto !== undefined) {
      companyId = new Types.ObjectId(companyIdOrUser);
      employeeId = new Types.ObjectId(employeeIdOrDto);
      user = userOrUndefined;
      dto = maybeDto;
    } else {
      user = companyIdOrUser;
      dto = employeeIdOrDto;
    }

    const userId = user.id || user._id;

    // Resolve employee: if employeeId & companyId are provided, look up by employeeId + companyId
    let employee: any;
    if (employeeId && companyId) {
      employee = await this.employeeModel.findOne({ _id: employeeId, companyId }).exec();
    } else {
      employee = await this.employeeModel.findOne({ userId }).exec();
      if (!employee && user.email) {
        employee = await this.employeeModel.findOne({
          email: { $regex: new RegExp(`^${user.email.trim()}$`, 'i') },
        }).exec();
      }
      if (employee && !companyId && employee.companyId) {
        companyId = employee.companyId;
      }
    }

    if (!employee) {
      throw new BadRequestException('Your user account is not linked to an active Employee profile.');
    }

    // Leave type must belong to the company
    const leaveTypeFilter: any = { _id: new Types.ObjectId(dto.leaveTypeId) };
    if (companyId) {
      leaveTypeFilter.companyId = companyId;
    }
    const leaveType = await this.leaveTypeModel.findOne(leaveTypeFilter).exec();
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
      ...(companyId ? { companyId } : {}),
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
    const settings = await this.getSettings(companyId);
    const adminEmail = settings.defaultAdminEmail;

    const employeeName = employee.fullName
      ? `${employee.fullName.firstName || ''} ${employee.fullName.lastName || ''}`.trim()
      : user.name || 'Employee';

    const fromDateStr = fromDate.toISOString().split('T')[0];
    const toDateStr = toDate.toISOString().split('T')[0];

    // Fire email asynchronously
    if (this.mailService) {
      const companySlug = await this.getCompanySlug(companyId);
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
        companySlug,
      }).catch((err) => {
        this.logger.error(`Error sending leave request email to admin: ${err.message}`);
      });
    }

    // Create In-App Notification for employee
    await this.createNotification(companyId, {
      userId: new Types.ObjectId(userId),
      title: 'Leave Request Submitted',
      message: `Your request for ${leaveType.name} (${fromDateStr} to ${toDateStr}) has been submitted and is pending approval.`,
      type: 'leave_applied',
      link: '/dayoff',
    });

    return application;
  }

  async getMyApplications(
    companyIdOrUser: Types.ObjectId | string | any,
    userOrYear?: any,
    maybeYear?: number,
  ): Promise<LeaveApplication[]> {
    let companyId: Types.ObjectId | undefined;
    let user: any;
    let year: number | undefined;

    if (typeof companyIdOrUser === 'string' || companyIdOrUser instanceof Types.ObjectId) {
      companyId = new Types.ObjectId(companyIdOrUser);
      user = userOrYear;
      year = maybeYear;
    } else {
      user = companyIdOrUser;
      year = userOrYear;
    }

    const userId = user.id || user._id;
    const filter: any = { userId: new Types.ObjectId(userId) };
    if (companyId) filter.companyId = companyId;

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

  /**
   * Resolves all Employee IDs associated with the caller user.
   */
  private async getCallerEmployeeIds(companyId: Types.ObjectId | undefined, user: any): Promise<Types.ObjectId[]> {
    const userId = user?.id || user?._id;
    const email = user?.email;
    const queryConditions: any[] = [];
    if (userId) {
      if (Types.ObjectId.isValid(userId)) {
        queryConditions.push({ userId: new Types.ObjectId(userId) });
      }
      queryConditions.push({ userId: userId.toString() });
    }
    if (email && typeof email === 'string' && email.trim()) {
      const cleanEmail = email.trim();
      queryConditions.push({ email: { $regex: new RegExp(`^${cleanEmail}$`, 'i') } });
    }
    if (queryConditions.length === 0) return [];
    const filter: any = { $or: queryConditions };
    if (companyId) filter.companyId = companyId;
    const employees = await this.employeeModel
      .find(filter)
      .select('_id')
      .lean()
      .exec();
    return employees.map((e: any) => e._id as Types.ObjectId);
  }

  /**
   * Resolves all Employee IDs belonging to teams where the caller is
   * a team member or team lead. Includes the caller's own employee ID(s).
   */
  private async getTeamMemberEmployeeIds(companyId: Types.ObjectId | undefined, user: any): Promise<Types.ObjectId[]> {
    const callerEmployeeIds = await this.getCallerEmployeeIds(companyId, user);
    const userId = user?.id || user?._id;

    const teamSearchConditions: any[] = [];
    if (callerEmployeeIds.length > 0) {
      teamSearchConditions.push({ members: { $in: callerEmployeeIds } });
      teamSearchConditions.push({ teamLead: { $in: callerEmployeeIds } });
    }
    if (userId) {
      const uId = Types.ObjectId.isValid(userId) ? new Types.ObjectId(userId) : userId;
      teamSearchConditions.push({ members: uId });
      teamSearchConditions.push({ teamLead: uId });
    }

    if (teamSearchConditions.length === 0) {
      return callerEmployeeIds;
    }

    const filter: any = { $or: teamSearchConditions };
    if (companyId) filter.companyId = companyId;
    const teams = await this.teamModel
      .find(filter)
      .select('members teamLead')
      .lean()
      .exec();

    const memberEmployeeIdSet = new Set<string>();
    callerEmployeeIds.forEach((id) => memberEmployeeIdSet.add(id.toString()));

    for (const team of teams) {
      if (team.teamLead) {
        memberEmployeeIdSet.add(team.teamLead.toString());
      }
      if (Array.isArray(team.members)) {
        for (const m of team.members) {
          if (m) memberEmployeeIdSet.add(m.toString());
        }
      }
    }

    return Array.from(memberEmployeeIdSet)
      .filter((id) => Types.ObjectId.isValid(id))
      .map((id) => new Types.ObjectId(id));
  }

  async getAllApplications(
    companyIdOrQuery?: Types.ObjectId | string | { status?: string; year?: number },
    queryOrUser?: any,
    userOrScope?: any,
    scopeOrIsSystemAdmin?: any,
    maybeIsSystemAdmin?: boolean,
  ): Promise<LeaveApplication[]> {
    let companyId: Types.ObjectId | undefined;
    let query: { status?: string; year?: number } | undefined;
    let user: any;
    let scope: ScopeType = 'all';
    let isSystemAdmin = false;

    if (typeof companyIdOrQuery === 'string' || companyIdOrQuery instanceof Types.ObjectId) {
      companyId = new Types.ObjectId(companyIdOrQuery);
      query = queryOrUser;
      user = userOrScope;
      scope = scopeOrIsSystemAdmin || 'all';
      isSystemAdmin = !!maybeIsSystemAdmin;
    } else {
      query = companyIdOrQuery;
      user = queryOrUser;
      scope = userOrScope || 'all';
      isSystemAdmin = !!scopeOrIsSystemAdmin;
    }

    if (scope === 'none' && !isSystemAdmin) {
      return [];
    }

    const filter: any = {};
    if (companyId) filter.companyId = companyId;
    if (query?.status) {
      filter.status = query.status;
    }
    if (query?.year) {
      const start = new Date(`${query.year}-01-01T00:00:00.000Z`);
      const end = new Date(`${query.year}-12-31T23:59:59.999Z`);
      filter.fromDate = { $gte: start, $lte: end };
    }

    // PBAC Scope Filtering
    if (!isSystemAdmin && scope !== 'all') {
      if (scope === 'own') {
        const callerEmployeeIds = await this.getCallerEmployeeIds(companyId, user);
        const userId = user?.id || user?._id;
        const ownOr: any[] = [];
        if (callerEmployeeIds.length > 0) {
          ownOr.push({ employeeId: { $in: callerEmployeeIds } });
        }
        if (userId) {
          if (Types.ObjectId.isValid(userId)) {
            ownOr.push({ userId: new Types.ObjectId(userId) });
          }
          ownOr.push({ userId: userId.toString() });
        }
        if (ownOr.length === 0) {
          return [];
        }
        filter.$or = ownOr;
      } else if (scope === 'team') {
        const teamMemberIds = await this.getTeamMemberEmployeeIds(companyId, user);
        const callerEmployeeIds = await this.getCallerEmployeeIds(companyId, user);
        const userId = user?.id || user?._id;

        const teamOr: any[] = [];
        if (teamMemberIds.length > 0) {
          teamOr.push({ employeeId: { $in: teamMemberIds } });
        }
        if (callerEmployeeIds.length > 0) {
          teamOr.push({ employeeId: { $in: callerEmployeeIds } });
        }
        if (userId) {
          if (Types.ObjectId.isValid(userId)) {
            teamOr.push({ userId: new Types.ObjectId(userId) });
          }
          teamOr.push({ userId: userId.toString() });
        }

        if (teamOr.length === 0) {
          return [];
        }
        filter.$or = teamOr;
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

  async approveByToken(
    applicationId: string,
    token: string,
    companySlugOrId?: Types.ObjectId | string,
  ): Promise<{ success: boolean; message: string; application?: any }> {
    let targetCompanyId: Types.ObjectId | null = null;
    if (companySlugOrId) {
      if (Types.ObjectId.isValid(companySlugOrId) && String(new Types.ObjectId(companySlugOrId)) === String(companySlugOrId)) {
        targetCompanyId = new Types.ObjectId(companySlugOrId);
      } else if (this.companyModel) {
        const slugStr = typeof companySlugOrId === 'string' ? companySlugOrId : companySlugOrId.toString();
        const company = await this.companyModel.findOne({ slug: slugStr }).exec();
        if (!company) {
          throw new NotFoundException('Leave application not found.');
        }
        targetCompanyId = company._id;
      }
    }

    const filter: any = { _id: applicationId };
    if (targetCompanyId) {
      filter.companyId = targetCompanyId;
    }

    const application = await (this.applicationModel.findOne
      ? this.applicationModel.findOne(filter)
      : this.applicationModel.findById(applicationId))
      .populate('leaveTypeId')
      .populate('employeeId')
      .exec();

    if (!application) {
      throw new NotFoundException('Leave application not found.');
    }

    if (targetCompanyId && application.companyId && application.companyId.toString() !== targetCompanyId.toString()) {
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
      application.companyId || targetCompanyId,
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

    if (employeeEmail && this.mailService) {
      const companySlug = await this.getCompanySlug(application.companyId || targetCompanyId);
      this.mailService.sendLeaveApprovedToEmployee({
        employeeEmail,
        employeeName,
        leaveTypeName: leaveType?.name || 'Leave',
        fromDateStr,
        toDateStr,
        daysCount: application.daysCount,
        approvedAtStr,
        companySlug,
      }).catch((err) => {
        this.logger.error(`Failed to send approval email to employee: ${err.message}`);
      });
    }

    // In-app notification
    await this.createNotification(application.companyId || targetCompanyId, {
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
    companyIdOrId: Types.ObjectId | string,
    idOrStatus: string,
    statusOrAdminUser: any,
    adminUserOrReason?: any,
    reasonOrScope?: any,
    scopeOrIsSystemAdmin?: any,
    maybeIsSystemAdmin?: boolean,
  ): Promise<LeaveApplication> {
    let companyId: Types.ObjectId | undefined;
    let id: string;
    let status: 'approved' | 'rejected';
    let adminUser: any;
    let reason: string | undefined;
    let scope: ScopeType = 'all';
    let isSystemAdmin = false;

    if (idOrStatus === 'approved' || idOrStatus === 'rejected') {
      id = companyIdOrId.toString();
      status = idOrStatus;
      adminUser = statusOrAdminUser;
      reason = adminUserOrReason;
      scope = reasonOrScope || 'all';
      isSystemAdmin = !!scopeOrIsSystemAdmin;
    } else {
      companyId = new Types.ObjectId(companyIdOrId);
      id = idOrStatus;
      status = statusOrAdminUser;
      adminUser = adminUserOrReason;
      reason = reasonOrScope;
      scope = scopeOrIsSystemAdmin || 'all';
      isSystemAdmin = !!maybeIsSystemAdmin;
    }

    const filter: any = { _id: id };
    if (companyId) filter.companyId = companyId;

    const application = await (this.applicationModel.findOne
      ? this.applicationModel.findOne(filter)
      : this.applicationModel.findById(id))
      .populate('leaveTypeId')
      .populate('employeeId')
      .exec();

    if (!application) {
      throw new NotFoundException(`Application #${id} not found`);
    }

    // PBAC Scope Check for Approvals
    if (!isSystemAdmin && scope !== 'all') {
      if (scope === 'none') {
        throw new ForbiddenException('Access denied: scope is none for this action');
      }
      if (scope === 'team') {
        const teamMemberIds = await this.getTeamMemberEmployeeIds(companyId || application.companyId, adminUser);
        const applicantEmployeeId = (application.employeeId as any)?._id || application.employeeId;
        const isMember = teamMemberIds.some(
          (mId) => mId.toString() === applicantEmployeeId?.toString(),
        );
        if (!isMember) {
          throw new ForbiddenException(
            'Access denied: applicant is not on your team',
          );
        }
      }
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
          application.companyId || companyId,
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

      if (employeeEmail && this.mailService) {
        const companySlug = await this.getCompanySlug(application.companyId || companyId);
        this.mailService.sendLeaveApprovedToEmployee({
          employeeEmail,
          employeeName,
          leaveTypeName: leaveType?.name || 'Leave',
          fromDateStr,
          toDateStr,
          daysCount: application.daysCount,
          approvedAtStr,
          companySlug,
        }).catch((err) => {
          this.logger.error(`Failed to send approval email: ${err.message}`);
        });
      }

      await this.createNotification(application.companyId || companyId, {
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

      await this.createNotification(application.companyId || companyId, {
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

  async cancelApplication(
    companyIdOrId: Types.ObjectId | string,
    idOrUser: string | any,
    maybeUser?: any,
  ): Promise<LeaveApplication> {
    let companyId: Types.ObjectId | undefined;
    let id: string;
    let user: any;

    if (maybeUser !== undefined) {
      companyId = new Types.ObjectId(companyIdOrId);
      id = idOrUser;
      user = maybeUser;
    } else {
      id = companyIdOrId.toString();
      user = idOrUser;
    }

    const userId = user.id || user._id;
    const filter: any = {
      _id: new Types.ObjectId(id),
      userId: new Types.ObjectId(userId),
    };
    if (companyId) filter.companyId = companyId;

    const application = await this.applicationModel.findOne(filter).exec();

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

  private async deductLeaveBalance(
    companyId: Types.ObjectId | string | undefined,
    employeeId: string | Types.ObjectId,
    leaveTypeId: string | Types.ObjectId,
    year: number,
    daysCount: number,
  ) {
    const compObjId = companyId ? new Types.ObjectId(companyId) : undefined;
    const empObjId = new Types.ObjectId(employeeId);
    const ltObjId = new Types.ObjectId(leaveTypeId);

    const filterBal: any = {
      employeeId: empObjId,
      leaveTypeId: ltObjId,
      year,
    };
    if (compObjId) {
      filterBal.companyId = compObjId;
    }

    let balance = await this.balanceModel.findOne(filterBal).exec();

    if (!balance) {
      const filterLt: any = { _id: ltObjId };
      if (compObjId) filterLt.companyId = compObjId;
      const leaveType = await this.leaveTypeModel.findOne(filterLt).exec();
      balance = new this.balanceModel({
        ...(compObjId ? { companyId: compObjId } : {}),
        employeeId: empObjId,
        leaveTypeId: ltObjId,
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
  async createNotification(
    companyIdOrData?: Types.ObjectId | string | {
      companyId?: Types.ObjectId;
      userId: Types.ObjectId;
      title: string;
      message: string;
      type?: string;
      link?: string;
    },
    maybeData?: {
      userId: Types.ObjectId;
      title: string;
      message: string;
      type?: string;
      link?: string;
    },
  ): Promise<Notification> {
    let companyId: Types.ObjectId | undefined;
    let data: any;

    if (maybeData !== undefined) {
      if (companyIdOrData) {
        companyId = new Types.ObjectId(companyIdOrData as any);
      }
      data = maybeData;
    } else {
      data = companyIdOrData;
      if (data?.companyId) {
        companyId = new Types.ObjectId(data.companyId);
      }
    }

    const notification = new this.notificationModel({
      ...data,
      ...(companyId ? { companyId } : {}),
      isRead: false,
    });
    return notification.save();
  }

  async getUserNotifications(
    companyIdOrUserId: Types.ObjectId | string,
    maybeUserId?: string,
  ): Promise<{ list: Notification[]; unreadCount: number }> {
    let companyId: Types.ObjectId | undefined;
    let userId: string;

    if (maybeUserId !== undefined) {
      companyId = new Types.ObjectId(companyIdOrUserId);
      userId = maybeUserId;
    } else {
      userId = companyIdOrUserId.toString();
    }

    const userObjId = new Types.ObjectId(userId);
    const filter: any = { userId: userObjId };
    if (companyId) filter.companyId = companyId;

    const [list, unreadCount] = await Promise.all([
      this.notificationModel
        .find(filter)
        .sort({ createdAt: -1 })
        .limit(20)
        .exec(),
      this.notificationModel.countDocuments({ ...filter, isRead: false }),
    ]);

    return { list, unreadCount };
  }

  async markNotificationAsRead(
    companyIdOrId: Types.ObjectId | string,
    idOrUserId: string,
    maybeUserId?: string,
  ): Promise<Notification> {
    let companyId: Types.ObjectId | undefined;
    let id: string;
    let userId: string;

    if (maybeUserId !== undefined) {
      companyId = new Types.ObjectId(companyIdOrId);
      id = idOrUserId;
      userId = maybeUserId;
    } else {
      id = companyIdOrId.toString();
      userId = idOrUserId;
    }

    const filter: any = { _id: new Types.ObjectId(id), userId: new Types.ObjectId(userId) };
    if (companyId) filter.companyId = companyId;

    const notification = await this.notificationModel.findOneAndUpdate(
      filter,
      { $set: { isRead: true } },
      { new: true },
    ).exec();

    if (!notification) throw new NotFoundException('Notification not found');
    return notification;
  }

  async markAllNotificationsAsRead(
    companyIdOrUserId: Types.ObjectId | string,
    maybeUserId?: string,
  ): Promise<any> {
    let companyId: Types.ObjectId | undefined;
    let userId: string;

    if (maybeUserId !== undefined) {
      companyId = new Types.ObjectId(companyIdOrUserId);
      userId = maybeUserId;
    } else {
      userId = companyIdOrUserId.toString();
    }

    const filter: any = { userId: new Types.ObjectId(userId), isRead: false };
    if (companyId) filter.companyId = companyId;

    await this.notificationModel.updateMany(
      filter,
      { $set: { isRead: true } },
    ).exec();
    return { success: true };
  }
}
