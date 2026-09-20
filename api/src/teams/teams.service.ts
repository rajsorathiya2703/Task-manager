import { Injectable, NotFoundException, ForbiddenException, Optional } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Team } from './schemas/team.schema';
import { Task } from '../tasks/schemas/task.schema';
import { Employee } from '../employees/schemas/employee.schema';
import { CommentsService } from '../comments/comments.service';
import { AccessScopeService } from '../permissions/access-scope.service';

@Injectable()
export class TeamsService {
  constructor(
    @InjectModel(Team.name) private teamModel: Model<Team>,
    @InjectModel(Task.name) private taskModel: Model<Task>,
    @InjectModel(Employee.name) private employeeModel: Model<Employee>,
    private commentsService: CommentsService,
    @Optional() private readonly accessScopeService?: AccessScopeService,
  ) {}

  private async getEmployeeIdsForUser(userId?: string, email?: string): Promise<Types.ObjectId[]> {
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

  async isUserInTeam(team: any, userId?: string, email?: string): Promise<boolean> {
    if (!team) return false;

    const employeeIds = await this.getEmployeeIdsForUser(userId, email);
    const candidateIdStrs = new Set<string>();

    employeeIds.forEach((id) => candidateIdStrs.add(id.toString()));
    if (userId) {
      candidateIdStrs.add(userId.toString());
    }

    const cleanEmail = email && typeof email === 'string' ? email.trim().toLowerCase() : null;

    // Check teamLead
    if (team.teamLead) {
      const leadObj = team.teamLead;
      const leadIdStr = (leadObj._id || leadObj).toString();
      if (candidateIdStrs.has(leadIdStr)) return true;
      if (cleanEmail && leadObj.email && leadObj.email.toLowerCase() === cleanEmail) return true;
    }

    // Check members
    if (Array.isArray(team.members)) {
      for (const m of team.members) {
        if (!m) continue;
        const memberIdStr = (m._id || m).toString();
        if (candidateIdStrs.has(memberIdStr)) return true;
        if (cleanEmail && m.email && m.email.toLowerCase() === cleanEmail) return true;
      }
    }

    return false;
  }

  async create(createTeamDto: any): Promise<Team> {
    const newTeam = new this.teamModel(createTeamDto);
    return newTeam.save();
  }

  async findAll(
    userId?: string,
    email?: string,
    isSystemAdmin?: boolean,
    scope: 'own' | 'team' | 'all' = 'own',
  ): Promise<Team[]> {
    if (isSystemAdmin || scope === 'all') {
      return this.teamModel
        .find()
        .populate('members')
        .populate('teamLead')
        .exec();
    }

    if (this.accessScopeService) {
      const userContext = { id: userId, _id: userId, email, is_system_admin: isSystemAdmin };
      const filter = await this.accessScopeService.buildFilter('teams', userContext, scope);
      return this.teamModel
        .find(filter)
        .populate('members')
        .populate('teamLead')
        .exec();
    }

    if (!userId && !email) {
      return [];
    }

    const employeeIds = await this.getEmployeeIdsForUser(userId, email);
    const candidateIds: any[] = [];

    for (const eid of employeeIds) {
      if (Types.ObjectId.isValid(eid)) {
        candidateIds.push(new Types.ObjectId(eid));
      }
      candidateIds.push(eid.toString());
    }
    if (userId) {
      if (Types.ObjectId.isValid(userId)) {
        candidateIds.push(new Types.ObjectId(userId));
      }
      candidateIds.push(userId.toString());
    }

    if (candidateIds.length === 0) {
      return [];
    }

    return this.teamModel
      .find({
        $or: [
          { members: { $in: candidateIds } },
          { teamLead: { $in: candidateIds } },
        ],
      })
      .populate('members')
      .populate('teamLead')
      .exec();
  }

  async findOne(
    id: string,
    userId?: string,
    email?: string,
    isSystemAdmin?: boolean,
    scope: 'own' | 'team' | 'all' = 'own',
  ): Promise<Team> {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException(`Team #${id} not found`);
    }
    const team = await this.teamModel.findById(id).populate('members').populate('teamLead').exec();
    if (!team) {
      throw new NotFoundException(`Team #${id} not found`);
    }

    if (isSystemAdmin || scope === 'all') {
      return team;
    }

    if (userId) {
      if (this.accessScopeService) {
        const userContext = { id: userId, _id: userId, email, is_system_admin: isSystemAdmin };
        const hasAccess = await this.accessScopeService.canAccess('teams', team, userContext, scope);
        if (!hasAccess) {
          throw new ForbiddenException('Access Denied: You do not have permission to view this team.');
        }
        return team;
      }

      const hasAccess = await this.isUserInTeam(team, userId, email);
      if (!hasAccess) {
        throw new ForbiddenException('Access Denied: You are not a member of this team.');
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
    scope: 'own' | 'team' | 'all' = 'own',
  ): Promise<Team> {
    const existingTeam = await this.findOne(id, userId, email, isSystemAdmin, scope);
    if (!existingTeam) {
      throw new NotFoundException(`Team #${id} not found`);
    }

    const updatedTeam = await this.teamModel.findByIdAndUpdate(
      id,
      { $set: updateTeamDto },
      { new: true },
    ).populate('members').populate('teamLead').exec();

    return updatedTeam!;
  }

  async remove(
    id: string,
    userId?: string,
    email?: string,
    isSystemAdmin?: boolean,
    scope: 'own' | 'team' | 'all' = 'own',
  ): Promise<any> {
    const existingTeam = await this.findOne(id, userId, email, isSystemAdmin, scope);
    if (!existingTeam) {
      throw new NotFoundException(`Team #${id} not found`);
    }

    if (!isSystemAdmin && userId && scope !== 'all') {
      const teamLeadStr = (existingTeam.teamLead?._id || existingTeam.teamLead)?.toString();
      const employeeIds = await this.getEmployeeIdsForUser(userId, email);
      const employeeIdStrs = new Set(employeeIds.map((e) => e.toString()));
      if (userId) employeeIdStrs.add(userId.toString());

      if (!teamLeadStr || !employeeIdStrs.has(teamLeadStr)) {
        throw new ForbiddenException('Only the team lead or administrator can delete this team');
      }
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
    scope: 'own' | 'team' | 'all' = 'own',
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

  async addComment(id: string, commentData: any, userId?: string, email?: string): Promise<Team> {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException(`Team #${id} not found`);
    }

    const existingTeam = await this.teamModel.findById(id).populate('members').populate('teamLead').exec();
    if (!existingTeam) throw new NotFoundException(`Team #${id} not found`);

    const hasAccess = await this.isUserInTeam(existingTeam, userId, email);
    if (!hasAccess) {
      throw new ForbiddenException('Only team members can comment in this team');
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
