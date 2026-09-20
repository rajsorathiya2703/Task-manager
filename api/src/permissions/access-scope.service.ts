import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Employee } from '../employees/schemas/employee.schema';
import { Team } from '../teams/schemas/team.schema';

export interface UserContext {
  id?: string;
  _id?: string;
  email?: string;
  is_system_admin?: boolean;
}

export interface TeamContext {
  teamIds: Types.ObjectId[];
  memberEmployeeIds: Types.ObjectId[];
  leadTeamIds: Types.ObjectId[];
}

@Injectable()
export class AccessScopeService {
  private readonly logger = new Logger(AccessScopeService.name);

  constructor(
    @InjectModel(Employee.name) private readonly employeeModel: Model<Employee>,
    @InjectModel(Team.name) private readonly teamModel: Model<Team>,
  ) {}

  /**
   * Resolves all Employee ObjectIds associated with a user (by userId and/or email).
   */
  async getEmployeeIdsForUser(userId?: string, email?: string): Promise<Types.ObjectId[]> {
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
    if (employeeQuery.length === 0) return [];

    const employees = await this.employeeModel.find({ $or: employeeQuery }, { _id: 1 }).exec();
    return employees.map((e) => e._id as Types.ObjectId);
  }

  /**
   * Resolves team context for a user:
   * - teamIds: teams where user/employee is a member or team lead
   * - memberEmployeeIds: all employees in those teams (including the user)
   * - leadTeamIds: teams where user/employee is specifically the team lead
   */
  async getTeamContextForUser(userId?: string, email?: string): Promise<TeamContext> {
    const ownEmployeeIds = await this.getEmployeeIdsForUser(userId, email);
    const candidateIdStrs = new Set<string>();
    ownEmployeeIds.forEach((id) => candidateIdStrs.add(id.toString()));
    if (userId) {
      candidateIdStrs.add(userId.toString());
    }

    const candidateObjectIds = Array.from(candidateIdStrs)
      .filter((id) => Types.ObjectId.isValid(id))
      .map((id) => new Types.ObjectId(id));

    if (candidateObjectIds.length === 0) {
      return { teamIds: [], memberEmployeeIds: ownEmployeeIds, leadTeamIds: [] };
    }

    // Find all teams where user is either member or teamLead
    const teams = await this.teamModel
      .find({
        $or: [
          { teamLead: { $in: candidateObjectIds } },
          { members: { $in: candidateObjectIds } },
        ],
      })
      .exec();

    const teamIds: Types.ObjectId[] = [];
    const leadTeamIds: Types.ObjectId[] = [];
    const memberEmployeeIdSet = new Set<string>();

    // Add own employee IDs to member set
    ownEmployeeIds.forEach((id) => memberEmployeeIdSet.add(id.toString()));

    for (const team of teams) {
      teamIds.push(team._id as Types.ObjectId);

      const isLead =
        team.teamLead &&
        candidateIdStrs.has((team.teamLead._id || team.teamLead).toString());

      if (isLead) {
        leadTeamIds.push(team._id as Types.ObjectId);
      }

      if (team.teamLead) {
        memberEmployeeIdSet.add((team.teamLead._id || team.teamLead).toString());
      }
      if (Array.isArray(team.members)) {
        for (const m of team.members) {
          if (m) {
            memberEmployeeIdSet.add((m._id || m).toString());
          }
        }
      }
    }

    const memberEmployeeIds = Array.from(memberEmployeeIdSet)
      .filter((id) => Types.ObjectId.isValid(id))
      .map((id) => new Types.ObjectId(id));

    return {
      teamIds,
      memberEmployeeIds,
      leadTeamIds,
    };
  }

  /**
   * Constructs MongoDB filter query based on module and scope:
   * - 'all': returns {}
   * - 'team': returns filter matching user or user's team members/teams
   * - 'own': returns filter matching user's own records
   */
  async buildFilter(
    module: string,
    user: UserContext,
    scope: 'own' | 'team' | 'all' = 'own',
  ): Promise<Record<string, any>> {
    if (user?.is_system_admin || scope === 'all') {
      return {};
    }

    const userId = user?.id || user?._id;
    const userIdStr = userId?.toString();
    const userIdObj = userIdStr && Types.ObjectId.isValid(userIdStr) ? new Types.ObjectId(userIdStr) : null;
    const email = user?.email?.trim();

    const ownEmployeeIds = await this.getEmployeeIdsForUser(userIdStr, email);

    if (scope === 'own') {
      switch (module) {
        case 'tasks': {
          const conditions: any[] = [];
          if (ownEmployeeIds.length > 0) {
            conditions.push({ assignee: { $in: ownEmployeeIds } });
          }
          if (userIdObj) conditions.push({ userId: userIdObj });
          if (userIdStr) conditions.push({ userId: userIdStr });
          if (email) {
            conditions.push({ 'members.email': { $regex: new RegExp(`^${email}$`, 'i') } });
          }
          return conditions.length > 0 ? { $or: conditions } : { _id: null };
        }

        case 'projects': {
          const conditions: any[] = [];
          if (userIdObj) conditions.push({ userId: userIdObj });
          if (userIdStr) conditions.push({ userId: userIdStr });
          if (email) {
            conditions.push({ 'members.email': { $regex: new RegExp(`^${email}$`, 'i') } });
          }
          return conditions.length > 0 ? { $or: conditions } : { _id: null };
        }

        case 'teams': {
          if (ownEmployeeIds.length === 0) {
            return userIdObj ? { teamLead: userIdObj } : { _id: null };
          }
          return {
            $or: [
              { teamLead: { $in: ownEmployeeIds } },
              { members: { $in: ownEmployeeIds } },
            ],
          };
        }

        case 'employees': {
          const conditions: any[] = [];
          if (ownEmployeeIds.length > 0) {
            conditions.push({ _id: { $in: ownEmployeeIds } });
          }
          if (userIdObj) conditions.push({ userId: userIdObj });
          if (userIdStr) conditions.push({ userId: userIdStr });
          if (email) {
            conditions.push({ email: { $regex: new RegExp(`^${email}$`, 'i') } });
          }
          return conditions.length > 0 ? { $or: conditions } : { _id: null };
        }

        case 'dayoff': {
          const conditions: any[] = [];
          if (ownEmployeeIds.length > 0) {
            conditions.push({ employeeId: { $in: ownEmployeeIds } });
          }
          if (userIdObj) conditions.push({ userId: userIdObj });
          if (userIdStr) conditions.push({ userId: userIdStr });
          return conditions.length > 0 ? { $or: conditions } : { _id: null };
        }

        default:
          return {};
      }
    }

    if (scope === 'team') {
      const teamContext = await this.getTeamContextForUser(userIdStr, email);

      switch (module) {
        case 'tasks': {
          const conditions: any[] = [];
          // 1. Assigned to any employee in user's teams (including user)
          if (teamContext.memberEmployeeIds.length > 0) {
            conditions.push({ assignee: { $in: teamContext.memberEmployeeIds } });
          }
          // 2. Belongs to user's projects or teams
          if (teamContext.teamIds.length > 0) {
            conditions.push({ teamId: { $in: teamContext.teamIds } });
          }
          // 3. User is direct creator / owner
          if (userIdObj) conditions.push({ userId: userIdObj });
          if (userIdStr) conditions.push({ userId: userIdStr });
          if (email) {
            conditions.push({ 'members.email': { $regex: new RegExp(`^${email}$`, 'i') } });
          }
          return conditions.length > 0 ? { $or: conditions } : { _id: null };
        }

        case 'projects': {
          const conditions: any[] = [];
          // 1. Projects linked to user's teams
          if (teamContext.teamIds.length > 0) {
            conditions.push({ teamId: { $in: teamContext.teamIds } });
          }
          // 2. User is direct owner
          if (userIdObj) conditions.push({ userId: userIdObj });
          if (userIdStr) conditions.push({ userId: userIdStr });
          if (email) {
            conditions.push({ 'members.email': { $regex: new RegExp(`^${email}$`, 'i') } });
          }
          return conditions.length > 0 ? { $or: conditions } : { _id: null };
        }

        case 'teams': {
          // User is member or team lead of team
          if (ownEmployeeIds.length === 0) {
            return userIdObj ? { teamLead: userIdObj } : { _id: null };
          }
          return {
            $or: [
              { teamLead: { $in: ownEmployeeIds } },
              { members: { $in: ownEmployeeIds } },
            ],
          };
        }

        case 'employees': {
          // Team members + user's employee
          const employeeIds = teamContext.memberEmployeeIds;
          const conditions: any[] = [];
          if (employeeIds.length > 0) {
            conditions.push({ _id: { $in: employeeIds } });
          }
          if (userIdObj) conditions.push({ userId: userIdObj });
          if (userIdStr) conditions.push({ userId: userIdStr });
          return conditions.length > 0 ? { $or: conditions } : { _id: null };
        }

        case 'dayoff': {
          const conditions: any[] = [];
          if (teamContext.memberEmployeeIds.length > 0) {
            conditions.push({ employeeId: { $in: teamContext.memberEmployeeIds } });
          }
          if (userIdObj) conditions.push({ userId: userIdObj });
          if (userIdStr) conditions.push({ userId: userIdStr });
          return conditions.length > 0 ? { $or: conditions } : { _id: null };
        }

        default:
          return {};
      }
    }

    return {};
  }

  /**
   * Evaluates in-memory whether a user can access a specific entity record under the given scope.
   */
  async canAccess(
    module: string,
    record: any,
    user: UserContext,
    scope: 'own' | 'team' | 'all' = 'own',
  ): Promise<boolean> {
    if (!record) return false;
    if (user?.is_system_admin || scope === 'all') return true;

    const userId = user?.id || user?._id;
    const userIdStr = userId?.toString();
    const email = user?.email?.trim().toLowerCase();

    const ownEmployeeIds = await this.getEmployeeIdsForUser(userIdStr, email);
    const ownEmployeeIdStrs = new Set(ownEmployeeIds.map((id) => id.toString()));
    if (userIdStr) ownEmployeeIdStrs.add(userIdStr);

    if (scope === 'own') {
      switch (module) {
        case 'tasks': {
          const assigneeStr = (record.assignee?._id || record.assignee)?.toString();
          if (assigneeStr && ownEmployeeIdStrs.has(assigneeStr)) return true;

          const creatorStr = (record.userId?._id || record.userId)?.toString();
          if (creatorStr && ownEmployeeIdStrs.has(creatorStr)) return true;

          if (email && Array.isArray(record.members)) {
            if (record.members.some((m: any) => m?.email?.toLowerCase() === email)) return true;
          }
          return false;
        }

        case 'projects': {
          const creatorStr = (record.userId?._id || record.userId)?.toString();
          if (creatorStr && ownEmployeeIdStrs.has(creatorStr)) return true;

          if (email && Array.isArray(record.members)) {
            if (record.members.some((m: any) => m?.email?.toLowerCase() === email)) return true;
          }
          return false;
        }

        case 'teams': {
          const leadStr = (record.teamLead?._id || record.teamLead)?.toString();
          if (leadStr && ownEmployeeIdStrs.has(leadStr)) return true;
          if (Array.isArray(record.members)) {
            if (record.members.some((m: any) => ownEmployeeIdStrs.has((m?._id || m)?.toString()))) return true;
          }
          return false;
        }

        case 'employees': {
          const empIdStr = (record._id || record.id)?.toString();
          if (empIdStr && ownEmployeeIdStrs.has(empIdStr)) return true;
          const uIdStr = (record.userId?._id || record.userId)?.toString();
          if (uIdStr && ownEmployeeIdStrs.has(uIdStr)) return true;
          if (email && record.email?.toLowerCase() === email) return true;
          return false;
        }

        case 'dayoff': {
          const empIdStr = (record.employeeId?._id || record.employeeId)?.toString();
          if (empIdStr && ownEmployeeIdStrs.has(empIdStr)) return true;
          const uIdStr = (record.userId?._id || record.userId)?.toString();
          if (uIdStr && ownEmployeeIdStrs.has(uIdStr)) return true;
          return false;
        }

        default:
          return true;
      }
    }

    if (scope === 'team') {
      const teamContext = await this.getTeamContextForUser(userIdStr, email);
      const teamMemberIdStrs = new Set(teamContext.memberEmployeeIds.map((id) => id.toString()));
      const teamIdStrs = new Set(teamContext.teamIds.map((id) => id.toString()));
      if (userIdStr) teamMemberIdStrs.add(userIdStr);

      switch (module) {
        case 'tasks': {
          const assigneeStr = (record.assignee?._id || record.assignee)?.toString();
          if (assigneeStr && teamMemberIdStrs.has(assigneeStr)) return true;

          const taskTeamStr = (record.teamId?._id || record.teamId)?.toString();
          if (taskTeamStr && teamIdStrs.has(taskTeamStr)) return true;

          const creatorStr = (record.userId?._id || record.userId)?.toString();
          if (creatorStr && teamMemberIdStrs.has(creatorStr)) return true;

          if (email && Array.isArray(record.members)) {
            if (record.members.some((m: any) => m?.email?.toLowerCase() === email)) return true;
          }
          return false;
        }

        case 'projects': {
          const projectTeamStr = (record.teamId?._id || record.teamId)?.toString();
          if (projectTeamStr && teamIdStrs.has(projectTeamStr)) return true;

          const creatorStr = (record.userId?._id || record.userId)?.toString();
          if (creatorStr && teamMemberIdStrs.has(creatorStr)) return true;

          if (email && Array.isArray(record.members)) {
            if (record.members.some((m: any) => m?.email?.toLowerCase() === email)) return true;
          }
          return false;
        }

        case 'teams': {
          const teamIdStr = (record._id || record.id)?.toString();
          if (teamIdStr && teamIdStrs.has(teamIdStr)) return true;
          const leadStr = (record.teamLead?._id || record.teamLead)?.toString();
          if (leadStr && teamMemberIdStrs.has(leadStr)) return true;
          if (Array.isArray(record.members)) {
            if (record.members.some((m: any) => teamMemberIdStrs.has((m?._id || m)?.toString()))) return true;
          }
          return false;
        }

        case 'employees': {
          const empIdStr = (record._id || record.id)?.toString();
          if (empIdStr && teamMemberIdStrs.has(empIdStr)) return true;
          const uIdStr = (record.userId?._id || record.userId)?.toString();
          if (uIdStr && teamMemberIdStrs.has(uIdStr)) return true;
          return false;
        }

        case 'dayoff': {
          const empIdStr = (record.employeeId?._id || record.employeeId)?.toString();
          if (empIdStr && teamMemberIdStrs.has(empIdStr)) return true;
          const uIdStr = (record.userId?._id || record.userId)?.toString();
          if (uIdStr && teamMemberIdStrs.has(uIdStr)) return true;
          return false;
        }

        default:
          return true;
      }
    }

    return true;
  }
}
