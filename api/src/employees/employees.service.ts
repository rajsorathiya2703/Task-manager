import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  OnModuleInit,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Employee } from './schemas/employee.schema';
import { Team } from '../teams/schemas/team.schema';
import { UsersService } from '../users/users.service';
import { UserDocument } from '../users/schemas/user.schema';
import {
  isEmployeeInScope,
  EmployeeSubject,
  EmployeeResource,
  EmployeeTeamContext,
  ScopeType,
} from '../access/resolvers/employees.resolver';

function escapeRegex(text: string): string {
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
}

@Injectable()
export class EmployeesService implements OnModuleInit {
  private readonly logger = new Logger(EmployeesService.name);

  constructor(
    @InjectModel(Employee.name) private employeeModel: Model<Employee>,
    @InjectModel(Team.name) private teamModel: Model<Team>,
    private usersService: UsersService,
  ) {}

  async onModuleInit() {
    try {
      if (this.employeeModel?.collection) {
        await this.employeeModel.collection.dropIndex('email_1');
        this.logger.log('Legacy email_1 index dropped successfully from employees collection');
      }
    } catch {
      // Index already dropped or not present; ignore
    }
  }

  /**
   * Resolves all Employee IDs that correspond to a given userId and/or email
   * within the specified company.
   */
  private async getCallerEmployeeIds(
    companyId: Types.ObjectId,
    userId?: string,
    email?: string,
  ): Promise<Types.ObjectId[]> {
    const employeeQuery: any[] = [];
    if (userId) {
      if (Types.ObjectId.isValid(userId)) {
        employeeQuery.push({ userId: new Types.ObjectId(userId) });
      }
      employeeQuery.push({ userId: userId.toString() });
    }
    if (email && typeof email === 'string' && email.trim()) {
      const cleanEmail = escapeRegex(email.trim());
      employeeQuery.push({ email: { $regex: new RegExp(`^${cleanEmail}$`, 'i') } });
    }

    if (employeeQuery.length === 0) {
      return [];
    }

    const employees = await this.employeeModel
      .find({ companyId, $or: employeeQuery })
      .select('_id')
      .lean()
      .exec();

    return employees.map((e: any) => e._id as Types.ObjectId);
  }

  /**
   * Builds Mongo query criteria for employees according to effective scope,
   * scoped strictly by companyId.
   */
  private async buildEmployeeScopeFilter(
    companyId: Types.ObjectId,
    userId?: string,
    email?: string,
    isSystemAdmin?: boolean,
    scope: ScopeType = 'all',
  ): Promise<any> {
    if (scope === 'none') {
      return isSystemAdmin ? { companyId } : null;
    }
    if (isSystemAdmin || scope === 'all') {
      return { companyId };
    }

    const callerEmployeeIds = await this.getCallerEmployeeIds(companyId, userId, email);

    // Build conditions for caller's own employee record
    const ownConditions: any[] = [];
    if (callerEmployeeIds.length > 0) {
      ownConditions.push({ _id: { $in: callerEmployeeIds } });
    }
    if (userId) {
      if (Types.ObjectId.isValid(userId)) {
        ownConditions.push({ userId: new Types.ObjectId(userId) });
      }
      ownConditions.push({ userId: userId.toString() });
    }
    if (email && typeof email === 'string' && email.trim()) {
      const cleanEmail = escapeRegex(email.trim());
      ownConditions.push({ email: { $regex: new RegExp(`^${cleanEmail}$`, 'i') } });
    }

    if (scope === 'own') {
      if (ownConditions.length === 0) {
        return null;
      }
      return { companyId, $or: ownConditions };
    }

    if (scope === 'team') {
      // Find teams where caller is member or teamLead within this company
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

      let colleagueEmployeeIds: any[] = [];
      if (teamSearchConditions.length > 0) {
        const teams = await this.teamModel
          .find({ companyId, $or: teamSearchConditions })
          .select('members teamLead')
          .lean()
          .exec();

        for (const t of teams) {
          if (t.teamLead) colleagueEmployeeIds.push(t.teamLead);
          if (Array.isArray(t.members)) colleagueEmployeeIds.push(...t.members);
        }
      }

      const teamConditions: any[] = [...ownConditions];
      if (colleagueEmployeeIds.length > 0) {
        teamConditions.push({ _id: { $in: colleagueEmployeeIds } });
      }

      if (teamConditions.length === 0) {
        return null;
      }

      return { companyId, $or: teamConditions };
    }

    return null;
  }

  async create(companyId: Types.ObjectId, createEmployeeDto: any): Promise<Employee> {
    if (createEmployeeDto.email && typeof createEmployeeDto.email === 'string') {
      const cleanEmail = escapeRegex(createEmployeeDto.email.trim().toLowerCase());

      const existingEmployee = await this.employeeModel
        .findOne({
          companyId,
          email: { $regex: new RegExp(`^${cleanEmail}$`, 'i') },
        })
        .select('_id')
        .lean()
        .exec();

      if (existingEmployee) {
        throw new ConflictException(
          `An employee with email "${createEmployeeDto.email}" already exists in this company`,
        );
      }

      createEmployeeDto.email = createEmployeeDto.email.trim().toLowerCase();

      // If user exists with this email, link userId
      const existingUser = await this.usersService.findByEmail(createEmployeeDto.email);
      if (existingUser) {
        createEmployeeDto.userId = existingUser._id;
        // TODO(MC-34): is_employee flag is moving to Membership; stop mutating User.is_employee
      }
    }

    createEmployeeDto.companyId = companyId;
    const newEmployee = new this.employeeModel(createEmployeeDto);
    return newEmployee.save();
  }

  async findAll(
    companyId: Types.ObjectId,
    userId?: string,
    email?: string,
    isSystemAdmin?: boolean,
    scope: ScopeType = 'all',
  ): Promise<Employee[]> {
    if (scope === 'none' && !isSystemAdmin) {
      return [];
    }

    const scopeFilter = await this.buildEmployeeScopeFilter(
      companyId,
      userId,
      email,
      isSystemAdmin,
      scope,
    );
    if (scopeFilter === null) {
      return [];
    }

    return this.employeeModel.find(scopeFilter).populate('userId').exec();
  }

  async findOne(
    companyId: Types.ObjectId,
    id: string,
    userId?: string,
    email?: string,
    isSystemAdmin?: boolean,
    scope: ScopeType = 'own',
  ): Promise<Employee> {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException(`Employee #${id} not found`);
    }

    const employee = await this.employeeModel
      .findOne({ _id: new Types.ObjectId(id), companyId })
      .populate('userId')
      .exec();

    if (!employee) {
      throw new NotFoundException(`Employee #${id} not found`);
    }

    // ─── PBAC Record-Level Scope Check ──────────────────────────────────────
    if (!isSystemAdmin && scope !== 'all') {
      if (scope === 'none') {
        throw new ForbiddenException({
          statusCode: 403,
          error: 'Forbidden',
          message: 'Access denied: scope is none for this action',
        });
      }

      const callerEmployeeIds = await this.getCallerEmployeeIds(companyId, userId, email);
      const primaryEmpId = callerEmployeeIds.length > 0 ? String(callerEmployeeIds[0]) : undefined;

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

      const callerTeams =
        teamSearchConditions.length > 0
          ? await this.teamModel
              .find({ companyId, $or: teamSearchConditions })
              .select('_id members teamLead')
              .lean()
              .exec()
          : [];

      const callerTeamIds = callerTeams.map((t: any) => String(t._id));
      const callerLeadingTeamIds = callerTeams
        .filter(
          (t: any) =>
            t.teamLead &&
            (callerEmployeeIds.some((e) => String(e) === String(t.teamLead)) ||
              (userId && String(t.teamLead) === String(userId))),
        )
        .map((t: any) => String(t._id));

      const targetEmpId = employee._id;
      const targetTeamConditions: any[] = [
        { members: targetEmpId },
        { teamLead: targetEmpId },
      ];
      if (employee.userId) {
        targetTeamConditions.push(
          { members: employee.userId },
          { teamLead: employee.userId },
        );
      }

      const targetTeams = await this.teamModel
        .find({ companyId, $or: targetTeamConditions })
        .select('_id')
        .lean()
        .exec();
      const targetEmployeeTeamIds = targetTeams.map((t: any) => String(t._id));

      const subject: EmployeeSubject = {
        userId,
        email,
        employeeId: primaryEmpId,
        teamIds: callerTeamIds,
        leadingTeamIds: callerLeadingTeamIds,
        isSystemAdmin,
      };

      const context: EmployeeTeamContext = {
        targetEmployeeTeamIds,
        teams: callerTeams,
      };

      const inScope = isEmployeeInScope(scope, employee, subject, context);
      if (!inScope) {
        throw new ForbiddenException({
          statusCode: 403,
          error: 'Forbidden',
          message: `Access denied: employee is out of scope (granted scope: '${scope}')`,
        });
      }
    }

    return employee;
  }

  async findByEmail(companyId: Types.ObjectId, email: string): Promise<Employee | null> {
    if (!email || !email.trim()) return null;
    const cleanEmail = escapeRegex(email.trim());
    return this.employeeModel
      .findOne({
        companyId,
        email: { $regex: new RegExp(`^${cleanEmail}$`, 'i') },
      })
      .populate('userId')
      .exec();
  }

  async findByUserId(companyId: Types.ObjectId, userId: string): Promise<Employee | null> {
    if (!userId) return null;
    const userQuery = Types.ObjectId.isValid(userId)
      ? { $in: [new Types.ObjectId(userId), userId.toString()] }
      : userId;
    return this.employeeModel.findOne({ companyId, userId: userQuery }).exec();
  }

  async linkUserByEmail(
    companyId: Types.ObjectId,
    email: string,
    userId: any,
  ): Promise<Employee | null> {
    if (!email || !email.trim()) return null;
    const cleanEmail = escapeRegex(email.trim());
    const userObjId = Types.ObjectId.isValid(userId) ? new Types.ObjectId(userId) : userId;
    const updated = await this.employeeModel
      .findOneAndUpdate(
        {
          companyId,
          email: { $regex: new RegExp(`^${cleanEmail}$`, 'i') },
          $or: [
            { userId: null },
            { userId: { $exists: false } },
            { userId: userObjId },
            { userId: userId.toString() },
          ],
        },
        { $set: { userId: userObjId } },
        { new: true },
      )
      .exec();

    // TODO(MC-34): is_employee flag is moving to Membership; stop mutating User.is_employee
    return updated;
  }

  async update(
    companyId: Types.ObjectId,
    id: string,
    updateEmployeeDto: any,
    userId?: string,
    email?: string,
    isSystemAdmin?: boolean,
    scope: ScopeType = 'own',
  ): Promise<Employee> {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException(`Employee #${id} not found`);
    }

    if (!isSystemAdmin && scope !== 'all') {
      await this.findOne(companyId, id, userId, email, isSystemAdmin, scope);
    }

    if (updateEmployeeDto.email !== undefined) {
      if (updateEmployeeDto.email && typeof updateEmployeeDto.email === 'string') {
        const cleanEmail = escapeRegex(updateEmployeeDto.email.trim().toLowerCase());

        const existingWithEmail = await this.employeeModel
          .findOne({
            companyId,
            _id: { $ne: new Types.ObjectId(id) },
            email: { $regex: new RegExp(`^${cleanEmail}$`, 'i') },
          })
          .select('_id')
          .lean()
          .exec();

        if (existingWithEmail) {
          throw new ConflictException(
            `An employee with email "${updateEmployeeDto.email}" already exists in this company`,
          );
        }

        updateEmployeeDto.email = updateEmployeeDto.email.trim().toLowerCase();
        const matchingUser = await this.usersService.findByEmail(updateEmployeeDto.email);
        updateEmployeeDto.userId = matchingUser ? matchingUser._id : null;
        // TODO(MC-34): is_employee flag is moving to Membership; stop mutating User.is_employee
      } else {
        updateEmployeeDto.userId = null;
      }
    }

    const existingEmployee = await this.employeeModel
      .findOneAndUpdate(
        { _id: new Types.ObjectId(id), companyId },
        { $set: updateEmployeeDto },
        { new: true },
      )
      .populate('userId')
      .exec();

    if (!existingEmployee) {
      throw new NotFoundException(`Employee #${id} not found`);
    }
    return existingEmployee;
  }

  async remove(
    companyId: Types.ObjectId,
    id: string,
    userId?: string,
    email?: string,
    isSystemAdmin?: boolean,
    scope: ScopeType = 'own',
  ): Promise<any> {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException(`Employee #${id} not found`);
    }

    if (!isSystemAdmin && scope !== 'all') {
      await this.findOne(companyId, id, userId, email, isSystemAdmin, scope);
    }

    const deletedEmployee = await this.employeeModel
      .findOneAndDelete({ _id: new Types.ObjectId(id), companyId })
      .exec();

    if (!deletedEmployee) {
      throw new NotFoundException(`Employee #${id} not found`);
    }

    // TODO(MC-34): is_employee flag is moving to Membership; stop mutating User.is_employee
    return deletedEmployee;
  }

  /**
   * Idempotently create (or link) an Employee record for a given User within a company.
   */
  async createFromUser(
    companyId: Types.ObjectId,
    user: UserDocument | any,
    roleOrOptions?: string | { role?: string; status?: string },
    statusParam?: string,
  ): Promise<Employee> {
    let role = 'Employee';
    let status = 'Active';

    if (typeof roleOrOptions === 'string') {
      role = roleOrOptions;
      if (statusParam) status = statusParam;
    } else if (roleOrOptions && typeof roleOrOptions === 'object') {
      if (roleOrOptions.role) role = roleOrOptions.role;
      if (roleOrOptions.status) status = roleOrOptions.status;
    }

    const userObjId = Types.ObjectId.isValid(user._id) ? new Types.ObjectId(user._id) : user._id;

    // 1. Idempotency guard — already linked in this company?
    const userQuery = Types.ObjectId.isValid(user._id)
      ? { $in: [new Types.ObjectId(user._id), user._id.toString()] }
      : user._id;
    const existing = await this.employeeModel
      .findOne({ companyId, userId: userQuery })
      .exec();
    if (existing) return existing;

    // 2. Unlinked Employee with matching email in this company -> link instead of creating duplicate
    if (user.email) {
      const linked = await this.linkUserByEmail(companyId, user.email, userObjId);
      if (linked) {
        if (role && role !== 'Employee' && linked.role !== role) {
          linked.role = role;
          if (typeof linked.save === 'function') {
            await linked.save();
          }
        }
        return linked;
      }
    }

    // 3. Create a new Employee record in this company
    const nameParts = (user.name ?? '').trim().split(/\s+/).filter(Boolean);
    const firstName = nameParts[0] || user.email || 'Unknown';
    const lastName = nameParts.slice(1).join(' ') || '';

    const payload: Record<string, any> = {
      companyId,
      userId: userObjId,
      fullName: { firstName, lastName },
      role,
      joiningDate: new Date(),
      status,
    };

    if (user.email) {
      payload.email = user.email.trim().toLowerCase();
    }

    const newEmployee = new this.employeeModel(payload);
    return newEmployee.save();
  }

  /**
   * Verified, explicit link repair within a company.
   */
  async linkByUserId(
    companyId: Types.ObjectId,
    userId: any,
    verifiedEmail: string,
  ): Promise<Employee | null> {
    if (!verifiedEmail || !verifiedEmail.trim()) return null;
    const cleanEmail = escapeRegex(verifiedEmail.trim().toLowerCase());

    const employee = await this.employeeModel
      .findOne({
        companyId,
        email: { $regex: new RegExp(`^${cleanEmail}$`, 'i') },
      })
      .exec();

    if (!employee) return null;

    if (employee.userId?.toString() === userId?.toString()) return employee;
    if (employee.userId) return null;

    return this.employeeModel
      .findOneAndUpdate(
        { _id: employee._id, companyId },
        { $set: { userId } },
        { new: true },
      )
      .exec();
  }

  /**
   * Returns the link status for a given Employee in a company.
   */
  async getLinkStatus(
    companyId: Types.ObjectId,
    id: string,
    userId?: string,
    email?: string,
    isSystemAdmin?: boolean,
    scope: ScopeType = 'own',
  ): Promise<{
    linked: boolean;
    userId: string | null;
    employeeEmail: string | null;
  }> {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException(`Employee #${id} not found`);
    }

    if (!isSystemAdmin && scope !== 'all') {
      await this.findOne(companyId, id, userId, email, isSystemAdmin, scope);
    }

    const employee = await this.employeeModel
      .findOne({ _id: new Types.ObjectId(id), companyId })
      .exec();

    if (!employee) return { linked: false, userId: null, employeeEmail: null };
    return {
      linked: !!employee.userId,
      userId: employee.userId ? employee.userId.toString() : null,
      employeeEmail: employee.email || null,
    };
  }
}
