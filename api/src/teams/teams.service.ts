import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Team } from './schemas/team.schema';
import { Task } from '../tasks/schemas/task.schema';
import { Employee } from '../employees/schemas/employee.schema';
import { CommentsService } from '../comments/comments.service';

@Injectable()
export class TeamsService {
  constructor(
    @InjectModel(Team.name) private teamModel: Model<Team>,
    @InjectModel(Task.name) private taskModel: Model<Task>,
    @InjectModel(Employee.name) private employeeModel: Model<Employee>,
    private commentsService: CommentsService,
  ) {}

  async create(createTeamDto: any): Promise<Team> {
    const newTeam = new this.teamModel(createTeamDto);
    return newTeam.save();
  }

  async findAll(
    userId?: string,
    email?: string,
    isSystemAdmin?: boolean,
    scope: 'own' | 'team' | 'all' = 'all',
  ): Promise<Team[]> {
    return this.teamModel
      .find()
      .populate('members')
      .populate('teamLead')
      .exec();
  }

  async findOne(
    id: string,
    userId?: string,
    email?: string,
    isSystemAdmin?: boolean,
    scope: 'own' | 'team' | 'all' = 'all',
  ): Promise<Team> {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException(`Team #${id} not found`);
    }
    const team = await this.teamModel.findById(id).populate('members').populate('teamLead').exec();
    if (!team) {
      throw new NotFoundException(`Team #${id} not found`);
    }
    return team;
  }

  async update(
    id: string,
    updateTeamDto: any,
    userId?: string,
    email?: string,
    isSystemAdmin?: boolean,
    scope: 'own' | 'team' | 'all' = 'all',
  ): Promise<Team> {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException(`Team #${id} not found`);
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
    scope: 'own' | 'team' | 'all' = 'all',
  ): Promise<any> {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException(`Team #${id} not found`);
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
    scope: 'own' | 'team' | 'all' = 'all',
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
