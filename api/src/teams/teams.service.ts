import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
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
   * given userId and/or email. Used to build access-check query conditions.
   */
  private async getEmployeeIdsForUser(userId?: string, email?: string): Promise<any[]> {
    const { Types } = require('mongoose');
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
        ? await this.employeeModel.find({ $or: employeeQuery }).exec()
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
   * Builds Mongo query criteria for teams according to the user's effective scope:
   *   - 'all' / isSystemAdmin: {} (no extra criteria)
   *   - 'own' / 'team': matches teams where user's employeeId is in members or is teamLead
   *   - 'none': null (empty set)
   */
  private async buildTeamScopeFilter(
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

    const employeeIds = await this.getEmployeeIdsForUser(userId, email);
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

  async create(createTeamDto: any): Promise<Team> {
    const newTeam = new this.teamModel(createTeamDto);
    return newTeam.save();
  }

  async findAll(
    userId?: string,
    email?: string,
    isSystemAdmin?: boolean,
    scope: ScopeType = 'all',
  ): Promise<Team[]> {
    if (scope === 'none' && !isSystemAdmin) {
      return [];
    }

    const scopeFilter = await this.buildTeamScopeFilter(userId, email, isSystemAdmin, scope);
    if (scopeFilter === null) {
      return [];
    }

    return this.teamModel
      .find(scopeFilter)
      .populate('members')
      .populate('teamLead')
      .exec();
  }

  async findOne(
    id: string,
    userId?: string,
    email?: string,
    isSystemAdmin?: boolean,
    scope: ScopeType = 'own',
  ): Promise<Team> {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException(`Team #${id} not found`);
    }
    const team = await this.teamModel.findById(id).populate('members').populate('teamLead').exec();
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

      const employeeIds = await this.getEmployeeIdsForUser(userId, email);
      const primaryEmpId = employeeIds.length > 0 ? String(employeeIds[0]) : undefined;

      const userTeams = await this.teamModel
        .find({
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
      await this.findOne(id, userId, email, isSystemAdmin, scope);
    }
    const updatedTeam = await this.teamModel.findByIdAndUpdate(
      id,
      { $set: updateTeamDto },
      { new: true },
    ).populate('members').populate('teamLead').exec();

    if (!updatedTeam) {
      throw new NotFoundException(`Team #${id} not found`);
    }

    return updatedTeam;
  }

  async remove(
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
      await this.findOne(id, userId, email, isSystemAdmin, scope);
    }
    const deletedTeam = await this.teamModel.findByIdAndDelete(id).exec();
    if (!deletedTeam) {
      throw new NotFoundException(`Team #${id} not found`);
    }
    return deletedTeam;
  }

  async getActiveTasks(
    teamId: string,
    userId?: string,
    email?: string,
    isSystemAdmin?: boolean,
    scope: ScopeType = 'all',
  ): Promise<Task[]> {
    const team = await this.findOne(teamId, userId, email, isSystemAdmin, scope);
    if (!team) {
      throw new NotFoundException(`Team #${teamId} not found`);
    }
    
    // Find all active tasks assigned to any team member
    const activeTasks = await this.taskModel.find({
      assignee: { $in: team.members },
      isTimerRunning: true
    }).populate('assignee').populate('projectId').exec();

    return activeTasks;
  }

  // ── Comment Endpoints ──

  async addComment(id: string, commentData: any, userId?: string, email?: string): Promise<Team> {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException(`Team #${id} not found`);
    }

    const team = await this.teamModel.findByIdAndUpdate(
      id,
      { $push: { comments: commentData } },
      { new: true }
    ).populate('members').populate('teamLead').exec();
    
    if (!team) throw new NotFoundException(`Team #${id} not found`);
    return team;
  }

  async updateComment(
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
    const team = await this.teamModel.findById(id).exec();
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

    const updated = await this.teamModel.findOneAndUpdate(
      { _id: id, 'comments._id': commentId },
      { $set: updateFields },
      { new: true },
    ).populate('members').populate('teamLead').exec();

    if (!updated) throw new NotFoundException(`Team #${id} or Comment #${commentId} not found`);
    return updated;
  }

  async deleteComment(
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
    const team = await this.teamModel.findById(id).exec();
    if (!team) throw new NotFoundException(`Team #${id} not found`);

    const comment: any = (team as any).comments?.find(
      (c: any) => c._id?.toString() === commentId || c.id === commentId,
    );
    if (comment && !this.commentsService.isCommentOwner(comment, userId, email, reqUser)) {
      throw new ForbiddenException('You can only delete your own comments');
    }

    const updated = await this.teamModel.findByIdAndUpdate(
      id,
      { $pull: { comments: { _id: commentId } } },
      { new: true },
    ).populate('members').populate('teamLead').exec();

    if (!updated) throw new NotFoundException(`Team #${id} not found`);
    return updated;
  }
}
