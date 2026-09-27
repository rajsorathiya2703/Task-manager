import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
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

@Injectable()
export class EmployeesService {
  constructor(
    @InjectModel(Employee.name) private employeeModel: Model<Employee>,
    @InjectModel(Team.name) private teamModel: Model<Team>,
    private usersService: UsersService,
  ) {}

  /**
   * Pure read-only helper: resolves all Employee IDs that correspond to a
   * given userId and/or email. Used to build access-check query conditions.
   */
  private async getCallerEmployeeIds(userId?: string, email?: string): Promise<Types.ObjectId[]> {
    const employeeQuery: any[] = [];
    if (userId) {
      if (Types.ObjectId.isValid(userId)) {
        employeeQuery.push({ userId: new Types.ObjectId(userId) });
      }
      employeeQuery.push({ userId: userId.toString() });
    }
    if (email && typeof email === 'string' && email.trim()) {
      const cleanEmail = email.trim();
      employeeQuery.push({ email: { $regex: new RegExp(`^${cleanEmail}$`, 'i') } });
    }

    if (employeeQuery.length === 0) {
      return [];
    }

    const employees = await this.employeeModel
      .find({ $or: employeeQuery })
      .select('_id')
      .lean()
      .exec();

    return employees.map((e: any) => e._id as Types.ObjectId);
  }

  /**
   * Builds Mongo query criteria for employees according to the user's effective scope:
   *   - 'all' / isSystemAdmin: {} (no extra criteria)
   *   - 'none': null (empty set -> short-circuit to [])
   *   - 'own': matches only the caller's own employee record (isSelf)
   *   - 'team': matches caller's own employee record + colleagues who share at least one team
   */
  private async buildEmployeeScopeFilter(
    userId?: string,
    email?: string,
    isSystemAdmin?: boolean,
    scope: ScopeType = 'all',
  ): Promise<any> {
    if (isSystemAdmin || scope === 'all') {
      return {};
    }
    if (scope === 'none') {
      return null;
    }

    const callerEmployeeIds = await this.getCallerEmployeeIds(userId, email);

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
      const cleanEmail = email.trim();
      ownConditions.push({ email: { $regex: new RegExp(`^${cleanEmail}$`, 'i') } });
    }

    if (scope === 'own') {
      if (ownConditions.length === 0) {
        return null;
      }
      return { $or: ownConditions };
    }

    if (scope === 'team') {
      // Find teams where caller is member or teamLead
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
          .find({ $or: teamSearchConditions })
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

      return { $or: teamConditions };
    }

    return null;
  }

  async create(createEmployeeDto: any): Promise<Employee> {
    if (createEmployeeDto.email && typeof createEmployeeDto.email === 'string') {
      createEmployeeDto.email = createEmployeeDto.email.trim().toLowerCase();
      // If user exists with this email, link userId and set is_employee
      const existingUser = await this.usersService.findByEmail(createEmployeeDto.email);
      if (existingUser) {
        createEmployeeDto.userId = existingUser._id;
        await this.usersService.updateUser(existingUser._id.toString(), { is_employee: true });
      }
    }
    const newEmployee = new this.employeeModel(createEmployeeDto);
    return newEmployee.save();
  }

  async findAll(
    userId?: string,
    email?: string,
    isSystemAdmin?: boolean,
    scope: ScopeType = 'all',
  ): Promise<Employee[]> {
    if (scope === 'none' && !isSystemAdmin) {
      return [];
    }

    const scopeFilter = await this.buildEmployeeScopeFilter(userId, email, isSystemAdmin, scope);
    if (scopeFilter === null) {
      return [];
    }

    return this.employeeModel.find(scopeFilter).populate('userId').exec();
  }

  async findOne(
    id: string,
    userId?: string,
    email?: string,
    isSystemAdmin?: boolean,
    scope: ScopeType = 'own',
  ): Promise<Employee> {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException(`Employee #${id} not found`);
    }

    const employee = await this.employeeModel.findById(id).populate('userId').exec();
    if (!employee) {
      throw new NotFoundException(`Employee #${id} not found`);
    }

    // ─── PBAC Record-Level Scope Check (§6.2, §6.3) ─────────────────────────
    if (!isSystemAdmin && scope !== 'all') {
      if (scope === 'none') {
        throw new ForbiddenException({
          statusCode: 403,
          error: 'Forbidden',
          message: 'Access denied: scope is none for this action',
        });
      }

      const callerEmployeeIds = await this.getCallerEmployeeIds(userId, email);
      const primaryEmpId = callerEmployeeIds.length > 0 ? String(callerEmployeeIds[0]) : undefined;

      // Find teams where caller is member or teamLead
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
              .find({ $or: teamSearchConditions })
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

      // Find teams where target employee is a member or lead
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
        .find({ $or: targetTeamConditions })
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

  async findByEmail(email: string): Promise<Employee | null> {
    if (!email || !email.trim()) return null;
    const cleanEmail = email.trim();
    return this.employeeModel.findOne({
      email: { $regex: new RegExp(`^${cleanEmail}$`, 'i') },
    }).populate('userId').exec();
  }

  async findByUserId(userId: string): Promise<Employee | null> {
    if (!userId) return null;
    return this.employeeModel.findOne({ userId }).exec();
  }

  async linkUserByEmail(email: string, userId: any): Promise<Employee | null> {
    if (!email || !email.trim()) return null;
    const cleanEmail = email.trim();
    const updated = await this.employeeModel.findOneAndUpdate(
      { email: { $regex: new RegExp(`^${cleanEmail}$`, 'i') } },
      { $set: { userId } },
      { new: true },
    ).exec();

    if (updated && userId) {
      await this.usersService.updateUser(userId.toString(), { is_employee: true });
    }
    return updated;
  }

  async update(
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
      await this.findOne(id, userId, email, isSystemAdmin, scope);
    }

    if (updateEmployeeDto.email !== undefined) {
      if (updateEmployeeDto.email && typeof updateEmployeeDto.email === 'string') {
        updateEmployeeDto.email = updateEmployeeDto.email.trim().toLowerCase();
        const matchingUser = await this.usersService.findByEmail(updateEmployeeDto.email);
        updateEmployeeDto.userId = matchingUser ? matchingUser._id : null;
        if (matchingUser) {
          await this.usersService.updateUser(matchingUser._id.toString(), { is_employee: true });
        }
      } else {
        updateEmployeeDto.userId = null;
      }
    }

    const existingEmployee = await this.employeeModel.findByIdAndUpdate(
      id,
      { $set: updateEmployeeDto },
      { new: true },
    ).populate('userId').exec();

    if (!existingEmployee) {
      throw new NotFoundException(`Employee #${id} not found`);
    }
    return existingEmployee;
  }

  async remove(
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
      await this.findOne(id, userId, email, isSystemAdmin, scope);
    }

    const deletedEmployee = await this.employeeModel.findByIdAndDelete(id).exec();
    if (!deletedEmployee) {
      throw new NotFoundException(`Employee #${id} not found`);
    }
    if (deletedEmployee.userId) {
      const remaining = await this.employeeModel.findOne({ userId: deletedEmployee.userId }).exec();
      if (!remaining) {
        await this.usersService.updateUser(deletedEmployee.userId.toString(), { is_employee: false });
      }
    }
    return deletedEmployee;
  }

  /**
   * Idempotently create (or link) an Employee record for a given User.
   */
  async createFromUser(user: UserDocument): Promise<Employee> {
    // 1. Idempotency guard — already linked?
    const existing = await this.employeeModel.findOne({ userId: user._id }).exec();
    if (existing) return existing;

    // 2. Unlinked Employee with matching email → link instead of creating a duplicate
    if (user.email) {
      const linked = await this.linkUserByEmail(user.email, user._id);
      if (linked) return linked;
    }

    // 3. Create a new Employee record
    const nameParts = (user.name ?? '').trim().split(/\s+/).filter(Boolean);
    const firstName = nameParts[0] || user.email || 'Unknown';
    const lastName = nameParts.slice(1).join(' ') || '';

    const payload: Record<string, any> = {
      userId: user._id,
      fullName: { firstName, lastName },
      role: 'Employee',
      joiningDate: new Date(),
      status: 'Active',
    };

    // Only set email if present — omitting the key entirely satisfies the sparse unique index
    if (user.email) {
      payload.email = user.email;
    }

    const newEmployee = new this.employeeModel(payload);
    return newEmployee.save();
  }

  /**
   * Verified, explicit link repair.
   */
  async linkByUserId(
    userId: any,
    verifiedEmail: string,
  ): Promise<Employee | null> {
    if (!verifiedEmail || !verifiedEmail.trim()) return null;
    const cleanEmail = verifiedEmail.trim().toLowerCase();

    // Find an employee whose email matches the verified email
    const employee = await this.employeeModel
      .findOne({ email: { $regex: new RegExp(`^${cleanEmail}$`, 'i') } })
      .exec();

    if (!employee) return null;

    // Already linked to this user — idempotent, return as-is
    if (employee.userId?.toString() === userId?.toString()) return employee;

    // Already linked to a DIFFERENT user — do not overwrite
    if (employee.userId) return null;

    // Safe to link
    return this.employeeModel
      .findByIdAndUpdate(
        employee._id,
        { $set: { userId } },
        { new: true },
      )
      .exec();
  }

  /**
   * Returns the link status for a given Employee
   */
  async getLinkStatus(
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
      await this.findOne(id, userId, email, isSystemAdmin, scope);
    }

    const employee = await this.employeeModel.findById(id).exec();
    if (!employee) return { linked: false, userId: null, employeeEmail: null };
    return {
      linked: !!employee.userId,
      userId: employee.userId ? employee.userId.toString() : null,
      employeeEmail: employee.email || null,
    };
  }
}
