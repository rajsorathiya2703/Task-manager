import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Team } from './schemas/team.schema';
import { Task } from '../tasks/schemas/task.schema';
import { Employee } from '../employees/schemas/employee.schema';
import { CommentsService } from '../comments/comments.service';
import {
  isTeamInScope,
  TeamSubject,
  TeamResource,
  ScopeType,
} from '../access/resolvers/teams.resolver';

@Injectable()
export class TeamsService {
  constructor(
    @InjectModel(Team.name) private teamModel: Model<Team>,
    @InjectModel(Task.name) private taskModel: Model<Task>,
    @InjectModel(Employee.name) private employeeModel: Model<Employee>,
    private commentsService: CommentsService,
  ) {}

  /**
   * Pure read-only helper: resolves all Employee IDs that correspond to a
   * given userId and/or email within the given company. Used to build access-check query conditions.
   */
  private async getEmployeeIdsForUser(
    companyId: Types.ObjectId,
    userId?: string,
    email?: string,
  ): Promise<any[]> {
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

    const employees: any[] =
      employeeQuery.length > 0
        ? await this.employeeModel.find({ companyId, $or: employeeQuery }).exec()
        : [];

    const ids: any[] = employees.map((e) => e._id);
    if (userId) {
      if (Types.ObjectId.isValid(userId)) {
        ids.push(new Types.ObjectId(userId));
      }
      ids.push(userId.toString());
    }
    return ids;
  }

  /**
   * Validates that teamLead and all members belong to the specified company.
   * Throws BadRequestException on mismatch.
   */
  private async validateEmployeesBelongToCompany(
    companyId: Types.ObjectId,
    members?: any[],
    teamLead?: any,
  ): Promise<void> {
    const idsToVerify: Types.ObjectId[] = [];
    if (teamLead) {
      if (!Types.ObjectId.isValid(teamLead)) {
        throw new BadRequestException(`Invalid teamLead ID: ${teamLead}`);
      }
      idsToVerify.push(new Types.ObjectId(teamLead));
    }
    if (Array.isArray(members)) {
      for (const m of members) {
        const id = m?._id || m;
        if (!Types.ObjectId.isValid(id)) {
          throw new BadRequestException(`Invalid member ID: ${id}`);
        }
        idsToVerify.push(new Types.ObjectId(id));
      }
    }

    if (idsToVerify.length === 0) {
      return;
    }

    const uniqueIdStrings = Array.from(new Set(idsToVerify.map((id) => id.toString())));
    const uniqueIds = uniqueIdStrings.map((id) => new Types.ObjectId(id));

    const foundEmployees = await this.employeeModel
      .find({
        _id: { $in: uniqueIds },
        companyId,
      })
      .select('_id')
      .exec();

    if (foundEmployees.length !== uniqueIds.length) {
      throw new BadRequestException(
        'teamLead and all members must be valid employees belonging to this company',
      );
    }
  }

  /**
   * Builds Mongo query criteria for teams according to the user's effective scope:
   *   - 'all' / isSystemAdmin: {} (no extra criteria)
   *   - 'own' / 'team': matches teams where user's employeeId is in members or is teamLead
   *   - 'none': null (empty set)
   */
  private async buildTeamScopeFilter(
    companyId: Types.ObjectId,
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

    const employeeIds = await this.getEmployeeIdsForUser(companyId, userId, email);
    if (employeeIds.length === 0) {
      return null;
    }

    return {
      $or: [
        { members: { $in: employeeIds } },
        { teamLead: { $in: employeeIds } },
      ],
    };
  }

  async create(companyId: Types.ObjectId, createTeamDto: any): Promise<Team> {
    await this.validateEmployeesBelongToCompany(
      companyId,
      createTeamDto?.members,
      createTeamDto?.teamLead,
    );
    const newTeam = new this.teamModel({
      ...createTeamDto,
      companyId,
    });
    return newTeam.save();
  }

  async findAll(
    companyId: Types.ObjectId,
    userId?: string,
    email?: string,
    isSystemAdmin?: boolean,
    scope: ScopeType = 'all',
  ): Promise<Team[]> {
    if (scope === 'none' && !isSystemAdmin) {
      return [];
    }

    const scopeFilter = await this.buildTeamScopeFilter(companyId, userId, email, isSystemAdmin, scope);
    if (scopeFilter === null) {
      return [];
    }

    return this.teamModel
      .find({ companyId, ...scopeFilter })
      .populate('members')
      .populate('teamLead')
      .exec();
  }

  async findOne(
    companyId: Types.ObjectId,
    id: string,
    userId?: string,
    email?: string,
    isSystemAdmin?: boolean,
    scope: ScopeType = 'own',
  ): Promise<Team> {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException(`Team #${id} not found`);
    }
    const team = await this.teamModel
      .findOne({ _id: id, companyId })
      .populate('members')
      .populate('teamLead')
      .exec();
    if (!team) {
      throw new NotFoundException(`Team #${id} not found`);
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

      const employeeIds = await this.getEmployeeIdsForUser(companyId, userId, email);
      const primaryEmpId = employeeIds.length > 0 ? String(employeeIds[0]) : undefined;

      const userTeams = await this.teamModel
        .find({
          companyId,
          $or: [
            { members: { $in: employeeIds } },
            { teamLead: { $in: employeeIds } },
          ],
        })
        .select('_id teamLead')
        .lean()
        .exec();

      const teamIds = userTeams.map((t) => String(t._id));
      const leadingTeamIds = userTeams
        .filter(
          (t) =>
            t.teamLead &&
            employeeIds.some((e) => String(e) === String(t.teamLead)),
        )
        .map((t) => String(t._id));

      const subject: TeamSubject = {
        userId,
        email,
        employeeId: primaryEmpId,
        teamIds,
        leadingTeamIds,
        isSystemAdmin,
      };

      const inScope = isTeamInScope(scope, team, subject);
      if (!inScope) {
        throw new ForbiddenException({
          statusCode: 403,
          error: 'Forbidden',
          message: `Access denied: team is out of scope (granted scope: '${scope}')`,
        });
      }
    }

    return team;
  }

  async update(
    companyId: Types.ObjectId,
    id: string,
    updateTeamDto: any,
    userId?: string,
    email?: string,
    isSystemAdmin?: boolean,
    scope: ScopeType = 'own',
  ): Promise<Team> {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException(`Team #${id} not found`);
    }
    if (!isSystemAdmin && scope !== 'all') {
      await this.findOne(companyId, id, userId, email, isSystemAdmin, scope);
    }

    if (updateTeamDto.members !== undefined || updateTeamDto.teamLead !== undefined) {
      await this.validateEmployeesBelongToCompany(
        companyId,
        updateTeamDto.members,
        updateTeamDto.teamLead,
      );
    }

    const safeUpdateDto = { ...updateTeamDto };
    delete safeUpdateDto.companyId;

    const updatedTeam = await this.teamModel
      .findOneAndUpdate(
        { _id: id, companyId },
        { $set: safeUpdateDto },
        { new: true },
      )
      .populate('members')
      .populate('teamLead')
      .exec();

    if (!updatedTeam) {
      throw new NotFoundException(`Team #${id} not found`);
    }

    return updatedTeam;
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
      throw new NotFoundException(`Team #${id} not found`);
    }
    if (!isSystemAdmin && scope !== 'all') {
      await this.findOne(companyId, id, userId, email, isSystemAdmin, scope);
    }
    const deletedTeam = await this.teamModel
      .findOneAndDelete({ _id: id, companyId })
      .exec();
    if (!deletedTeam) {
      throw new NotFoundException(`Team #${id} not found`);
    }
    return deletedTeam;
  }

  async getActiveTasks(
    companyId: Types.ObjectId,
    teamId: string,
    userId?: string,
    email?: string,
    isSystemAdmin?: boolean,
    scope: ScopeType = 'all',
  ): Promise<Task[]> {
    const team = await this.findOne(companyId, teamId, userId, email, isSystemAdmin, scope);
    if (!team) {
      throw new NotFoundException(`Team #${teamId} not found`);
    }
    
    // Find all active tasks assigned to any team member
    // TODO: Task schema receives companyId in MC-21; cast to any for now
    const activeTasks = await this.taskModel
      .find({
        companyId,
        assignee: { $in: team.members },
        isTimerRunning: true,
      } as any)
      .populate('assignee')
      .populate('projectId')
      .exec();

    return activeTasks;
  }

  // ── Comment Endpoints ──

  async addComment(
    companyId: Types.ObjectId,
    id: string,
    commentData: any,
    userId?: string,
    email?: string,
  ): Promise<Team> {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException(`Team #${id} not found`);
    }

    const team = await this.teamModel
      .findOneAndUpdate(
        { _id: id, companyId },
        { $push: { comments: commentData } },
        { new: true },
      )
      .populate('members')
      .populate('teamLead')
      .exec();
    
    if (!team) throw new NotFoundException(`Team #${id} not found`);
    return team;
  }

  async updateComment(
    companyId: Types.ObjectId,
    id: string,
    commentId: string,
    updateData: any,
    userId?: string,
    email?: string,
    reqUser?: any,
  ): Promise<Team> {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException(`Team #${id} not found`);
    }

    // Fetch team to find the comment and verify ownership
    const team = await this.teamModel.findOne({ _id: id, companyId }).exec();
    if (!team) throw new NotFoundException(`Team #${id} not found`);

    const comment: any = (team as any).comments?.find(
      (c: any) => c._id?.toString() === commentId || c.id === commentId,
    );
    if (comment && !this.commentsService.isCommentOwner(comment, userId, email, reqUser)) {
      throw new ForbiddenException('You can only edit your own comments');
    }

    const updateFields: any = {};
    if (updateData.content !== undefined) updateFields['comments.$.content'] = updateData.content;
    if (updateData.attachments !== undefined) updateFields['comments.$.attachments'] = updateData.attachments;
    if (updateData.mentions !== undefined) updateFields['comments.$.mentions'] = updateData.mentions;

    const updated = await this.teamModel
      .findOneAndUpdate(
        { _id: id, companyId, 'comments._id': commentId },
        { $set: updateFields },
        { new: true },
      )
      .populate('members')
      .populate('teamLead')
      .exec();

    if (!updated) throw new NotFoundException(`Team #${id} or Comment #${commentId} not found`);
    return updated;
  }

  async deleteComment(
    companyId: Types.ObjectId,
    id: string,
    commentId: string,
    userId?: string,
    email?: string,
    reqUser?: any,
  ): Promise<Team> {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException(`Team #${id} not found`);
    }

    // Fetch team to find the comment and verify ownership
    const team = await this.teamModel.findOne({ _id: id, companyId }).exec();
    if (!team) throw new NotFoundException(`Team #${id} not found`);

    const comment: any = (team as any).comments?.find(
      (c: any) => c._id?.toString() === commentId || c.id === commentId,
    );
    if (comment && !this.commentsService.isCommentOwner(comment, userId, email, reqUser)) {
      throw new ForbiddenException('You can only delete your own comments');
    }

    const updated = await this.teamModel
      .findOneAndUpdate(
        { _id: id, companyId },
        { $pull: { comments: { _id: commentId } } },
        { new: true },
      )
      .populate('members')
      .populate('teamLead')
      .exec();

    if (!updated) throw new NotFoundException(`Team #${id} not found`);
    return updated;
  }
}
