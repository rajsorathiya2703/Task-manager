import { Injectable, NotFoundException, ForbiddenException, Optional } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Project } from './schemas/project.schema';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';

import { Team } from '../teams/schemas/team.schema';
import { Employee } from '../employees/schemas/employee.schema';
import { Task } from '../tasks/schemas/task.schema';
import { AccessScopeService } from '../permissions/access-scope.service';

@Injectable()
export class ProjectsService {
  constructor(
    @InjectModel(Project.name) private projectModel: Model<Project>,
    @InjectModel(Team.name) private teamModel: Model<Team>,
    @InjectModel(Employee.name) private employeeModel: Model<Employee>,
    @InjectModel(Task.name) private taskModel: Model<Task>,
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

  async create(userId: string, createProjectDto: CreateProjectDto): Promise<Project> {
    const createdProject = new this.projectModel({
      ...createProjectDto,
      userId,
      color: createProjectDto.color || '#3b82f6',
    });
    return createdProject.save();
  }

  async findAll(
    userId: string,
    email?: string,
    isSystemAdmin?: boolean,
    scope: 'own' | 'team' | 'all' = 'own',
  ): Promise<Project[]> {
    if (isSystemAdmin || scope === 'all') {
      return this.projectModel.find().populate('teamId').sort({ createdAt: -1 }).exec();
    }

    if (this.accessScopeService) {
      const userContext = { id: userId, _id: userId, email, is_system_admin: isSystemAdmin };
      const filter = await this.accessScopeService.buildFilter('projects', userContext, scope);
      return this.projectModel.find(filter).populate('teamId').sort({ createdAt: -1 }).exec();
    }

    const employeeIds = await this.getEmployeeIdsForUser(userId, email);
    const employeeIdObjs = employeeIds.map((e) => (Types.ObjectId.isValid(e) ? new Types.ObjectId(e) : e));
    const employeeIdStrs = employeeIds.map((e) => e.toString());
    const allEmployeeIds = Array.from(new Set([...employeeIdObjs, ...employeeIdStrs]));

    const userIdObj = Types.ObjectId.isValid(userId) ? new Types.ObjectId(userId) : userId;

    // 1. Direct owner
    const orConditions: any[] = [
      { userId },
      { userId: userIdObj },
    ];

    // 2. Direct email membership on project (backward compatibility)
    if (email && typeof email === 'string' && email.trim()) {
      orConditions.push({ 'members.email': { $regex: new RegExp(`^${email.trim()}$`, 'i') } });
    }

    // 3. Teams where user/employee is member or teamLead
    if (allEmployeeIds.length > 0) {
      const teams = await this.teamModel.find(
        {
          $or: [
            { members: { $in: allEmployeeIds } },
            { teamLead: { $in: allEmployeeIds } },
          ],
        },
        { _id: 1 }
      ).exec();
      const teamIds = teams.map((t) => t._id);
      if (teamIds.length > 0) {
        orConditions.push({ teamId: { $in: teamIds } });
      }
    }

    // 4. Projects that contain tasks assigned to this employee / user
    const taskQuery: any[] = [
      { userId },
      { userId: userIdObj },
    ];
    if (allEmployeeIds.length > 0) {
      taskQuery.push({ assignee: { $in: allEmployeeIds } });
    }
    if (email && typeof email === 'string' && email.trim()) {
      taskQuery.push({ 'members.email': { $regex: new RegExp(`^${email.trim()}$`, 'i') } });
    }

    const distinctProjectIds = await this.taskModel.distinct('projectId', {
      projectId: { $exists: true, $ne: null },
      $or: taskQuery,
    }).exec();

    if (distinctProjectIds && distinctProjectIds.length > 0) {
      const validProjectIds = distinctProjectIds.filter((id) => Boolean(id));
      if (validProjectIds.length > 0) {
        orConditions.push({ _id: { $in: validProjectIds } });
      }
    }

    return this.projectModel.find({ $or: orConditions }).populate('teamId').sort({ createdAt: -1 }).exec();
  }

  async findOne(
    id: string,
    userId?: string,
    email?: string,
    isSystemAdmin?: boolean,
    scope: 'own' | 'team' | 'all' = 'own',
  ): Promise<Project | null> {
    if (!Types.ObjectId.isValid(id)) {
      return null;
    }
    const project = await this.projectModel.findById(id).populate('teamId').exec();
    if (!project) return null;

    if (isSystemAdmin || scope === 'all') {
      return project;
    }

    if (userId) {
      if (this.accessScopeService) {
        const userContext = { id: userId, _id: userId, email, is_system_admin: isSystemAdmin };
        const hasAccess = await this.accessScopeService.canAccess('projects', project, userContext, scope);
        if (!hasAccess) {
          throw new ForbiddenException('You do not have access to this project');
        }
        return project;
      }

      const employeeIds = await this.getEmployeeIdsForUser(userId, email);
      const employeeIdStrs = new Set(employeeIds.map((e) => e.toString()));

      let hasAccess =
        project.userId.toString() === userId ||
        (email && (project as any).members && (project as any).members.some((m: any) => m.email?.toLowerCase() === email.toLowerCase()));

      // Check team membership
      if (!hasAccess && project.teamId) {
        const team: any = project.teamId;
        const teamMembers: any[] = team.members || [];
        const teamLeadId = team.teamLead ? (team.teamLead._id || team.teamLead).toString() : null;

        if (teamLeadId && employeeIdStrs.has(teamLeadId)) {
          hasAccess = true;
        } else if (teamMembers.some((m: any) => employeeIdStrs.has((m._id || m).toString()))) {
          hasAccess = true;
        }
      }

      // Check if user has any assigned tasks in this project
      if (!hasAccess) {
        const taskQuery: any[] = [];
        if (employeeIds.length > 0) {
          taskQuery.push({ assignee: { $in: employeeIds } });
        }
        if (email) {
          taskQuery.push({ 'members.email': { $regex: new RegExp(`^${email}$`, 'i') } });
        }
        if (taskQuery.length > 0) {
          const hasTaskInProject = await this.taskModel.exists({
            projectId: project._id,
            $or: taskQuery,
          });
          if (hasTaskInProject) {
            hasAccess = true;
          }
        }
      }

      if (!hasAccess) {
        throw new ForbiddenException('You do not have access to this project');
      }
    }
    return project;
  }

  async update(
    id: string,
    updateProjectDto: UpdateProjectDto,
    userId?: string,
    email?: string,
    isSystemAdmin?: boolean,
    scope: 'own' | 'team' | 'all' = 'own',
  ): Promise<Project | null> {
    const project = await this.findOne(id, userId, email, isSystemAdmin, scope);
    if (!project) {
      throw new NotFoundException('Project not found');
    }

    return this.projectModel.findByIdAndUpdate(id, updateProjectDto, { new: true }).populate('teamId').exec();
  }

  async remove(
    id: string,
    userId?: string,
    email?: string,
    isSystemAdmin?: boolean,
    scope: 'own' | 'team' | 'all' = 'own',
  ): Promise<Project | null> {
    const project = await this.findOne(id, userId, email, isSystemAdmin, scope);
    if (!project) {
      throw new NotFoundException('Project not found');
    }

    if (!isSystemAdmin && userId && scope !== 'all') {
      let canDelete = project.userId.toString() === userId;
      if (!canDelete && scope === 'team' && project.teamId) {
        const team: any = project.teamId;
        const employeeIds = await this.getEmployeeIdsForUser(userId, email);
        const employeeIdStrs = new Set(employeeIds.map((e) => e.toString()));
        const teamLeadId = team.teamLead ? (team.teamLead._id || team.teamLead).toString() : null;
        if (teamLeadId && employeeIdStrs.has(teamLeadId)) {
          canDelete = true;
        }
      }
      if (!canDelete) {
        throw new ForbiddenException('Only the project owner or administrator can delete this project');
      }
    }

    return this.projectModel.findByIdAndDelete(id).exec();
  }
}
