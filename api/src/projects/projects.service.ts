import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Project } from './schemas/project.schema';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';

import { Team } from '../teams/schemas/team.schema';
import { Employee } from '../employees/schemas/employee.schema';
import { Task } from '../tasks/schemas/task.schema';
import {
  isProjectInScope,
  ProjectSubject,
  ProjectTeamContext,
  ScopeType,
} from '../access/resolvers/projects.resolver';

@Injectable()
export class ProjectsService {
  constructor(
    @InjectModel(Project.name) private projectModel: Model<Project>,
    @InjectModel(Team.name) private teamModel: Model<Team>,
    @InjectModel(Employee.name) private employeeModel: Model<Employee>,
    @InjectModel(Task.name) private taskModel: Model<Task>,
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
   * Validates that the specified team belongs to the current company.
   * Throws BadRequestException on mismatch.
   */
  private async validateTeamBelongsToCompany(
    companyId: Types.ObjectId,
    teamId?: any,
  ): Promise<void> {
    if (!teamId) {
      return;
    }
    if (!Types.ObjectId.isValid(teamId)) {
      throw new BadRequestException(`Invalid teamId: ${teamId}`);
    }
    const team = await this.teamModel
      .findOne({ _id: new Types.ObjectId(teamId), companyId })
      .select('_id')
      .exec();

    if (!team) {
      throw new BadRequestException('Team does not belong to this company');
    }
  }

  /**
   * Builds Mongo query criteria for projects according to the user's effective scope:
   *   - 'all' / isSystemAdmin: {} (no extra criteria)
   *   - 'own': matches project owner
   *   - 'team': own criteria OR project's teamId is in the user's teams
   *   - 'none': null (empty set)
   */
  private async buildProjectScopeFilter(
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

    const { Types } = require('mongoose');
    const ownConditions: any[] = [];
    if (userId) {
      if (Types.ObjectId.isValid(userId)) {
        ownConditions.push({ userId: new Types.ObjectId(userId) });
      }
      ownConditions.push({ userId: userId.toString() });
    }

    if (scope === 'own') {
      return ownConditions.length > 0 ? { $or: ownConditions } : null;
    }

    if (scope === 'team') {
      const employeeIds = await this.getEmployeeIdsForUser(companyId, userId, email);
      const userTeams = await this.teamModel
        .find({
          companyId,
          $or: [
            { members: { $in: employeeIds } },
            { teamLead: { $in: employeeIds } },
          ],
        })
        .select('_id')
        .lean()
        .exec();

      const teamIds = userTeams.map((t) => t._id);
      const teamIdConditions: any[] = [];
      if (teamIds.length > 0) {
        teamIdConditions.push({ teamId: { $in: teamIds } });
        teamIdConditions.push({ teamId: { $in: teamIds.map((id) => id.toString()) } });
      }

      const combinedConditions = [...ownConditions, ...teamIdConditions];
      return combinedConditions.length > 0 ? { $or: combinedConditions } : null;
    }

    return null;
  }

  async create(
    companyId: Types.ObjectId,
    userId: string,
    createProjectDto: CreateProjectDto,
  ): Promise<Project> {
    if (createProjectDto.teamId) {
      await this.validateTeamBelongsToCompany(companyId, createProjectDto.teamId);
    }
    const createdProject = new this.projectModel({
      ...createProjectDto,
      companyId,
      userId,
      color: createProjectDto.color || '#3b82f6',
    });
    return createdProject.save();
  }

  async findAll(
    companyId: Types.ObjectId,
    userId?: string,
    email?: string,
    isSystemAdmin?: boolean,
    scope: ScopeType = 'all',
  ): Promise<Project[]> {
    if (scope === 'none' && !isSystemAdmin) {
      return [];
    }

    const scopeFilter = await this.buildProjectScopeFilter(companyId, userId, email, isSystemAdmin, scope);
    if (scopeFilter === null) {
      return [];
    }

    return this.projectModel
      .find({ companyId, ...scopeFilter })
      .populate('teamId')
      .sort({ createdAt: -1 })
      .exec();
  }

  async findOne(
    companyId: Types.ObjectId,
    id: string,
    userId?: string,
    email?: string,
    isSystemAdmin?: boolean,
    scope: ScopeType = 'own',
  ): Promise<Project | null> {
    if (!Types.ObjectId.isValid(id)) {
      return null;
    }
    const project = await this.projectModel
      .findOne({ _id: id, companyId })
      .populate('teamId')
      .exec();
    if (!project) return null;

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

      const subject: ProjectSubject = {
        userId,
        email,
        employeeId: primaryEmpId,
        teamIds,
        leadingTeamIds,
        isSystemAdmin,
      };

      const context: ProjectTeamContext = {
        team: project.teamId as any,
      };

      const inScope = isProjectInScope(scope, project, subject, context);
      if (!inScope) {
        throw new ForbiddenException({
          statusCode: 403,
          error: 'Forbidden',
          message: `Access denied: project is out of scope (granted scope: '${scope}')`,
        });
      }
    }

    return project;
  }

  async update(
    companyId: Types.ObjectId,
    id: string,
    updateProjectDto: UpdateProjectDto,
    userId?: string,
    email?: string,
    isSystemAdmin?: boolean,
    scope: ScopeType = 'own',
  ): Promise<Project | null> {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Project not found');
    }
    if (!isSystemAdmin && scope !== 'all') {
      const existing = await this.findOne(companyId, id, userId, email, isSystemAdmin, scope);
      if (!existing) {
        throw new NotFoundException('Project not found');
      }
    }

    if (updateProjectDto.teamId) {
      await this.validateTeamBelongsToCompany(companyId, updateProjectDto.teamId);
    }

    const safeUpdateDto: any = { ...updateProjectDto };
    delete safeUpdateDto.companyId;

    const updated = await this.projectModel
      .findOneAndUpdate({ _id: id, companyId }, safeUpdateDto, { new: true })
      .populate('teamId')
      .exec();
    if (!updated) {
      throw new NotFoundException('Project not found');
    }
    return updated;
  }

  async remove(
    companyId: Types.ObjectId,
    id: string,
    userId?: string,
    email?: string,
    isSystemAdmin?: boolean,
    scope: ScopeType = 'own',
  ): Promise<Project | null> {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Project not found');
    }
    if (!isSystemAdmin && scope !== 'all') {
      const existing = await this.findOne(companyId, id, userId, email, isSystemAdmin, scope);
      if (!existing) {
        throw new NotFoundException('Project not found');
      }
    }

    // Check whether tasks in this company reference the project
    // Note: Task gets companyId in MC-21; cast to any for query compatibility
    const hasTasks = await this.taskModel.exists({
      projectId: id,
      companyId,
    } as any);

    if (hasTasks) {
      throw new BadRequestException('Cannot delete project referenced by existing tasks in this company');
    }

    const deleted = await this.projectModel
      .findOneAndDelete({ _id: id, companyId })
      .exec();
    if (!deleted) {
      throw new NotFoundException('Project not found');
    }
    return deleted;
  }
}
