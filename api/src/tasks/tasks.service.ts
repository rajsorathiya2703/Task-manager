import { Injectable, Optional } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Task } from './schemas/task.schema';
import { Project } from '../projects/schemas/project.schema';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';

import { EmailService } from './email.service';
import { CommentsService } from '../comments/comments.service';

import { Team } from '../teams/schemas/team.schema';
import { Employee } from '../employees/schemas/employee.schema';
import { AccessScopeService } from '../permissions/access-scope.service';

@Injectable()
export class TasksService {
  constructor(
    @InjectModel(Task.name) private taskModel: Model<Task>,
    @InjectModel(Project.name) private projectModel: Model<Project>,
    @InjectModel(Team.name) private teamModel: Model<Team>,
    @InjectModel(Employee.name) private employeeModel: Model<Employee>,
    private emailService: EmailService,
    private commentsService: CommentsService,
    @Optional() private readonly accessScopeService?: AccessScopeService,
  ) {}

  /**
   * Pure read-only helper: resolves all Employee IDs that correspond to a
   * given userId and/or email. Used to build access-check query conditions.
   *
   * IMPORTANT: This method intentionally does NOT write any data.
   * Any Employee → User linking must go through the explicit, verified
   * EmployeesService.linkByUserId() path (called from the /link-user endpoint).
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


  async hasTaskAccess(
    task: Task,
    userId?: string,
    email?: string,
    isSystemAdmin?: boolean,
    scope: 'own' | 'team' | 'all' = 'own',
  ): Promise<boolean> {
    if (isSystemAdmin || scope === 'all') return true;
    if (!userId && !email) return true;

    if (this.accessScopeService) {
      const userContext = { id: userId, _id: userId, email, is_system_admin: isSystemAdmin };
      return this.accessScopeService.canAccess('tasks', task, userContext, scope);
    }

    const employeeIds = await this.getEmployeeIdsForUser(userId, email);
    const employeeIdStrs = new Set(employeeIds.map((e) => e.toString()));

    // Check direct ownership or assignee or membership on this task
    const taskAssigneeId = (task.assignee as any)?._id
      ? (task.assignee as any)._id.toString()
      : task.assignee?.toString();

    if (
      task.userId?.toString() === userId ||
      (taskAssigneeId && employeeIdStrs.has(taskAssigneeId)) ||
      (email && task.members && task.members.some((m) => m.email?.toLowerCase() === email.toLowerCase()))
    ) {
      return true;
    }

    // Check project membership/ownership for project-connected tasks
    if (task.projectId) {
      const project = await this.projectModel.findById(task.projectId).exec();
      if (project) {
        let isProjectMember =
          project.userId?.toString() === userId ||
          (email && (project as any).members && (project as any).members.some((m: any) => m.email?.toLowerCase() === email.toLowerCase()));

        if (!isProjectMember && project.teamId) {
          const team = await this.teamModel.findById(project.teamId).exec();
          if (team) {
            if (team.teamLead && employeeIdStrs.has(team.teamLead.toString())) {
              isProjectMember = true;
            } else if (team.members && team.members.some((m) => employeeIdStrs.has(m.toString()))) {
              isProjectMember = true;
            }
          }
        }

        if (isProjectMember) return true;
      }
    }

    return false;
  }

  async create(userId: string, createTaskDto: CreateTaskDto, email?: string, isSystemAdmin?: boolean): Promise<Task> {
    if (createTaskDto.projectId) {
      const project = await this.projectModel.findById(createTaskDto.projectId).exec();
      if (!project) {
        const { BadRequestException } = require('@nestjs/common');
        throw new BadRequestException('Project not found');
      }

      if (!isSystemAdmin) {
        const employeeIds = await this.getEmployeeIdsForUser(userId, email);
        const employeeIdStrs = new Set(employeeIds.map((e) => e.toString()));

        let isProjectMember =
          project.userId?.toString() === userId ||
          (email && (project as any).members && (project as any).members.some((m: any) => m.email?.toLowerCase() === email.toLowerCase()));

        if (!isProjectMember && project.teamId) {
          const team = await this.teamModel.findById(project.teamId).exec();
          if (team) {
            if (team.teamLead && employeeIdStrs.has(team.teamLead.toString())) {
              isProjectMember = true;
            } else if (team.members && team.members.some((m) => employeeIdStrs.has(m.toString()))) {
              isProjectMember = true;
            }
          }
        }

        if (!isProjectMember) {
          const { ForbiddenException } = require('@nestjs/common');
          throw new ForbiddenException('You do not have access to this project');
        }
      }
    }

    const creatorEmployeeIds = await this.getEmployeeIdsForUser(userId, email);
    const creatorEmployeeId = creatorEmployeeIds.length > 0 ? creatorEmployeeIds[0] : null;

    const taskData: any = { ...createTaskDto, userId };
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
        let employee = await this.employeeModel.findById(targetAssigneeId).exec();
        if (!employee) {
          employee = await this.employeeModel.findOne({ $or: [{ userId: targetAssigneeId }, { _id: targetAssigneeId }] }).exec();
        }
        if (employee && employee.email) {
          const employeeName = employee.fullName
            ? `${employee.fullName.firstName} ${employee.fullName.lastName || ''}`.trim()
            : (employee.email.split('@')[0] || 'Team Member');
          const assignerName = email || 'Your Team Lead';
          let projectName: string | undefined;
          if (savedTask.projectId) {
            const project = await this.projectModel.findById(savedTask.projectId).exec();
            if (project) projectName = project.name;
          }
          await this.emailService.sendTaskAssignmentEmail(
            employee.email,
            savedTask.title,
            assignerName,
            employeeName,
            savedTask._id.toString(),
            projectName
          );
        }
      } catch (mailErr) {
        console.error('Failed to send task assignment email on create:', mailErr);
      }
    }

    return savedTask;
  }

  async findAll(
    userId: string,
    email?: string,
    projectId?: string,
    isSystemAdmin?: boolean,
    scope: 'own' | 'team' | 'all' = 'own',
  ): Promise<Task[]> {
    const { Types } = require('mongoose');

    if (isSystemAdmin || scope === 'all') {
      const query: any = {};
      if (projectId) {
        const projIdObj = Types.ObjectId.isValid(projectId) ? new Types.ObjectId(projectId) : projectId;
        query.$or = [{ projectId: projIdObj }, { projectId: projectId.toString() }];
      }
      return this.taskModel
        .find(query)
        .populate('projectId', 'name color')
        .populate('assignee')
        .populate('assignedBy')
        .sort({ createdAt: -1 })
        .exec();
    }

    if (this.accessScopeService) {
      const userContext = { id: userId, _id: userId, email, is_system_admin: isSystemAdmin };
      const scopeFilter = await this.accessScopeService.buildFilter('tasks', userContext, scope);

      if (projectId) {
        const projIdObj = Types.ObjectId.isValid(projectId) ? new Types.ObjectId(projectId) : projectId;
        const project = await this.projectModel.findById(projIdObj).exec();
        if (!project) return [];

        const hasProjectAccess = await this.accessScopeService.canAccess('projects', project, userContext, scope);
        if (hasProjectAccess && scope === 'team') {
          return this.taskModel
            .find({
              $or: [{ projectId: projIdObj }, { projectId: projectId.toString() }],
            })
            .populate('projectId', 'name color')
            .populate('assignee')
            .populate('assignedBy')
            .sort({ createdAt: -1 })
            .exec();
        }

        return this.taskModel
          .find({
            $and: [
              { $or: [{ projectId: projIdObj }, { projectId: projectId.toString() }] },
              scopeFilter,
            ],
          })
          .populate('projectId', 'name color')
          .populate('assignee')
          .populate('assignedBy')
          .sort({ createdAt: -1 })
          .exec();
      }

      return this.taskModel
        .find(scopeFilter)
        .populate('projectId', 'name color')
        .populate('assignee')
        .populate('assignedBy')
        .sort({ createdAt: -1 })
        .exec();
    }

    const employeeIds = await this.getEmployeeIdsForUser(userId, email);
    const employeeIdObjs = employeeIds.map((id) => (Types.ObjectId.isValid(id) ? new Types.ObjectId(id) : id));
    const employeeIdStrs = employeeIds.map((id) => id.toString());
    const allEmployeeIds = Array.from(new Set([...employeeIdObjs, ...employeeIdStrs]));

    let tasks: Task[] = [];
    if (projectId) {
      const projIdObj = Types.ObjectId.isValid(projectId) ? new Types.ObjectId(projectId) : projectId;
      const project = await this.projectModel.findById(projIdObj).exec();
      if (!project) return [];

      let isOwnerOrLead = Boolean(isSystemAdmin || project.userId?.toString() === userId);
      if (!isOwnerOrLead && project.teamId) {
        const team = await this.teamModel.findById(project.teamId).exec();
        const teamLeadStr = team?.teamLead ? team.teamLead.toString() : null;
        if (teamLeadStr && allEmployeeIds.some((eid) => eid.toString() === teamLeadStr)) {
          isOwnerOrLead = true;
        }
      }

      if (isOwnerOrLead) {
        tasks = await this.taskModel.find({
          $or: [
            { projectId: projIdObj },
            { projectId: projectId.toString() },
          ],
        }).populate('projectId', 'name color').populate('assignee').populate('assignedBy').exec();
      } else {
        // Assigned member only sees tasks in this project assigned to them (or created by them)
        const userIdObj = Types.ObjectId.isValid(userId) ? new Types.ObjectId(userId) : userId;
        const taskOrConditions: any[] = [
          { userId },
          { userId: userIdObj },
        ];
        if (allEmployeeIds.length > 0) {
          taskOrConditions.push({ assignee: { $in: allEmployeeIds } });
        }
        if (email && typeof email === 'string' && email.trim()) {
          taskOrConditions.push({ 'members.email': { $regex: new RegExp(`^${email.trim()}$`, 'i') } });
        }

        tasks = await this.taskModel.find({
          $and: [
            {
              $or: [
                { projectId: projIdObj },
                { projectId: projectId.toString() },
              ],
            },
            {
              $or: taskOrConditions,
            },
          ],
        }).populate('projectId', 'name color').populate('assignee').populate('assignedBy').exec();
      }
    } else {
      if (isSystemAdmin) {
        return this.taskModel.find({}).populate('projectId', 'name color').populate('assignee').populate('assignedBy').sort({ createdAt: -1 }).exec();
      }
      // Main tasks page view (no projectId specified):
      const userIdObj = Types.ObjectId.isValid(userId) ? new Types.ObjectId(userId) : userId;

      const orConditions: any[] = [];

      // 1. Tasks assigned to this user
      if (allEmployeeIds.length > 0) {
        orConditions.push({
          assignee: { $in: allEmployeeIds },
        });
      }

      // 2. Unassigned tasks created by this user
      orConditions.push({
        $and: [
          { $or: [{ userId }, { userId: userIdObj }] },
          { $or: [{ assignee: null }, { assignee: { $exists: false } }] }
        ]
      });

      // 3. Tasks where user is explicitly in members array
      if (email && typeof email === 'string' && email.trim()) {
        orConditions.push({
          'members.email': { $regex: new RegExp(`^${email.trim()}$`, 'i') },
        });
      }

      tasks = await this.taskModel.find({ $or: orConditions }).populate('projectId', 'name color').populate('assignee').populate('assignedBy').exec();
    }

    return tasks;
  }

  async findOne(
    id: string,
    userId?: string,
    email?: string,
    isSystemAdmin?: boolean,
    scope: 'own' | 'team' | 'all' = 'own',
  ): Promise<any | null> {
    const { Types } = require('mongoose');
    if (!Types.ObjectId.isValid(id)) {
      return null;
    }
    const task = await this.taskModel.findById(id).populate('assignee').populate('assignedBy').exec();
    if (!task) return null;

    if (userId) {
      const hasAccess = await this.hasTaskAccess(task, userId, email, isSystemAdmin, scope);
      if (!hasAccess) {
        const { ForbiddenException } = require('@nestjs/common');
        throw new ForbiddenException('You do not have access to this task');
      }
    }
    
    if (task.isTimerRunning && task.timerStartedAt && task.estimatedHours && task.estimatedHours > 0) {
      const alreadyLoggedSeconds = (task.timeEntries || []).reduce((acc: number, entry: any) => acc + (entry.durationSeconds || 0), 0);
      const allocatedSeconds = task.estimatedHours * 3600;
      const elapsedSeconds = (Date.now() - new Date(task.timerStartedAt).getTime()) / 1000;
      
      if (alreadyLoggedSeconds + elapsedSeconds >= allocatedSeconds) {
        const user = task.timerUser || { name: 'User' };
        await this.stopTimer(id, user, userId, email);
        const autoStoppedTask = await this.taskModel.findById(id).populate('assignee').populate('assignedBy').exec();
        if (autoStoppedTask) {
          this.sanitizeTaskEntries(autoStoppedTask);
          await this.taskModel.updateOne(
            { _id: id },
            { $set: { timeEntries: autoStoppedTask.timeEntries } }
          ).exec();
          const updatedObj: any = autoStoppedTask.toObject ? autoStoppedTask.toObject() : autoStoppedTask;
          if (!updatedObj.assignedBy && autoStoppedTask.userId) {
            const creatorEmployee = await this.employeeModel.findOne({ userId: autoStoppedTask.userId }).exec();
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
        { _id: id },
        { $set: { timeEntries: task.timeEntries } }
      ).exec();
    }

    const taskObj: any = task.toObject ? task.toObject() : { ...task };

    if (!taskObj.assignedBy && task.userId) {
      const creatorEmployee = await this.employeeModel.findOne({ userId: task.userId }).exec();
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
    id: string,
    updateTaskDto: UpdateTaskDto,
    userId?: string,
    email?: string,
    user?: { name: string; avatarUrl?: string; email?: string },
    isSystemAdmin?: boolean,
    scope: 'own' | 'team' | 'all' = 'own',
  ): Promise<Task | null> {
    let existingTask: any = null;
    if (userId) {
      existingTask = await this.findOne(id, userId, email, isSystemAdmin, scope);
    } else {
      existingTask = await this.taskModel.findById(id).exec();
    }
    if (!existingTask) return null;

    const isOwner = Boolean(isSystemAdmin || (userId && existingTask.userId?.toString() === userId));
    const isModifyingStartDate = updateTaskDto.startDate !== undefined && updateTaskDto.startDate !== existingTask.startDate;
    const isModifyingDueDate = updateTaskDto.dueDate !== undefined && updateTaskDto.dueDate !== existingTask.dueDate;

    if ((isModifyingStartDate || isModifyingDueDate) && !isOwner) {
      let canModifyDates = false;
      if (existingTask.projectId) {
        const project = await this.projectModel.findById(existingTask.projectId).exec();
        if (project) {
          if (project.userId?.toString() === userId) {
            canModifyDates = true;
          } else if (project.teamId) {
            const team = await this.teamModel.findById(project.teamId).exec();
            if (team && team.teamLead) {
              const employeeIds = await this.getEmployeeIdsForUser(userId, email);
              const employeeIdStrs = new Set(employeeIds.map((e) => e.toString()));
              if (employeeIdStrs.has(team.teamLead.toString())) {
                canModifyDates = true;
              }
            }
          }
        }
      }

      if (!canModifyDates) {
        const employeeIds = await this.getEmployeeIdsForUser(userId, email);
        const employeeIdStrs = new Set(employeeIds.map((e) => e.toString()));
        const assigneeId = (existingTask.assignee as any)?._id
          ? (existingTask.assignee as any)._id.toString()
          : existingTask.assignee?.toString();
        if (assigneeId && employeeIdStrs.has(assigneeId)) {
          canModifyDates = true;
        }
      }

      if (!canModifyDates) {
        const { ForbiddenException } = require('@nestjs/common');
        throw new ForbiddenException('Only task owners, assignees, project leads, or administrators can modify task dates');
      }
    }

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
      if (assigneeId && existingTask.projectId) {
        const project = await this.projectModel.findById(existingTask.projectId).exec();
        if (project && project.teamId) {
          const team = await this.teamModel.findById(project.teamId).exec();
          if (!team || !team.members.some(memberId => memberId.toString() === assigneeId)) {
            const { BadRequestException } = require('@nestjs/common');
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
            const employee = await this.employeeModel.findById(newAssigneeId).exec();
            if (employee && employee.fullName) {
              employeeName = `${employee.fullName.firstName} ${employee.fullName.lastName || ''}`.trim();
            } else if (employee && employee.email) {
              employeeName = employee.email.split('@')[0];
            }
          } catch (e) {
            console.error('Failed to find assignee employee info:', e);
          }
        }

        const assignerIdStr = existingTask.assignedBy?._id?.toString() || existingTask.assignedBy?.toString();
        const isAssignBack = assignerIdStr && newAssigneeId && assignerIdStr === newAssigneeId;

        if (!sanitizedDto.assignedBy && userId && !isAssignBack) {
          const userEmployeeIds = await this.getEmployeeIdsForUser(userId, email);
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
            const employee = await this.employeeModel.findById(newAssigneeId).exec();
            if (employee && employee.email) {
              const empName = employee.fullName
                ? `${employee.fullName.firstName} ${employee.fullName.lastName || ''}`.trim()
                : (employee.email.split('@')[0] || 'Team Member');
              const assignerName = userInfo.name || email || 'Your Team Lead';
              const taskTitle = updateTaskDto.title || existingTask.title || 'Task';
              let projectName: string | undefined;
              if (existingTask.projectId) {
                const project = await this.projectModel.findById(existingTask.projectId).exec();
                if (project) projectName = project.name;
              }
              this.emailService.sendTaskAssignmentEmail(
                employee.email,
                taskTitle,
                assignerName,
                empName,
                id,
                projectName
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

    const updatedTask = await this.taskModel.findByIdAndUpdate(id, updateOps, { new: true }).populate('assignee').populate('assignedBy').exec();
    if (!updatedTask) return null;
    const taskObj: any = updatedTask.toObject ? updatedTask.toObject() : updatedTask;
    if (!taskObj.assignedBy && updatedTask.userId) {
      const creatorEmployee = await this.employeeModel.findOne({ userId: updatedTask.userId }).exec();
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
    id: string,
    userId?: string,
    _email?: string,
    isSystemAdmin?: boolean,
    scope: 'own' | 'team' | 'all' = 'own',
  ): Promise<Task | null> {
    if (userId && !isSystemAdmin && scope !== 'all') {
      const task = await this.taskModel.findById(id).exec();
      if (!task) return null;

      if (this.accessScopeService) {
        const userContext = { id: userId, _id: userId, email: _email, is_system_admin: isSystemAdmin };
        const hasAccess = await this.accessScopeService.canAccess('tasks', task, userContext, scope);
        if (!hasAccess) {
          const { ForbiddenException } = require('@nestjs/common');
          throw new ForbiddenException('Only task owners, project leads, or administrators can delete this task');
        }
      } else {
        const isOwner = task.userId?.toString() === userId;
        let canDelete = isOwner;

        if (!canDelete && task.projectId) {
          const project = await this.projectModel.findById(task.projectId).exec();
          if (project) {
            if (project.userId?.toString() === userId) {
              canDelete = true;
            } else if (project.teamId) {
              const team = await this.teamModel.findById(project.teamId).exec();
              if (team && team.teamLead) {
                const employeeIds = await this.getEmployeeIdsForUser(userId, _email);
                const employeeIdStrs = new Set(employeeIds.map((e) => e.toString()));
                if (employeeIdStrs.has(team.teamLead.toString())) {
                  canDelete = true;
                }
              }
            }
          }
        }

        if (!canDelete) {
          const { ForbiddenException } = require('@nestjs/common');
          throw new ForbiddenException('Only task owners, project leads, or administrators can delete this task');
        }
      }
    }
    return this.taskModel.findByIdAndDelete(id).exec();
  }

  async duplicate(id: string, userId: string, email?: string): Promise<Task> {
    const task = await this.findOne(id, userId, email);
    if (!task) {
      const { BadRequestException } = require('@nestjs/common');
      throw new BadRequestException('Task not found');
    }

    // Build a clean copy: include only the fields that make sense for a duplicate.
    // Omit: _id, __v, id, createdAt, updatedAt, isTimerRunning, timerStartedAt,
    //        timerUser, timeEntries, comments, updates.
    const {
      _id, __v, id: _ignoredId, createdAt, updatedAt,
      isTimerRunning, timerStartedAt, timerUser,
      timeEntries, comments, updates,
      ...copyFields
    } = task;

    const duplicatedTask = new this.taskModel({
      ...copyFields,
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

  async addComment(taskId: string, commentData: any, userId?: string, email?: string): Promise<Task | null> {
    if (userId) {
      await this.findOne(taskId, userId, email);
    }
    return this.taskModel.findByIdAndUpdate(
      taskId,
      { $push: { comments: commentData } },
      { new: true }
    ).exec();
  }

  async updateComment(taskId: string, commentId: string, updateData: any, userId?: string, email?: string, reqUser?: any): Promise<Task | null> {
    if (userId) {
      await this.findOne(taskId, userId, email);
    }

    const task = await this.taskModel.findById(taskId).exec();
    if (!task) return null;

    const comment: any = task.comments?.find((c: any) => c._id?.toString() === commentId || c.id === commentId);
    if (comment && !this.commentsService.isCommentOwner(comment, userId, email, reqUser)) {
      const { ForbiddenException } = require('@nestjs/common');
      throw new ForbiddenException('You can only edit your own comments');
    }

    const updateFields: any = {};
    if (updateData.content !== undefined) updateFields['comments.$.content'] = updateData.content;
    if (updateData.attachments !== undefined) updateFields['comments.$.attachments'] = updateData.attachments;
    if (updateData.mentions !== undefined) updateFields['comments.$.mentions'] = updateData.mentions;

    return this.taskModel.findOneAndUpdate(
      { _id: taskId, 'comments._id': commentId },
      { $set: updateFields },
      { new: true }
    ).exec();
  }

  async deleteComment(taskId: string, commentId: string, userId?: string, email?: string, reqUser?: any): Promise<Task | null> {
    if (userId) {
      await this.findOne(taskId, userId, email);
    }

    const task = await this.taskModel.findById(taskId).exec();
    if (!task) return null;

    const comment: any = task.comments?.find((c: any) => c._id?.toString() === commentId || c.id === commentId);
    if (comment && !this.commentsService.isCommentOwner(comment, userId, email, reqUser)) {
      const { ForbiddenException } = require('@nestjs/common');
      throw new ForbiddenException('You can only delete your own comments');
    }

    return this.taskModel.findByIdAndUpdate(
      taskId,
      { $pull: { comments: { _id: commentId } } },
      { new: true }
    ).exec();
  }

  async inviteMember(taskId: string, inviteEmail: string, name: string, inviterName: string, userId?: string, email?: string, isSystemAdmin?: boolean) {
    const { Types } = require('mongoose');
    if (!Types.ObjectId.isValid(taskId)) {
      const { BadRequestException } = require('@nestjs/common');
      throw new BadRequestException('Invalid task ID');
    }
    const task = await this.findOne(taskId, userId, email, isSystemAdmin);
    if (!task) {
      const { BadRequestException } = require('@nestjs/common');
      throw new BadRequestException('Task not found');
    }

    if (userId && !isSystemAdmin && task.userId?.toString() !== userId) {
      let canInvite = false;
      if (task.projectId) {
        const project = await this.projectModel.findById(task.projectId).exec();
        if (project) {
          if (project.userId?.toString() === userId) {
            canInvite = true;
          } else if (project.teamId) {
            const team = await this.teamModel.findById(project.teamId).exec();
            if (team && team.teamLead) {
              const employeeIds = await this.getEmployeeIdsForUser(userId, email);
              const employeeIdStrs = new Set(employeeIds.map((e) => e.toString()));
              if (employeeIdStrs.has(team.teamLead.toString())) {
                canInvite = true;
              }
            }
          }
        }
      }
      // Authorized by PermissionsGuard (which verified 'tasks:update' / 'tasks.assignment') and user has access to task
      canInvite = true;

      if (!canInvite) {
        const { ForbiddenException } = require('@nestjs/common');
        throw new ForbiddenException('Only task owners, project leads, or administrators can invite members');
      }
    }

    const cleanInviteEmail = inviteEmail ? inviteEmail.trim().toLowerCase() : '';
    const newUpdate = {
      user: { name: inviterName, email },
      type: 'member',
      message: `assigned task to ${name ? `${name} (${cleanInviteEmail})` : cleanInviteEmail}`,
      timestamp: new Date(),
    };

    // Look up existing employee by email
    let employeeAssigneeId: any = undefined;
    if (cleanInviteEmail) {
      const existingEmployee = await this.employeeModel.findOne({
        email: { $regex: new RegExp(`^${cleanInviteEmail}$`, 'i') },
      }).exec();
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

    const updatedTask = await this.taskModel.findByIdAndUpdate(
      taskId,
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
        await this.emailService.sendInviteEmail(cleanInviteEmail, updatedTask.title, inviterName);
      }
    }
    return updatedTask;
  }

  async getActiveTimer(email: string): Promise<any> {
    if (!email) return null;
    const activeTask = await this.taskModel.findOne({
      isTimerRunning: true,
      'timerUser.email': email,
    }).exec();
    
    return activeTask ? activeTask.toObject ? activeTask.toObject() : activeTask : null;
  }

  async startTimer(taskId: string, user: any, userId?: string, email?: string): Promise<any> {
    const task = await this.findOne(taskId, userId, email);
    if (!task) {
      const { BadRequestException } = require('@nestjs/common');
      throw new BadRequestException('Task not found');
    }

    // Permission check: only assigned user can start timer
    if (task.assignee && userId) {
      const employeeIds = await this.getEmployeeIdsForUser(userId, email);
      const assigneeId = ((task.assignee as any)?._id || task.assignee)?.toString();
      const assigneeEmail = (task.assignee as any)?.email?.toLowerCase();
      const isAssignee = employeeIds.includes(assigneeId) || (email && assigneeEmail && email.toLowerCase() === assigneeEmail);
      if (!isAssignee) {
        const { ForbiddenException } = require('@nestjs/common');
        throw new ForbiddenException('Only the assigned user can start/stop the timer for this task');
      }
    }

    if (task.isTimerRunning) {
      return task.toObject ? task.toObject() : task;
    }

    // Check if user has an active timer elsewhere and stop it
    let previousTimerStopped = false;
    const activeTask = await this.taskModel.findOne({
      isTimerRunning: true,
      'timerUser.email': user?.email
    }).exec();

    if (activeTask && activeTask._id.toString() !== taskId) {
      await this.stopTimer(activeTask._id.toString(), user, userId, email);
      previousTimerStopped = true;
    }

    // Check estimated time limit
    if (task.estimatedHours && task.estimatedHours > 0) {
      const loggedSec = (task.timeEntries || []).reduce((acc: number, entry: any) => acc + (entry.durationSeconds || 0), 0);
      if (loggedSec >= task.estimatedHours * 3600) {
        const { BadRequestException } = require('@nestjs/common');
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

    const updatedTask = await this.taskModel.findByIdAndUpdate(
      taskId,
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
      const { BadRequestException } = require('@nestjs/common');
      throw new BadRequestException('Failed to start timer: Task not found');
    }

    return { ...updatedTask.toObject(), previousTimerStopped };
  }

  async stopTimer(taskId: string, user: any, userId?: string, email?: string): Promise<Task | null> {
    const task = await this.findOne(taskId, userId, email);
    if (!task) {
      const { BadRequestException } = require('@nestjs/common');
      throw new BadRequestException('Task not found');
    }

    // Permission check: only assigned user can stop timer
    if (task.assignee && userId) {
      const employeeIds = await this.getEmployeeIdsForUser(userId, email);
      const assigneeId = ((task.assignee as any)?._id || task.assignee)?.toString();
      const assigneeEmail = (task.assignee as any)?.email?.toLowerCase();
      const isAssignee = employeeIds.includes(assigneeId) || (email && assigneeEmail && email.toLowerCase() === assigneeEmail);
      if (!isAssignee) {
        const { ForbiddenException } = require('@nestjs/common');
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

    const updatedTask = await this.taskModel.findByIdAndUpdate(
      taskId,
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

  async getTimeline(_userId: string, email: string, filterParams: any) {
    const { startDate, endDate, page = 1 } = filterParams;
    const limit = 80;
    const skip = (Number(page) - 1) * limit;

    const pipeline: any[] = [
      { $match: { 'timeEntries.user.email': email } },
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
    const total = countResult.length > 0 ? countResult[0].total : 0;

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

