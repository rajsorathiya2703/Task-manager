import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
  Optional,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Task } from './schemas/task.schema';
import { Project } from '../projects/schemas/project.schema';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';

import { EmailService } from './email.service';
import { CommentsService } from '../comments/comments.service';
import { Company } from '../companies/schemas/company.schema';

import { Team } from '../teams/schemas/team.schema';
import { Employee } from '../employees/schemas/employee.schema';
import {
  isTaskInScope,
  TaskSubject,
  TaskProjectContext,
  ScopeType,
} from '../access/resolvers/tasks.resolver';

@Injectable()
export class TasksService {
  constructor(
    @InjectModel(Task.name) private taskModel: Model<Task>,
    @InjectModel(Project.name) private projectModel: Model<Project>,
    @InjectModel(Team.name) private teamModel: Model<Team>,
    @InjectModel(Employee.name) private employeeModel: Model<Employee>,
    @Optional() @InjectModel(Company.name) private companyModel: Model<Company>,
    private emailService: EmailService,
    private commentsService: CommentsService,
  ) {}

  private async getCompanySlug(companyId?: Types.ObjectId | string): Promise<string | undefined> {
    if (!companyId || !this.companyModel) return undefined;
    try {
      const company = await this.companyModel.findById(companyId).select('slug').lean().exec();
      return company?.slug;
    } catch {
      return undefined;
    }
  }

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

    const ids: any[] = [];
    for (const e of employees) {
      if (e._id) {
        if (Types.ObjectId.isValid(e._id)) {
          ids.push(new Types.ObjectId(e._id));
        }
        ids.push(e._id.toString());
      }
      if (e.userId) {
        if (Types.ObjectId.isValid(e.userId)) {
          ids.push(new Types.ObjectId(e.userId));
        }
        ids.push(e.userId.toString());
      }
      // Self-heal: link userId on employee record if missing
      if (userId && !e.userId && Types.ObjectId.isValid(userId)) {
        this.employeeModel.updateOne(
          { _id: e._id, companyId },
          { $set: { userId: new Types.ObjectId(userId) } },
        ).exec().catch(() => {});
      }
    }

    if (userId) {
      if (Types.ObjectId.isValid(userId)) {
        ids.push(new Types.ObjectId(userId));
      }
      ids.push(userId.toString());
    }
    return ids;
  }

  /**
   * Verifies that a file URL belongs to a resource or comment attachment of a Task or Team within this company.
   */
  async verifyFileBelongsToCompany(companyId: Types.ObjectId, url: string): Promise<boolean> {
    if (!url) return false;
    const inTask = await this.taskModel.exists({
      companyId,
      $or: [{ 'resources.url': url }, { 'comments.attachments.url': url }],
    });
    if (inTask) return true;

    const inTeam = await this.teamModel.exists({
      companyId,
      'comments.attachments.url': url,
    });
    return !!inTeam;
  }

  /**
   * Validates that project, assignee, and assignedBy (if provided) belong to the company.
   */
  private async validateTaskRelations(
    companyId: Types.ObjectId,
    projectId?: any,
    assignee?: any,
    assignedBy?: any,
  ): Promise<void> {
    if (projectId) {
      if (!Types.ObjectId.isValid(projectId)) {
        throw new BadRequestException('Project not found');
      }
      const project = await this.projectModel.findOne({ _id: projectId, companyId }).exec();
      if (!project) {
        throw new BadRequestException('Project not found');
      }
    }

    if (assignee) {
      const assigneeId = (assignee as any)?._id || assignee;
      if (!Types.ObjectId.isValid(assigneeId)) {
        throw new BadRequestException('Assignee not found in this company');
      }
      const employee = await this.employeeModel.findOne({ _id: assigneeId, companyId }).exec();
      if (!employee) {
        throw new BadRequestException('Assignee not found in this company');
      }
    }

    if (assignedBy) {
      const assignedById = (assignedBy as any)?._id || assignedBy;
      if (!Types.ObjectId.isValid(assignedById)) {
        throw new BadRequestException('AssignedBy not found in this company');
      }
      const employee = await this.employeeModel.findOne({ _id: assignedById, companyId }).exec();
      if (!employee) {
        throw new BadRequestException('AssignedBy not found in this company');
      }
    }
  }

  /**
   * Builds Mongo query criteria according to the user's effective scope:
   *   - 'all' / isSystemAdmin: {} (no extra criteria)
   *   - 'own': matches task owner, assignee, or collaborator
   *   - 'team': own criteria OR project belongs to one of user's teams
   *   - 'none': null (empty set)
   */
  private async buildTaskScopeFilter(
    companyId: Types.ObjectId,
    userId?: string,
    email?: string,
    isSystemAdmin?: boolean,
    scope: ScopeType = 'own',
  ): Promise<any> {
    if (isSystemAdmin || scope === 'all') {
      return {};
    }
    if (scope === 'none') {
      return null;
    }

    const employeeIds = await this.getEmployeeIdsForUser(companyId, userId, email);

    const ownConditions: any[] = [];
    if (userId) {
      if (Types.ObjectId.isValid(userId)) {
        ownConditions.push({ userId: new Types.ObjectId(userId) });
      }
      ownConditions.push({ userId: userId.toString() });
    }
    if (employeeIds.length > 0) {
      ownConditions.push({ assignee: { $in: employeeIds } });
      ownConditions.push({ assigneeId: { $in: employeeIds } });
      ownConditions.push({ assignedBy: { $in: employeeIds } });
    }
    if (email && typeof email === 'string' && email.trim()) {
      const emailRegex = new RegExp(`^${email.trim()}$`, 'i');
      ownConditions.push({ assigneeEmail: { $regex: emailRegex } });
      ownConditions.push({ 'members.email': { $regex: emailRegex } });
    }

    if (scope === 'own') {
      return ownConditions.length > 0 ? { $or: ownConditions } : null;
    }

    if (scope === 'team') {
      const teamConditions: any[] = [...ownConditions];

      // Find teams where user's employees are member or teamLead within company
      const teamQuery: any[] = [];
      if (employeeIds.length > 0) {
        teamQuery.push({ members: { $in: employeeIds } });
        teamQuery.push({ teamLead: { $in: employeeIds } });
      }
      if (userId) {
        if (Types.ObjectId.isValid(userId)) {
          teamQuery.push({ members: new Types.ObjectId(userId) });
          teamQuery.push({ teamLead: new Types.ObjectId(userId) });
        }
        teamQuery.push({ members: userId.toString() });
        teamQuery.push({ teamLead: userId.toString() });
      }

      if (teamQuery.length > 0) {
        const teams = await this.teamModel
          .find({ companyId, $or: teamQuery })
          .select('_id')
          .lean()
          .exec();
        const teamIds = teams.map((t) => t._id);

        if (teamIds.length > 0) {
          const projects = await this.projectModel
            .find({ companyId, teamId: { $in: teamIds } })
            .select('_id')
            .lean()
            .exec();
          const projectIds = projects.map((p) => p._id);

          if (projectIds.length > 0) {
            teamConditions.push({ projectId: { $in: projectIds } });
          }
          teamConditions.push({ projectTeamId: { $in: teamIds } });
          teamConditions.push({ teamId: { $in: teamIds } });
        }
      }

      return teamConditions.length > 0 ? { $or: teamConditions } : null;
    }

    return null;
  }

  async hasTaskAccess(
    companyId: Types.ObjectId,
    task: Task,
    userId?: string,
    email?: string,
    isSystemAdmin?: boolean,
    scope: ScopeType = 'all',
  ): Promise<boolean> {
    if (isSystemAdmin || scope === 'all') return true;
    if (scope === 'none') return false;
    try {
      const found = await this.findOne(companyId, task._id.toString(), userId, email, isSystemAdmin, scope);
      return !!found;
    } catch {
      return false;
    }
  }

  async create(
    companyId: Types.ObjectId,
    userId: string,
    createTaskDto: CreateTaskDto,
    email?: string,
    _isSystemAdmin?: boolean,
  ): Promise<Task> {
    await this.validateTaskRelations(
      companyId,
      createTaskDto.projectId,
      createTaskDto.assignee,
      createTaskDto.assignedBy,
    );

    if (createTaskDto.assignee && createTaskDto.projectId) {
      const assigneeId = (createTaskDto.assignee as any)?._id?.toString() || createTaskDto.assignee.toString();
      const project = await this.projectModel.findOne({ _id: createTaskDto.projectId, companyId }).exec();
      if (project && project.teamId) {
        const team = await this.teamModel.findOne({ _id: project.teamId, companyId }).exec();
        if (!team || !team.members.some(memberId => memberId.toString() === assigneeId)) {
          throw new BadRequestException("Assignee must be a member of the project's assigned team");
        }
      }
    }

    const creatorEmployeeIds = await this.getEmployeeIdsForUser(companyId, userId, email);
    const creatorEmployeeId = creatorEmployeeIds.length > 0 ? creatorEmployeeIds[0] : null;

    const taskData: any = { ...createTaskDto, companyId, userId };
    if (creatorEmployeeId && !taskData.assignedBy) {
      taskData.assignedBy = creatorEmployeeId;
    }
    if (createTaskDto.status === 'Done') {
      taskData.completedAt = new Date();
    }
    const createdTask = new this.taskModel(taskData);
    const savedTask = await createdTask.save();

    if (savedTask.assignee) {
      try {
        const targetAssigneeId = (savedTask.assignee as any)?._id || savedTask.assignee;
        let employee = await this.employeeModel.findOne({ _id: targetAssigneeId, companyId }).exec();
        if (!employee) {
          employee = await this.employeeModel.findOne({ companyId, $or: [{ userId: targetAssigneeId }, { _id: targetAssigneeId }] }).exec();
        }
        if (employee && employee.email) {
          if (!employee.userId) {
            try {
              const cleanEmpEmail = employee.email.trim();
              const existingUser = await this.employeeModel.db.collection('users').findOne({
                email: { $regex: new RegExp(`^${cleanEmpEmail}$`, 'i') },
              });
              if (existingUser) {
                await this.employeeModel.updateOne(
                  { _id: employee._id, companyId },
                  { $set: { userId: existingUser._id } },
                );
                await this.employeeModel.db.collection('users').updateOne(
                  { _id: existingUser._id },
                  { $set: { is_employee: true } },
                );
                await this.employeeModel.db.collection('roles').updateOne(
                  { slug: 'employee' },
                  { $addToSet: { members: existingUser._id } },
                );
              }
            } catch (linkErr) {
              // ignore
            }
          }

          const employeeName = employee.fullName
            ? `${employee.fullName.firstName} ${employee.fullName.lastName || ''}`.trim()
            : (employee.email.split('@')[0] || 'Team Member');
          const assignerName = email || 'Your Team Lead';
          let projectName: string | undefined;
          if (savedTask.projectId) {
            const project = await this.projectModel.findOne({ _id: savedTask.projectId, companyId }).exec();
            if (project) projectName = project.name;
          }
          const companySlug = await this.getCompanySlug(companyId);
          await this.emailService.sendTaskAssignmentEmail(
            employee.email,
            savedTask.title,
            assignerName,
            employeeName,
            savedTask._id ? savedTask._id.toString() : '',
            projectName,
            companySlug,
          );
        }
      } catch (mailErr) {
        console.error('Failed to send task assignment email on create:', mailErr);
      }
    }

    return savedTask;
  }

  async findAll(
    companyId: Types.ObjectId,
    userId?: string,
    email?: string,
    projectId?: string,
    isSystemAdmin?: boolean,
    scope: ScopeType = 'all',
  ): Promise<Task[]> {
    if (scope === 'none' && !isSystemAdmin) {
      return [];
    }

    const scopeFilter = await this.buildTaskScopeFilter(companyId, userId, email, isSystemAdmin, scope);
    if (scopeFilter === null) {
      return [];
    }

    const queryParts: any[] = [{ companyId }];
    if (Object.keys(scopeFilter).length > 0) {
      queryParts.push(scopeFilter);
    }

    if (projectId) {
      const projIdObj = Types.ObjectId.isValid(projectId) ? new Types.ObjectId(projectId) : projectId;
      queryParts.push({
        $or: [{ projectId: projIdObj }, { projectId: projectId.toString() }],
      });
    }

    const finalQuery =
      queryParts.length === 1
        ? queryParts[0]
        : { $and: queryParts };

    return this.taskModel
      .find(finalQuery)
      .populate('projectId', 'name color')
      .populate('assignee')
      .populate('assignedBy')
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
  ): Promise<any | null> {
    if (!Types.ObjectId.isValid(id)) {
      return null;
    }
    const task = await this.taskModel
      .findOne({ _id: id, companyId })
      .populate('assignee')
      .populate('assignedBy')
      .exec();
    if (!task) return null;

    // ─── PBAC Record-Level Scope Check (§6.2, §6.3) ─────────────────────────
    if (!isSystemAdmin && scope !== 'all') {
      if (scope === 'none') {
        throw new ForbiddenException({
          statusCode: 403,
          error: 'Forbidden',
          message: 'Access denied: scope is none for this action',
        });
      }

      // Resolve relational context within company
      let project: any = null;
      let team: any = null;
      if (task.projectId) {
        const projId = (task.projectId as any)?._id || task.projectId;
        project = await this.projectModel.findOne({ _id: projId, companyId }).lean().exec();
        if (project?.teamId) {
          team = await this.teamModel.findOne({ _id: project.teamId, companyId }).lean().exec();
        }
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

      const subject: TaskSubject = {
        userId,
        email,
        employeeId: primaryEmpId,
        teamIds,
        leadingTeamIds,
        isSystemAdmin,
      };

      const context: TaskProjectContext = {
        project,
        team,
        teamId: project?.teamId,
      };

      const inScope = isTaskInScope(scope, task, subject, context);
      if (!inScope) {
        throw new ForbiddenException({
          statusCode: 403,
          error: 'Forbidden',
          message: `Access denied: task is out of scope (granted scope: '${scope}')`,
        });
      }
    }
    
    if (task.isTimerRunning && task.timerStartedAt && task.estimatedHours && task.estimatedHours > 0) {
      const alreadyLoggedSeconds = (task.timeEntries || []).reduce((acc: number, entry: any) => acc + (entry.durationSeconds || 0), 0);
      const allocatedSeconds = task.estimatedHours * 3600;
      const elapsedSeconds = (Date.now() - new Date(task.timerStartedAt).getTime()) / 1000;
      
      if (alreadyLoggedSeconds + elapsedSeconds >= allocatedSeconds) {
        const user = task.timerUser || { name: 'User' };
        await this.stopTimer(id, user, userId, email, companyId);
        const autoStoppedTask = await this.taskModel
          .findOne({ _id: id, companyId })
          .populate('assignee')
          .populate('assignedBy')
          .exec();
        if (autoStoppedTask) {
          this.sanitizeTaskEntries(autoStoppedTask);
          await this.taskModel.updateOne(
            { _id: id, companyId },
            { $set: { timeEntries: autoStoppedTask.timeEntries } }
          ).exec();
          const updatedObj: any = autoStoppedTask.toObject ? autoStoppedTask.toObject() : autoStoppedTask;
          if (!updatedObj.assignedBy && autoStoppedTask.userId) {
            const creatorEmployee = await this.employeeModel.findOne({ userId: autoStoppedTask.userId, companyId }).exec();
            if (creatorEmployee) {
              updatedObj.assignedBy = creatorEmployee.toObject ? creatorEmployee.toObject() : creatorEmployee;
            }
          }
          return {
            ...updatedObj,
            isOwner: Boolean(isSystemAdmin || (userId && autoStoppedTask.userId?.toString() === userId)),
          };
        }
      }
    }

    if (this.sanitizeTaskEntries(task)) {
      await this.taskModel.updateOne(
        { _id: id, companyId },
        { $set: { timeEntries: task.timeEntries } }
      ).exec();
    }

    const taskObj: any = task.toObject ? task.toObject() : { ...task };

    if (!taskObj.assignedBy && task.userId) {
      const creatorEmployee = await this.employeeModel.findOne({ userId: task.userId, companyId }).exec();
      if (creatorEmployee) {
        taskObj.assignedBy = creatorEmployee.toObject ? creatorEmployee.toObject() : creatorEmployee;
      } else {
        taskObj.assignedBy = {
          _id: task.userId,
          name: 'Task Owner',
          fullName: { firstName: 'Task Owner', lastName: '' },
          email: ''
        };
      }
    }

    return {
      ...taskObj,
      isOwner: Boolean(isSystemAdmin || (userId && task.userId?.toString() === userId)),
    };
  }

  private sanitizeTaskEntries(task: any): boolean {
    if (!task || !task.estimatedHours || task.estimatedHours <= 0 || !task.timeEntries || task.timeEntries.length === 0) {
      return false;
    }
    const maxAllocatedSec = task.estimatedHours * 3600;
    let accumulatedSec = 0;
    let modified = false;

    for (let i = 0; i < task.timeEntries.length; i++) {
      const entry = task.timeEntries[i];
      const remainingSec = Math.max(0, maxAllocatedSec - accumulatedSec);
      const originalDuration = entry.durationSeconds || 0;
      const newDuration = Math.min(originalDuration, remainingSec);
      
      if (newDuration !== originalDuration) {
        entry.durationSeconds = newDuration;
        if (entry.startTime) {
          entry.stopTime = new Date(new Date(entry.startTime).getTime() + newDuration * 1000);
        }
        modified = true;
      }
      accumulatedSec += newDuration;
    }

    return modified;
  }

  async update(
    companyId: Types.ObjectId,
    id: string,
    updateTaskDto: UpdateTaskDto,
    userId?: string,
    email?: string,
    user?: { name: string; avatarUrl?: string; email?: string },
    isSystemAdmin?: boolean,
    scope: ScopeType = 'own',
  ): Promise<Task | null> {
    let existingTask: any = null;
    if (userId) {
      existingTask = await this.findOne(companyId, id, userId, email, isSystemAdmin, scope);
    } else {
      existingTask = await this.taskModel.findOne({ _id: id, companyId }).exec();
    }
    if (!existingTask) return null;

    await this.validateTaskRelations(
      companyId,
      updateTaskDto.projectId,
      updateTaskDto.assignee,
      updateTaskDto.assignedBy,
    );

    const isOwner = Boolean(isSystemAdmin || (userId && existingTask.userId?.toString() === userId));
    const isModifyingStartDate = updateTaskDto.startDate !== undefined && updateTaskDto.startDate !== existingTask.startDate;
    const isModifyingDueDate = updateTaskDto.dueDate !== undefined && updateTaskDto.dueDate !== existingTask.dueDate;

    const newUpdates: any[] = [];
    const userInfo = user || { name: 'User' };

    if (updateTaskDto.status !== undefined && updateTaskDto.status !== existingTask.status) {
      newUpdates.push({
        user: userInfo,
        type: 'status',
        message: `changed status from ${existingTask.status || 'To Do'} to ${updateTaskDto.status}`,
        timestamp: new Date(),
      });
    }

    if (updateTaskDto.priority !== undefined && updateTaskDto.priority !== existingTask.priority) {
      newUpdates.push({
        user: userInfo,
        type: 'priority',
        message: `changed priority from ${existingTask.priority || 'No Priority'} to ${updateTaskDto.priority}`,
        timestamp: new Date(),
      });
    }

    if (updateTaskDto.title !== undefined && updateTaskDto.title !== existingTask.title) {
      newUpdates.push({
        user: userInfo,
        type: 'title',
        message: `changed title to "${updateTaskDto.title}"`,
        timestamp: new Date(),
      });
    }

    if (updateTaskDto.description !== undefined && updateTaskDto.description !== existingTask.description) {
      newUpdates.push({
        user: userInfo,
        type: 'description',
        message: `updated description`,
        timestamp: new Date(),
      });
    }

    if (isModifyingStartDate || isModifyingDueDate) {
      const start = updateTaskDto.startDate !== undefined ? updateTaskDto.startDate : existingTask.startDate;
      const due = updateTaskDto.dueDate !== undefined ? updateTaskDto.dueDate : existingTask.dueDate;
      let dateMsg = '';
      try {
        if (start && due && start !== due) {
          const sFormatted = new Date(start).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          const dFormatted = new Date(due).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
          dateMsg = `changed dates to ${sFormatted} - ${dFormatted}`;
        } else if (due || start) {
          const targetDate = due || start;
          const formatted = new Date(targetDate!).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
          dateMsg = `changed date to ${formatted}`;
        } else {
          dateMsg = `removed dates`;
        }
      } catch {
        dateMsg = `updated dates`;
      }
      newUpdates.push({
        user: userInfo,
        type: 'dueDate',
        message: dateMsg,
        timestamp: new Date(),
      });
    }

    const sanitizedDto: any = { ...updateTaskDto };
    delete sanitizedDto.companyId;

    if (updateTaskDto.status !== undefined) {
      if (updateTaskDto.status === 'Done') {
        sanitizedDto.completedAt = new Date();
      } else if (existingTask.status === 'Done') {
        sanitizedDto.completedAt = null;
      }
    }

    if (sanitizedDto.assignee !== undefined) {
      if (!sanitizedDto.assignee) {
        sanitizedDto.assignee = null;
      } else if (typeof sanitizedDto.assignee === 'object') {
        sanitizedDto.assignee = sanitizedDto.assignee._id || sanitizedDto.assignee.id || null;
      }
    }

    if (sanitizedDto.assignee !== undefined) {
      const assigneeId = sanitizedDto.assignee ? sanitizedDto.assignee.toString() : null;
      const targetProjectId = sanitizedDto.projectId !== undefined ? sanitizedDto.projectId : existingTask.projectId;
      if (assigneeId && targetProjectId) {
        const project = await this.projectModel.findOne({ _id: targetProjectId, companyId }).exec();
        if (project && project.teamId) {
          const team = await this.teamModel.findOne({ _id: project.teamId, companyId }).exec();
          if (!team || !team.members.some(memberId => memberId.toString() === assigneeId)) {
            throw new BadRequestException("Assignee must be a member of the project's assigned team");
          }
        }
      }

      const oldAssigneeId = existingTask.assignee?._id?.toString() || existingTask.assignee?.toString();
      const newAssigneeId = assigneeId;
      if (oldAssigneeId !== newAssigneeId) {
        let employeeName = 'employee';
        if (newAssigneeId) {
          try {
            const employee = await this.employeeModel.findOne({ _id: newAssigneeId, companyId }).exec();
            if (employee && employee.fullName) {
              employeeName = `${employee.fullName.firstName} ${employee.fullName.lastName || ''}`.trim();
            } else if (employee && employee.email) {
              employeeName = employee.email.split('@')[0];
            }

            if (employee && employee.email && !employee.userId) {
              const cleanEmpEmail = employee.email.trim();
              const existingUser = await this.employeeModel.db.collection('users').findOne({
                email: { $regex: new RegExp(`^${cleanEmpEmail}$`, 'i') },
              });
              if (existingUser) {
                await this.employeeModel.updateOne(
                  { _id: employee._id, companyId },
                  { $set: { userId: existingUser._id } },
                );
                await this.employeeModel.db.collection('users').updateOne(
                  { _id: existingUser._id },
                  { $set: { is_employee: true } },
                );
                await this.employeeModel.db.collection('roles').updateOne(
                  { slug: 'employee' },
                  { $addToSet: { members: existingUser._id } },
                );
              }
            }
          } catch (e) {
            console.error('Failed to find assignee employee info:', e);
          }
        }

        const assignerIdStr = existingTask.assignedBy?._id?.toString() || existingTask.assignedBy?.toString();
        const isAssignBack = assignerIdStr && newAssigneeId && assignerIdStr === newAssigneeId;

        if (!sanitizedDto.assignedBy && userId && !isAssignBack) {
          const userEmployeeIds = await this.getEmployeeIdsForUser(companyId, userId, email);
          if (userEmployeeIds.length > 0) {
            sanitizedDto.assignedBy = userEmployeeIds[0];
          }
        }

        const msg = isAssignBack
          ? `assigned task back to ${employeeName}`
          : (newAssigneeId ? `assigned task to ${employeeName}` : `unassigned task`);

        newUpdates.push({
          user: userInfo,
          type: 'assignee',
          message: msg,
          timestamp: new Date(),
        });

        if (newAssigneeId) {
          try {
            const employee = await this.employeeModel.findOne({ _id: newAssigneeId, companyId }).exec();
            if (employee && employee.email) {
              const empName = employee.fullName
                ? `${employee.fullName.firstName} ${employee.fullName.lastName || ''}`.trim()
                : (employee.email.split('@')[0] || 'Team Member');
              const assignerName = userInfo.name || email || 'Your Team Lead';
              const taskTitle = updateTaskDto.title || existingTask.title || 'Task';
              let projectName: string | undefined;
              if (existingTask.projectId) {
                const project = await this.projectModel.findOne({ _id: existingTask.projectId, companyId }).exec();
                if (project) projectName = project.name;
              }
              const companySlug = await this.getCompanySlug(companyId);
              this.emailService.sendTaskAssignmentEmail(
                employee.email,
                taskTitle,
                assignerName,
                empName,
                id,
                projectName,
                companySlug,
              );
            }
          } catch (mailErr) {
            console.error('Failed to send task assignment email to employee:', mailErr);
          }
        }
      }
    }

    if (updateTaskDto.tags !== undefined) {
      const oldTags = (existingTask.tags || []).join(',');
      const newTags = (updateTaskDto.tags || []).join(',');
      if (oldTags !== newTags) {
        newUpdates.push({
          user: userInfo,
          type: 'tags',
          message: `updated labels/tags`,
          timestamp: new Date(),
        });
      }
    }

    const updateAssigneeId = sanitizedDto.assignee !== undefined ? sanitizedDto.assignee : (existingTask.assignee?._id || existingTask.assignee);
    const updateOps: any = { $set: sanitizedDto };
    if (newUpdates.length > 0) {
      const updatesWithAssignee = newUpdates.map((u) => ({
        ...u,
        assigneeId: updateAssigneeId || undefined,
      }));
      updateOps.$push = { updates: { $each: updatesWithAssignee } };
    }

    const updatedTask = await this.taskModel
      .findOneAndUpdate({ _id: id, companyId }, updateOps, { new: true })
      .populate('assignee')
      .populate('assignedBy')
      .exec();
    if (!updatedTask) return null;
    const taskObj: any = updatedTask.toObject ? updatedTask.toObject() : updatedTask;
    if (!taskObj.assignedBy && updatedTask.userId) {
      const creatorEmployee = await this.employeeModel.findOne({ userId: updatedTask.userId, companyId }).exec();
      if (creatorEmployee) {
        taskObj.assignedBy = creatorEmployee.toObject ? creatorEmployee.toObject() : creatorEmployee;
      }
    }
    return {
      ...taskObj,
      isOwner: Boolean(isSystemAdmin || (userId && updatedTask.userId?.toString() === userId)),
    } as any;
  }

  async remove(
    companyId: Types.ObjectId,
    id: string,
    userId?: string,
    email?: string,
    isSystemAdmin?: boolean,
    scope: ScopeType = 'own',
  ): Promise<Task | null> {
    if (!isSystemAdmin && scope !== 'all') {
      await this.findOne(companyId, id, userId, email, isSystemAdmin, scope);
    }
    return this.taskModel.findOneAndDelete({ _id: id, companyId }).exec();
  }

  async duplicate(companyId: Types.ObjectId, id: string, userId: string, email?: string): Promise<Task> {
    const task = await this.findOne(companyId, id, userId, email);
    if (!task) {
      throw new NotFoundException('Task not found');
    }

    // Build a clean copy: include only the fields that make sense for a duplicate.
    // Omit: _id, __v, id, createdAt, updatedAt, isTimerRunning, timerStartedAt,
    //        timerUser, timeEntries, comments, updates, companyId.
    const {
      _id, __v, id: _ignoredId, createdAt, updatedAt,
      isTimerRunning, timerStartedAt, timerUser,
      timeEntries, comments, updates,
      companyId: _ignoredCompanyId,
      ...copyFields
    } = task;

    const duplicatedTask = new this.taskModel({
      ...copyFields,
      companyId,
      title: `${task.title} (Copy)`,
      userId,
      isTimerRunning: false,
      timerStartedAt: null,
      timerUser: null,
      timeEntries: [],
      comments: [],
      updates: [],
    });

    return duplicatedTask.save();
  }

  // Ownership check is now handled by the shared CommentsService.

  async addComment(
    companyId: Types.ObjectId,
    taskId: string,
    commentData: any,
    userId?: string,
    email?: string,
  ): Promise<Task | null>;
  async addComment(
    taskId: string,
    commentData: any,
    userId?: string,
    email?: string,
    companyId?: Types.ObjectId,
  ): Promise<Task | null>;
  async addComment(
    companyIdOrTaskId: Types.ObjectId | string,
    taskIdOrCommentData: any,
    commentDataOrUserId?: any,
    userIdOrEmail?: string,
    emailOrCompanyId?: any,
  ): Promise<Task | null> {
    let companyId: Types.ObjectId | undefined;
    let taskId: string;
    let commentData: any;
    let userId: string | undefined;
    let email: string | undefined;

    if (companyIdOrTaskId instanceof Types.ObjectId) {
      companyId = companyIdOrTaskId;
      taskId = taskIdOrCommentData;
      commentData = commentDataOrUserId;
      userId = userIdOrEmail;
      email = emailOrCompanyId;
    } else {
      taskId = companyIdOrTaskId as string;
      commentData = taskIdOrCommentData;
      userId = commentDataOrUserId;
      email = userIdOrEmail;
      companyId = emailOrCompanyId;
    }

    const taskQuery: any = { _id: taskId };
    if (companyId) {
      taskQuery.companyId = companyId;
    }
    const task = await this.taskModel.findOne(taskQuery).exec();
    if (!task) return null;

    const resolvedCompanyId = companyId || task.companyId;
    if (userId && resolvedCompanyId) {
      await this.findOne(resolvedCompanyId, taskId, userId, email);
    }

    const updateFilter: any = { _id: taskId };
    if (resolvedCompanyId) {
      updateFilter.companyId = resolvedCompanyId;
    }
    return this.taskModel.findOneAndUpdate(
      updateFilter,
      { $push: { comments: commentData } },
      { new: true }
    ).exec();
  }

  async updateComment(
    companyId: Types.ObjectId,
    taskId: string,
    commentId: string,
    updateData: any,
    userId?: string,
    email?: string,
    reqUser?: any,
  ): Promise<Task | null>;
  async updateComment(
    taskId: string,
    commentId: string,
    updateData: any,
    userId?: string,
    email?: string,
    reqUser?: any,
    companyId?: Types.ObjectId,
  ): Promise<Task | null>;
  async updateComment(
    companyIdOrTaskId: Types.ObjectId | string,
    taskIdOrCommentId: string,
    commentIdOrUpdateData: any,
    updateDataOrUserId?: any,
    userIdOrEmail?: string,
    emailOrReqUser?: any,
    reqUserOrCompanyId?: any,
  ): Promise<Task | null> {
    let companyId: Types.ObjectId | undefined;
    let taskId: string;
    let commentId: string;
    let updateData: any;
    let userId: string | undefined;
    let email: string | undefined;
    let reqUser: any;

    if (companyIdOrTaskId instanceof Types.ObjectId) {
      companyId = companyIdOrTaskId;
      taskId = taskIdOrCommentId;
      commentId = commentIdOrUpdateData;
      updateData = updateDataOrUserId;
      userId = userIdOrEmail;
      email = emailOrReqUser;
      reqUser = reqUserOrCompanyId;
    } else {
      taskId = companyIdOrTaskId as string;
      commentId = taskIdOrCommentId;
      updateData = commentIdOrUpdateData;
      userId = updateDataOrUserId;
      email = userIdOrEmail;
      reqUser = emailOrReqUser;
      companyId = reqUserOrCompanyId;
    }

    const taskQuery: any = { _id: taskId };
    if (companyId) {
      taskQuery.companyId = companyId;
    }
    const task = await this.taskModel.findOne(taskQuery).exec();
    if (!task) return null;

    const resolvedCompanyId = companyId || task.companyId;
    if (userId && resolvedCompanyId) {
      await this.findOne(resolvedCompanyId, taskId, userId, email);
    }

    const comment: any = task.comments?.find((c: any) => c._id?.toString() === commentId || c.id === commentId);
    if (comment && !this.commentsService.isCommentOwner(comment, userId, email, reqUser)) {
      throw new ForbiddenException('You can only edit your own comments');
    }

    const updateFields: any = {};
    if (updateData.content !== undefined) updateFields['comments.$.content'] = updateData.content;
    if (updateData.attachments !== undefined) updateFields['comments.$.attachments'] = updateData.attachments;
    if (updateData.mentions !== undefined) updateFields['comments.$.mentions'] = updateData.mentions;

    const updateFilter: any = { _id: taskId, 'comments._id': commentId };
    if (resolvedCompanyId) {
      updateFilter.companyId = resolvedCompanyId;
    }

    return this.taskModel.findOneAndUpdate(
      updateFilter,
      { $set: updateFields },
      { new: true }
    ).exec();
  }

  async deleteComment(
    companyId: Types.ObjectId,
    taskId: string,
    commentId: string,
    userId?: string,
    email?: string,
    reqUser?: any,
  ): Promise<Task | null>;
  async deleteComment(
    taskId: string,
    commentId: string,
    userId?: string,
    email?: string,
    reqUser?: any,
    companyId?: Types.ObjectId,
  ): Promise<Task | null>;
  async deleteComment(
    companyIdOrTaskId: Types.ObjectId | string,
    taskIdOrCommentId: string,
    commentIdOrUserId?: any,
    userIdOrEmail?: string,
    emailOrReqUser?: any,
    reqUserOrCompanyId?: any,
  ): Promise<Task | null> {
    let companyId: Types.ObjectId | undefined;
    let taskId: string;
    let commentId: string;
    let userId: string | undefined;
    let email: string | undefined;
    let reqUser: any;

    if (companyIdOrTaskId instanceof Types.ObjectId) {
      companyId = companyIdOrTaskId;
      taskId = taskIdOrCommentId;
      commentId = commentIdOrUserId;
      userId = userIdOrEmail;
      email = emailOrReqUser;
      reqUser = reqUserOrCompanyId;
    } else {
      taskId = companyIdOrTaskId as string;
      commentId = taskIdOrCommentId;
      userId = commentIdOrUserId;
      email = userIdOrEmail;
      reqUser = emailOrReqUser;
      companyId = reqUserOrCompanyId;
    }

    const taskQuery: any = { _id: taskId };
    if (companyId) {
      taskQuery.companyId = companyId;
    }
    const task = await this.taskModel.findOne(taskQuery).exec();
    if (!task) return null;

    const resolvedCompanyId = companyId || task.companyId;
    if (userId && resolvedCompanyId) {
      await this.findOne(resolvedCompanyId, taskId, userId, email);
    }

    const comment: any = task.comments?.find((c: any) => c._id?.toString() === commentId || c.id === commentId);
    if (comment && !this.commentsService.isCommentOwner(comment, userId, email, reqUser)) {
      throw new ForbiddenException('You can only delete your own comments');
    }

    const deleteFilter: any = { _id: taskId };
    if (resolvedCompanyId) {
      deleteFilter.companyId = resolvedCompanyId;
    }

    return this.taskModel.findOneAndUpdate(
      deleteFilter,
      { $pull: { comments: { _id: commentId } } },
      { new: true }
    ).exec();
  }

  async inviteMember(
    companyId: Types.ObjectId,
    taskId: string,
    inviteEmail: string,
    name: string,
    inviterName: string,
    userId?: string,
    email?: string,
    isSystemAdmin?: boolean,
  ): Promise<any>;
  async inviteMember(
    taskId: string,
    inviteEmail: string,
    name: string,
    inviterName: string,
    userId?: string,
    email?: string,
    isSystemAdmin?: boolean,
    companyId?: Types.ObjectId,
  ): Promise<any>;
  async inviteMember(
    companyIdOrTaskId: Types.ObjectId | string,
    taskIdOrInviteEmail: string,
    inviteEmailOrName: string,
    nameOrInviterName: string,
    inviterNameOrUserId?: string,
    userIdOrEmail?: string,
    emailOrIsSystemAdmin?: any,
    isSystemAdminOrCompanyId?: any,
  ): Promise<any> {
    let companyId: Types.ObjectId | undefined;
    let taskId: string;
    let inviteEmail: string;
    let name: string;
    let inviterName: string;
    let userId: string | undefined;
    let email: string | undefined;
    let isSystemAdmin: boolean | undefined;

    if (companyIdOrTaskId instanceof Types.ObjectId) {
      companyId = companyIdOrTaskId;
      taskId = taskIdOrInviteEmail;
      inviteEmail = inviteEmailOrName;
      name = nameOrInviterName;
      inviterName = inviterNameOrUserId!;
      userId = userIdOrEmail;
      email = emailOrIsSystemAdmin;
      isSystemAdmin = isSystemAdminOrCompanyId;
    } else {
      taskId = companyIdOrTaskId as string;
      inviteEmail = taskIdOrInviteEmail;
      name = inviteEmailOrName;
      inviterName = nameOrInviterName;
      userId = inviterNameOrUserId;
      email = userIdOrEmail;
      isSystemAdmin = emailOrIsSystemAdmin;
      companyId = isSystemAdminOrCompanyId;
    }

    if (!Types.ObjectId.isValid(taskId)) {
      throw new BadRequestException('Invalid task ID');
    }

    const taskQuery: any = { _id: taskId };
    if (companyId) {
      taskQuery.companyId = companyId;
    }
    const existingTask = await this.taskModel.findOne(taskQuery).exec();
    if (!existingTask) {
      throw new NotFoundException('Task not found');
    }
    const resolvedCompanyId = companyId || existingTask.companyId;
    const task = resolvedCompanyId
      ? await this.findOne(resolvedCompanyId, taskId, userId, email, isSystemAdmin)
      : existingTask;
    if (!task) {
      throw new NotFoundException('Task not found');
    }

    const cleanInviteEmail = inviteEmail ? inviteEmail.trim().toLowerCase() : '';
    const newUpdate = {
      user: { name: inviterName, email },
      type: 'member',
      message: `assigned task to ${name ? `${name} (${cleanInviteEmail})` : cleanInviteEmail}`,
      timestamp: new Date(),
    };

    // Look up existing employee by email within company only
    let employeeAssigneeId: any = undefined;
    if (cleanInviteEmail) {
      const employeeQuery: any = {
        email: { $regex: new RegExp(`^${cleanInviteEmail}$`, 'i') },
      };
      if (resolvedCompanyId) {
        employeeQuery.companyId = resolvedCompanyId;
      }
      const existingEmployee = await this.employeeModel.findOne(employeeQuery).exec();
      if (existingEmployee) {
        employeeAssigneeId = existingEmployee._id;
      }
    }

    const assigneeName = name || cleanInviteEmail.split('@')[0];
    const updateSet: any = {
      members: [{ email: cleanInviteEmail, name: assigneeName, status: 'invited' }],
    };

    if (employeeAssigneeId) {
      updateSet.assignee = employeeAssigneeId;
    } else {
      updateSet.assignee = { name: assigneeName };
    }

    const updateFilter: any = { _id: taskId };
    if (resolvedCompanyId) {
      updateFilter.companyId = resolvedCompanyId;
    }

    const updatedTask = await this.taskModel.findOneAndUpdate(
      updateFilter,
      { 
        $set: updateSet,
        $push: {
          updates: newUpdate
        }
      },
      { new: true }
    ).exec();
    
    if (updatedTask) {
      if (this.emailService) {
        const companySlug = await this.getCompanySlug(resolvedCompanyId);
        await this.emailService.sendInviteEmail(cleanInviteEmail, updatedTask.title, inviterName, companySlug);
      }
    }
    return updatedTask;
  }

  async getActiveTimer(companyId: Types.ObjectId, email: string): Promise<any>;
  async getActiveTimer(email: string): Promise<any>;
  async getActiveTimer(companyIdOrEmail: Types.ObjectId | string, maybeEmail?: string): Promise<any> {
    let companyId: Types.ObjectId | undefined;
    let email: string | undefined;

    if (companyIdOrEmail instanceof Types.ObjectId) {
      companyId = companyIdOrEmail;
      email = maybeEmail;
    } else if (typeof companyIdOrEmail === 'string' && maybeEmail) {
      companyId = Types.ObjectId.isValid(companyIdOrEmail) ? new Types.ObjectId(companyIdOrEmail) : undefined;
      email = maybeEmail;
    } else {
      email = companyIdOrEmail as string;
    }

    if (!email) return null;

    const filter: any = {
      isTimerRunning: true,
      'timerUser.email': email,
    };
    if (companyId) {
      filter.companyId = companyId;
    }

    const activeTask = await this.taskModel.findOne(filter).exec();
    return activeTask ? (activeTask.toObject ? activeTask.toObject() : activeTask) : null;
  }

  /**
   * Starts a timer on a task within the specified company.
   *
   * Multi-company timer policy decision:
   * Timers are scoped per company: a user can run one timer per company concurrently.
   * When starting a timer in Company A, any previously running timer for this user
   * in Company A is stopped. A running timer for the same user in Company B is NOT
   * stopped and remains active in Company B.
   */
  async startTimer(
    companyId: Types.ObjectId,
    taskId: string,
    user: any,
    userId?: string,
    email?: string,
  ): Promise<any>;
  async startTimer(
    taskId: string,
    user: any,
    userId?: string,
    email?: string,
    companyId?: Types.ObjectId,
  ): Promise<any>;
  async startTimer(
    companyIdOrTaskId: Types.ObjectId | string,
    taskIdOrUser: any,
    userOrUserId?: any,
    userIdOrEmail?: string,
    emailOrCompanyId?: any,
    maybeCompanyId?: Types.ObjectId,
  ): Promise<any> {
    let companyId: Types.ObjectId | undefined;
    let taskId: string;
    let user: any;
    let userId: string | undefined;
    let email: string | undefined;

    if (companyIdOrTaskId instanceof Types.ObjectId) {
      companyId = companyIdOrTaskId;
      taskId = taskIdOrUser;
      user = userOrUserId;
      userId = userIdOrEmail;
      email = emailOrCompanyId;
    } else {
      taskId = companyIdOrTaskId as string;
      user = taskIdOrUser;
      userId = userOrUserId;
      email = userIdOrEmail;
      companyId = emailOrCompanyId || maybeCompanyId;
    }

    const taskQuery: any = { _id: taskId };
    if (companyId) {
      taskQuery.companyId = companyId;
    }
    const existingTask = await this.taskModel.findOne(taskQuery).exec();
    if (!existingTask) {
      throw new NotFoundException('Task not found');
    }
    const resolvedCompanyId = companyId || existingTask.companyId;
    const task = resolvedCompanyId
      ? await this.findOne(resolvedCompanyId, taskId, userId, email)
      : existingTask;
    if (!task) {
      throw new NotFoundException('Task not found');
    }

    // Permission check: only assigned user can start timer
    if (task.assignee && userId) {
      const employeeIds = resolvedCompanyId
        ? await this.getEmployeeIdsForUser(resolvedCompanyId, userId, email)
        : [];
      const assigneeId = ((task.assignee as any)?._id || task.assignee)?.toString();
      const assigneeEmail = (task.assignee as any)?.email?.toLowerCase();
      const isAssignee = employeeIds.includes(assigneeId) || (email && assigneeEmail && email.toLowerCase() === assigneeEmail);
      if (!isAssignee) {
        throw new ForbiddenException('Only the assigned user can start/stop the timer for this task');
      }
    }

    if (task.isTimerRunning) {
      return task.toObject ? task.toObject() : task;
    }

    // Check if user has an active timer elsewhere in THIS company and stop it
    // Decision (MC-22): User can run one timer per company. Only stop timers in the same company.
    let previousTimerStopped = false;
    const activeTimerFilter: any = {
      isTimerRunning: true,
      'timerUser.email': user?.email,
    };
    if (resolvedCompanyId) {
      activeTimerFilter.companyId = resolvedCompanyId;
    }
    const activeTask = await this.taskModel.findOne(activeTimerFilter).exec();

    if (activeTask && activeTask._id.toString() !== taskId) {
      if (resolvedCompanyId) {
        await this.stopTimer(resolvedCompanyId, activeTask._id.toString(), user, userId, email);
      } else {
        await this.stopTimer(activeTask._id.toString(), user, userId, email);
      }
      previousTimerStopped = true;
    }

    // Check estimated time limit
    if (task.estimatedHours && task.estimatedHours > 0) {
      const loggedSec = (task.timeEntries || []).reduce((acc: number, entry: any) => acc + (entry.durationSeconds || 0), 0);
      if (loggedSec >= task.estimatedHours * 3600) {
        throw new BadRequestException('Allocated time completed for this task. Cannot log more time.');
      }
    }

    const timerUserInfo = {
      name: user?.name || user?.email || 'User',
      email: user?.email,
      avatarUrl: user?.avatarUrl,
    };

    const timerAssigneeId = (task.assignee as any)?._id || task.assignee || undefined;

    const newUpdate = {
      assigneeId: timerAssigneeId,
      user: timerUserInfo,
      type: 'timer',
      message: `started task timer`,
      timestamp: new Date(),
    };

    const updateFilter: any = { _id: taskId };
    if (resolvedCompanyId) {
      updateFilter.companyId = resolvedCompanyId;
    }

    const updatedTask = await this.taskModel.findOneAndUpdate(
      updateFilter,
      {
        $set: {
          isTimerRunning: true,
          timerStartedAt: new Date(),
          timerUser: timerUserInfo,
          status: 'Doing', // Automatically change task status to Doing when timer starts
        },
        $push: {
          updates: newUpdate,
        },
      },
      { new: true }
    ).exec();

    if (!updatedTask) {
      throw new BadRequestException('Failed to start timer: Task not found');
    }

    return { ...updatedTask.toObject(), previousTimerStopped };
  }

  /**
   * Stops a timer on a task within the specified company.
   */
  async stopTimer(
    companyId: Types.ObjectId,
    taskId: string,
    user: any,
    userId?: string,
    email?: string,
  ): Promise<Task | null>;
  async stopTimer(
    taskId: string,
    user: any,
    userId?: string,
    email?: string,
    companyId?: Types.ObjectId,
  ): Promise<Task | null>;
  async stopTimer(
    companyIdOrTaskId: Types.ObjectId | string,
    taskIdOrUser: any,
    userOrUserId?: any,
    userIdOrEmail?: string,
    emailOrCompanyId?: any,
    maybeCompanyId?: Types.ObjectId,
  ): Promise<Task | null> {
    let companyId: Types.ObjectId | undefined;
    let taskId: string;
    let user: any;
    let userId: string | undefined;
    let email: string | undefined;

    if (companyIdOrTaskId instanceof Types.ObjectId) {
      companyId = companyIdOrTaskId;
      taskId = taskIdOrUser;
      user = userOrUserId;
      userId = userIdOrEmail;
      email = emailOrCompanyId;
    } else {
      taskId = companyIdOrTaskId as string;
      user = taskIdOrUser;
      userId = userOrUserId;
      email = userIdOrEmail;
      companyId = emailOrCompanyId || maybeCompanyId;
    }

    const taskQuery: any = { _id: taskId };
    if (companyId) {
      taskQuery.companyId = companyId;
    }
    const existingTask = await this.taskModel.findOne(taskQuery).exec();
    if (!existingTask) {
      throw new NotFoundException('Task not found');
    }
    const resolvedCompanyId = companyId || existingTask.companyId;
    const task = resolvedCompanyId
      ? await this.findOne(resolvedCompanyId, taskId, userId, email)
      : existingTask;
    if (!task) {
      throw new NotFoundException('Task not found');
    }

    // Permission check: only assigned user can stop timer
    if (task.assignee && userId) {
      const employeeIds = resolvedCompanyId
        ? await this.getEmployeeIdsForUser(resolvedCompanyId, userId, email)
        : [];
      const assigneeId = ((task.assignee as any)?._id || task.assignee)?.toString();
      const assigneeEmail = (task.assignee as any)?.email?.toLowerCase();
      const isAssignee = employeeIds.includes(assigneeId) || (email && assigneeEmail && email.toLowerCase() === assigneeEmail);
      if (!isAssignee) {
        throw new ForbiddenException('Only the assigned user can start/stop the timer for this task');
      }
    }

    if (!task.isTimerRunning || !task.timerStartedAt) {
      return task;
    }

    const timerUserInfo = {
      name: user?.name || user?.email || 'User',
      email: user?.email,
      avatarUrl: user?.avatarUrl,
    };

    const startTime = new Date(task.timerStartedAt);
    let stopTime = new Date();
    let durationSeconds = Math.max(1, Math.round((stopTime.getTime() - startTime.getTime()) / 1000));

    if (task.estimatedHours && task.estimatedHours > 0) {
      const alreadyLoggedSeconds = (task.timeEntries || []).reduce(
        (acc: number, entry: any) => acc + (entry.durationSeconds || 0),
        0,
      );
      const allocatedSeconds = task.estimatedHours * 3600;
      const remainingSeconds = Math.max(0, allocatedSeconds - alreadyLoggedSeconds);

      if (durationSeconds > remainingSeconds) {
        durationSeconds = remainingSeconds;
        stopTime = new Date(startTime.getTime() + durationSeconds * 1000);
      }
    }

    const timerAssigneeId = (task.assignee as any)?._id || task.assignee || undefined;

    const newEntry = {
      assigneeId: timerAssigneeId,
      user: timerUserInfo,
      startTime,
      stopTime,
      durationSeconds,
    };

    const newUpdate = {
      assigneeId: timerAssigneeId,
      user: timerUserInfo,
      type: 'timer',
      message: `stopped task timer (${Math.floor(durationSeconds / 3600)}h ${Math.floor((durationSeconds % 3600) / 60)}m)`,
      timestamp: new Date(),
    };

    const updateFilter: any = { _id: taskId };
    if (resolvedCompanyId) {
      updateFilter.companyId = resolvedCompanyId;
    }

    const updatedTask = await this.taskModel.findOneAndUpdate(
      updateFilter,
      {
        $set: {
          isTimerRunning: false,
          timerStartedAt: null,
          timerUser: null,
        },
        $push: {
          timeEntries: newEntry,
          updates: newUpdate,
        },
      },
      { new: true }
    ).exec();

    return updatedTask;
  }

  /**
   * Retrieves timeline entries scoped to a specific company and user email.
   * Pipeline begins with { $match: { companyId, 'timeEntries.user.email': email } }
   * ensuring entries from other companies are never returned.
   */
  async getTimeline(
    companyId: Types.ObjectId,
    _userId: string,
    email: string,
    filterParams: any,
  ): Promise<any>;
  async getTimeline(
    _userId: string,
    email: string,
    filterParams: any,
  ): Promise<any>;
  async getTimeline(
    companyIdOrUserId: Types.ObjectId | string,
    userIdOrEmail: string,
    emailOrFilterParams: any,
    maybeFilterParams?: any,
  ): Promise<any> {
    let companyId: Types.ObjectId | undefined;
    let _userId: string;
    let email: string;
    let filterParams: any;

    if (companyIdOrUserId instanceof Types.ObjectId) {
      companyId = companyIdOrUserId;
      _userId = userIdOrEmail;
      email = emailOrFilterParams;
      filterParams = maybeFilterParams || {};
    } else {
      _userId = companyIdOrUserId as string;
      email = userIdOrEmail;
      filterParams = emailOrFilterParams || {};
      companyId = filterParams?.companyId;
    }

    const { startDate, endDate, page = 1 } = filterParams;
    const limit = 80;
    const skip = (Number(page) - 1) * limit;

    const initialMatch: any = {
      'timeEntries.user.email': email,
    };
    if (companyId) {
      initialMatch.companyId = companyId;
    }

    const pipeline: any[] = [
      { $match: initialMatch },
      { $unwind: '$timeEntries' },
      { $match: { 'timeEntries.user.email': email } }
    ];

    if (startDate && endDate) {
      pipeline.push({
        $match: {
          'timeEntries.startTime': {
            $gte: new Date(startDate),
            $lte: new Date(endDate)
          }
        }
      });
    }

    pipeline.push({ $sort: { 'timeEntries.startTime': -1 } });

    const countPipeline = [...pipeline, { $count: 'total' }];
    const countResult = await this.taskModel.aggregate(countPipeline).exec();
    const total = countResult && countResult.length > 0 ? countResult[0].total : 0;

    pipeline.push({ $skip: skip });
    pipeline.push({ $limit: limit });
    pipeline.push({
      $project: {
        _id: 0,
        taskId: '$_id',
        title: 1,
        timeEntry: '$timeEntries',
      },
    });

    const entries = await this.taskModel.aggregate(pipeline).exec();

    return {
      total,
      page: Number(page),
      limit,
      entries,
    };
  }
}

