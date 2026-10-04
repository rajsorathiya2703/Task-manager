import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { Types } from 'mongoose';
import { TasksService } from './tasks.service';
import { Task } from './schemas/task.schema';
import { Project } from '../projects/schemas/project.schema';
import { Team } from '../teams/schemas/team.schema';
import { Employee } from '../employees/schemas/employee.schema';
import { EmailService } from './email.service';
import { CommentsService } from '../comments/comments.service';

describe('TasksService - Authorization & Tenant Scoping (P1-05 & MC-21)', () => {
  let service: TasksService;
  let taskModel: any;
  let projectModel: any;
  let teamModel: any;
  let employeeModel: any;
  let emailService: any;
  let commentsService: any;

  const mockCompanyId = new Types.ObjectId();
  const mockOtherCompanyId = new Types.ObjectId();

  const mockAdminUserId = new Types.ObjectId().toString();
  const mockOwnerUserId = new Types.ObjectId().toString();
  const mockOtherUserId = new Types.ObjectId().toString();

  const mockOwnerEmpId = new Types.ObjectId();
  const mockOtherEmpId = new Types.ObjectId();

  const mockTaskId = new Types.ObjectId().toString();
  const mockProjectId = new Types.ObjectId().toString();

  const mockTask: any = {
    _id: new Types.ObjectId(mockTaskId),
    companyId: mockCompanyId,
    title: 'Test Task',
    userId: mockOwnerUserId,
    startDate: '2026-09-01T00:00:00.000Z',
    dueDate: '2026-09-10T00:00:00.000Z',
    assignee: mockOwnerEmpId,
    projectId: new Types.ObjectId(mockProjectId),
    members: [],
    timeEntries: [],
  };

  beforeEach(async () => {
    taskModel = function (dto: any) {
      return {
        ...dto,
        save: jest.fn().mockResolvedValue(dto),
      };
    };
    taskModel.findById = jest.fn();
    taskModel.findByIdAndUpdate = jest.fn();
    taskModel.findByIdAndDelete = jest.fn();
    taskModel.findOne = jest.fn();
    taskModel.findOneAndUpdate = jest.fn();
    taskModel.findOneAndDelete = jest.fn();
    taskModel.find = jest.fn();
    taskModel.updateOne = jest.fn();
    taskModel.aggregate = jest.fn();
    taskModel.exists = jest.fn();

    projectModel = {
      findById: jest.fn().mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(null),
        }),
        exec: jest.fn().mockResolvedValue(null),
      }),
      findOne: jest.fn().mockImplementation(({ _id, companyId }: any) => ({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(
            companyId?.toString() === mockCompanyId.toString() && _id?.toString() === mockProjectId
              ? { _id: new Types.ObjectId(mockProjectId), name: 'Project Alpha' }
              : null,
          ),
        }),
        exec: jest.fn().mockResolvedValue(
          companyId?.toString() === mockCompanyId.toString() && _id?.toString() === mockProjectId
            ? { _id: new Types.ObjectId(mockProjectId), name: 'Project Alpha' }
            : null,
        ),
      })),
      find: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue([]),
          }),
        }),
      }),
    };

    teamModel = {
      findById: jest.fn().mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(null),
        }),
      }),
      findOne: jest.fn().mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(null),
        }),
        exec: jest.fn().mockResolvedValue(null),
      }),
      find: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue([]),
          }),
        }),
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue([]),
        }),
      }),
      exists: jest.fn(),
    };

    employeeModel = {
      find: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue([]),
      }),
      findById: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      }),
      findOne: jest.fn().mockImplementation(({ _id, companyId }: any) => ({
        exec: jest.fn().mockResolvedValue(
          companyId?.toString() === mockCompanyId.toString() && _id?.toString() === mockOwnerEmpId.toString()
            ? { _id: mockOwnerEmpId, fullName: { firstName: 'Owner', lastName: 'Emp' }, email: 'owner@emp.com' }
            : null,
        ),
      })),
      updateOne: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue({}),
      }),
    };

    emailService = {
      sendTaskAssignmentEmail: jest.fn(),
      sendInviteEmail: jest.fn().mockResolvedValue(true),
    };

    commentsService = {
      isCommentOwner: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TasksService,
        { provide: getModelToken(Task.name), useValue: taskModel },
        { provide: getModelToken(Project.name), useValue: projectModel },
        { provide: getModelToken(Team.name), useValue: teamModel },
        { provide: getModelToken(Employee.name), useValue: employeeModel },
        { provide: EmailService, useValue: emailService },
        { provide: CommentsService, useValue: commentsService },
      ],
    }).compile();

    service = module.get<TasksService>(TasksService);
  });

  describe('create (tenant scoping & relation validation)', () => {
    it('creates task with companyId when valid relations provided', async () => {
      const dto = {
        title: 'New Task',
        projectId: mockProjectId,
        assignee: mockOwnerEmpId.toString(),
      } as any;

      const result = await service.create(mockCompanyId, mockOwnerUserId, dto);
      expect(result).toEqual(
        expect.objectContaining({
          title: 'New Task',
          companyId: mockCompanyId,
          userId: mockOwnerUserId,
        }),
      );
    });

    it('throws BadRequestException when creating a task with a projectId from another company', async () => {
      const foreignProjectId = new Types.ObjectId().toString();
      const dto = {
        title: 'Cross Tenant Project Task',
        projectId: foreignProjectId,
      } as any;

      await expect(service.create(mockCompanyId, mockOwnerUserId, dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws BadRequestException when creating a task with an assignee from another company', async () => {
      const foreignAssigneeId = new Types.ObjectId().toString();
      const dto = {
        title: 'Cross Tenant Assignee Task',
        assignee: foreignAssigneeId,
      } as any;

      await expect(service.create(mockCompanyId, mockOwnerUserId, dto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('findOne (cross-tenant & scope checks)', () => {
    it('should return null when task from company A is queried under company B (Cross-Tenant isolation)', async () => {
      taskModel.findOne.mockImplementation(({ _id, companyId }: any) => ({
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(
          companyId?.toString() === mockCompanyId.toString() && _id?.toString() === mockTaskId
            ? { ...mockTask, toObject: () => ({ ...mockTask }) }
            : null,
        ),
      }));

      const result = await service.findOne(
        mockOtherCompanyId,
        mockTaskId,
        mockAdminUserId,
        'admin@example.com',
        true,
        'all',
      );

      expect(result).toBeNull();
      expect(taskModel.findOne).toHaveBeenCalledWith({
        _id: mockTaskId,
        companyId: mockOtherCompanyId,
      });
    });

    it('should return isOwner as true for system admin', async () => {
      const mockExec = {
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue({
          ...mockTask,
          toObject: () => ({ ...mockTask }),
        }),
      };
      taskModel.findOne.mockReturnValue(mockExec);

      const result = await service.findOne(mockCompanyId, mockTaskId, mockAdminUserId, 'admin@example.com', true);
      expect(result.isOwner).toBe(true);
    });

    it('should ALLOW task owner under scope own', async () => {
      const mockExec = {
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue({
          ...mockTask,
          toObject: () => ({ ...mockTask }),
        }),
      };
      taskModel.findOne.mockReturnValue(mockExec);

      const result = await service.findOne(mockCompanyId, mockTaskId, mockOwnerUserId, 'owner@example.com', false, 'own');
      expect(result).toBeDefined();
      expect(result.isOwner).toBe(true);
    });

    it('should THROW ForbiddenException when viewing task out of scope', async () => {
      const mockExec = {
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue({
          ...mockTask,
          toObject: () => ({ ...mockTask }),
        }),
      };
      taskModel.findOne.mockReturnValue(mockExec);

      await expect(
        service.findOne(mockCompanyId, mockTaskId, mockOtherUserId, 'other@example.com', false, 'own'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('findAll (scope filtering & companyId scoping)', () => {
    it('should filter tasks by owner/assignee under scope own with companyId', async () => {
      const mockQueryExec = {
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([mockTask]),
      };
      taskModel.find.mockReturnValue(mockQueryExec);

      const result = await service.findAll(mockCompanyId, mockOwnerUserId, 'owner@example.com', undefined, false, 'own');
      expect(result).toBeDefined();
      expect(taskModel.find).toHaveBeenCalledWith(
        expect.objectContaining({
          $and: expect.arrayContaining([
            { companyId: mockCompanyId },
            expect.objectContaining({
              $or: expect.arrayContaining([
                expect.objectContaining({ userId: mockOwnerUserId }),
              ]),
            }),
          ]),
        }),
      );
    });

    it('should return all tasks unconstrained for system admin with companyId', async () => {
      const mockQueryExec = {
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([mockTask]),
      };
      taskModel.find.mockReturnValue(mockQueryExec);

      const result = await service.findAll(mockCompanyId, mockOtherUserId, 'other@example.com', undefined, true, 'all');
      expect(result).toBeDefined();
      expect(taskModel.find).toHaveBeenCalledWith({ companyId: mockCompanyId });
    });

    it('should return empty list immediately when scope is none', async () => {
      const result = await service.findAll(mockCompanyId, mockOtherUserId, 'other@example.com', undefined, false, 'none');
      expect(result).toEqual([]);
      expect(taskModel.find).not.toHaveBeenCalled();
    });
  });

  describe('update & remove (scope checks & company scoping)', () => {
    it('should ALLOW system admin to update a task and scope to companyId', async () => {
      const mockExec = {
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue({
          ...mockTask,
          toObject: () => ({ ...mockTask }),
        }),
      };
      taskModel.findOne.mockReturnValue(mockExec);
      taskModel.findOneAndUpdate.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue({
          ...mockTask,
          title: 'Updated Task',
          toObject: () => ({ ...mockTask, title: 'Updated Task' }),
        }),
      });

      const result = await service.update(
        mockCompanyId,
        mockTaskId,
        { title: 'Updated Task' },
        mockAdminUserId,
        'admin@example.com',
        { name: 'Admin' },
        true,
      );

      expect(result).toBeDefined();
      expect(taskModel.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: mockTaskId, companyId: mockCompanyId },
        expect.anything(),
        { new: true },
      );
    });

    it('should THROW ForbiddenException when updating a task out of scope', async () => {
      const mockExec = {
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue({
          ...mockTask,
          toObject: () => ({ ...mockTask }),
        }),
      };
      taskModel.findOne.mockReturnValue(mockExec);

      await expect(
        service.update(mockCompanyId, mockTaskId, { title: 'New Title' }, mockOtherUserId, 'other@example.com', undefined, false, 'own'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should ALLOW task owner to delete own task under scope own', async () => {
      const mockExec = {
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue({
          ...mockTask,
          toObject: () => ({ ...mockTask }),
        }),
      };
      taskModel.findOne.mockReturnValue(mockExec);
      taskModel.findOneAndDelete.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockTask),
      });

      const result = await service.remove(mockCompanyId, mockTaskId, mockOwnerUserId, 'owner@example.com', false, 'own');
      expect(result).toBeDefined();
      expect(taskModel.findOneAndDelete).toHaveBeenCalledWith({ _id: mockTaskId, companyId: mockCompanyId });
    });

    it('should THROW ForbiddenException when deleting a task out of scope', async () => {
      const mockExec = {
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue({
          ...mockTask,
          toObject: () => ({ ...mockTask }),
        }),
      };
      taskModel.findOne.mockReturnValue(mockExec);

      await expect(
        service.remove(mockCompanyId, mockTaskId, mockOtherUserId, 'other@example.com', false, 'own'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('duplicate (tenant isolation)', () => {
    it('duplicates task keeping it in the same company', async () => {
      const mockExec = {
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue({
          ...mockTask,
          toObject: () => ({ ...mockTask }),
        }),
      };
      taskModel.findOne.mockReturnValue(mockExec);

      const result = await service.duplicate(mockCompanyId, mockTaskId, mockOwnerUserId);
      expect(result).toBeDefined();
      expect(result.companyId).toEqual(mockCompanyId);
      expect(result.title).toBe('Test Task (Copy)');
    });
  });

  describe('getActiveTimer & Timers (MC-22)', () => {
    it('scopes getActiveTimer by companyId and timerUser.email', async () => {
      const activeTimerTask = {
        _id: new Types.ObjectId(),
        companyId: mockCompanyId,
        title: 'Running Task',
        isTimerRunning: true,
        timerUser: { email: 'timer@example.com' },
        toObject: () => ({ title: 'Running Task', isTimerRunning: true }),
      };

      taskModel.findOne.mockReturnValue({
        exec: jest.fn().mockImplementation(() => Promise.resolve(activeTimerTask)),
      });

      const result = await service.getActiveTimer(mockCompanyId, 'timer@example.com');
      expect(result).toBeDefined();
      expect(taskModel.findOne).toHaveBeenCalledWith({
        isTimerRunning: true,
        'timerUser.email': 'timer@example.com',
        companyId: mockCompanyId,
      });
    });

    it('returns null when querying active timer under another company (timers are per company)', async () => {
      taskModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      const result = await service.getActiveTimer(mockOtherCompanyId, 'timer@example.com');
      expect(result).toBeNull();
      expect(taskModel.findOne).toHaveBeenCalledWith({
        isTimerRunning: true,
        'timerUser.email': 'timer@example.com',
        companyId: mockOtherCompanyId,
      });
    });

    it('startTimer only stops running timers within the SAME company', async () => {
      const mockQuery = (doc: any) => ({
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(doc),
      });

      const taskToStart = {
        ...mockTask,
        _id: new Types.ObjectId(mockTaskId),
        companyId: mockCompanyId,
        title: 'Task To Start',
        isTimerRunning: false,
        assignee: { _id: mockOwnerEmpId, email: 'timer@example.com' },
        userId: mockOwnerUserId,
      };

      // Mock finding task to start (both findOne taskModel and findOne inside service.findOne)
      taskModel.findOne.mockReturnValueOnce(mockQuery(taskToStart));
      taskModel.findOne.mockReturnValueOnce(mockQuery(taskToStart));

      // Mock finding existing active task in the same company
      const otherTaskInCompanyA = {
        ...mockTask,
        _id: new Types.ObjectId(),
        companyId: mockCompanyId,
        title: 'Other Task Company A',
        isTimerRunning: true,
        timerStartedAt: new Date(Date.now() - 3600000),
        userId: mockOwnerUserId,
        assignee: { _id: mockOwnerEmpId, email: 'timer@example.com' },
      };

      taskModel.findOne.mockReturnValueOnce(mockQuery(otherTaskInCompanyA));

      // Mock finding otherTaskInCompanyA during stopTimer (both taskModel.findOne and service.findOne)
      taskModel.findOne.mockReturnValueOnce(mockQuery(otherTaskInCompanyA));
      taskModel.findOne.mockReturnValueOnce(mockQuery(otherTaskInCompanyA));

      taskModel.findOneAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          ...taskToStart,
          isTimerRunning: true,
          toObject: () => ({ ...taskToStart, isTimerRunning: true }),
        }),
      });

      const user = { name: 'Timer User', email: 'timer@example.com' };
      const result = await service.startTimer(mockCompanyId, mockTaskId, user, mockOwnerUserId, 'timer@example.com');

      expect(result.previousTimerStopped).toBe(true);
      // The lookup for currently active timers in startTimer must filter by companyId
      expect(taskModel.findOne).toHaveBeenCalledWith({
        isTimerRunning: true,
        'timerUser.email': 'timer@example.com',
        companyId: mockCompanyId,
      });
    });
  });

  describe('getTimeline (MC-22)', () => {
    it('starts aggregation pipeline with companyId match stage ensuring isolation', async () => {
      taskModel.aggregate
        .mockReturnValueOnce({
          exec: jest.fn().mockResolvedValue([{ total: 1 }]),
        })
        .mockReturnValueOnce({
          exec: jest.fn().mockResolvedValue([
            {
              taskId: mockTaskId,
              title: 'Task A',
              timeEntry: { durationSeconds: 3600 },
            },
          ]),
        });

      const result = await service.getTimeline(mockCompanyId, mockOwnerUserId, 'user@example.com', { page: 1 });

      expect(result).toBeDefined();
      expect(result.total).toBe(1);
      expect(result.entries.length).toBe(1);

      // Verify aggregate was called with first stage matching companyId
      const firstPipelineCall = taskModel.aggregate.mock.calls[0][0];
      expect(firstPipelineCall[0]).toEqual({
        $match: {
          companyId: mockCompanyId,
          'timeEntries.user.email': 'user@example.com',
        },
      });

      const secondPipelineCall = taskModel.aggregate.mock.calls[1][0];
      expect(secondPipelineCall[0]).toEqual({
        $match: {
          companyId: mockCompanyId,
          'timeEntries.user.email': 'user@example.com',
        },
      });
    });
  });

  describe('Comments & Invites (MC-22)', () => {
    it('addComment filters task by companyId', async () => {
      taskModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ _id: new Types.ObjectId(mockTaskId), companyId: mockCompanyId }),
      });
      taskModel.findOneAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ _id: new Types.ObjectId(mockTaskId), comments: [] }),
      });

      await service.addComment(mockCompanyId, mockTaskId, { content: 'Nice task' });

      expect(taskModel.findOne).toHaveBeenCalledWith({ _id: mockTaskId, companyId: mockCompanyId });
      expect(taskModel.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: mockTaskId, companyId: mockCompanyId },
        expect.anything(),
        { new: true },
      );
    });

    it('updateComment and deleteComment filter task by companyId', async () => {
      const commentId = new Types.ObjectId().toString();
      taskModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          _id: new Types.ObjectId(mockTaskId),
          companyId: mockCompanyId,
          comments: [{ _id: new Types.ObjectId(commentId), content: 'Original' }],
        }),
      });
      taskModel.findOneAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ _id: new Types.ObjectId(mockTaskId) }),
      });
      commentsService.isCommentOwner.mockReturnValue(true);

      await service.updateComment(mockCompanyId, mockTaskId, commentId, { content: 'Updated' });
      expect(taskModel.findOne).toHaveBeenCalledWith({ _id: mockTaskId, companyId: mockCompanyId });
      expect(taskModel.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: mockTaskId, 'comments._id': commentId, companyId: mockCompanyId },
        expect.anything(),
        { new: true },
      );

      await service.deleteComment(mockCompanyId, mockTaskId, commentId);
      expect(taskModel.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: mockTaskId, companyId: mockCompanyId },
        expect.anything(),
        { new: true },
      );
    });

    it('inviteMember looks up existing employee within the company only', async () => {
      taskModel.findOne.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue({
          ...mockTask,
          _id: new Types.ObjectId(mockTaskId),
          companyId: mockCompanyId,
          userId: mockOwnerUserId,
        }),
      });
      taskModel.findOneAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ _id: new Types.ObjectId(mockTaskId), title: 'Task with invite' }),
      });

      await service.inviteMember(
        mockCompanyId,
        mockTaskId,
        'colleague@example.com',
        'Colleague',
        'Inviter',
        mockOwnerUserId,
        'owner@example.com',
        true,
      );

      expect(taskModel.findOne).toHaveBeenCalledWith({ _id: mockTaskId, companyId: mockCompanyId });
      expect(employeeModel.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          companyId: mockCompanyId,
          email: expect.anything(),
        }),
      );
      expect(taskModel.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: mockTaskId, companyId: mockCompanyId },
        expect.anything(),
        { new: true },
      );
    });

    it('verifyFileBelongsToCompany verifies file in task resources or comments attachments', async () => {
      taskModel.exists.mockResolvedValueOnce({ _id: new Types.ObjectId() });
      const url = 'https://res.cloudinary.com/demo/image/upload/sample.png';

      const result = await service.verifyFileBelongsToCompany(mockCompanyId, url);
      expect(result).toBe(true);
      expect(taskModel.exists).toHaveBeenCalledWith({
        companyId: mockCompanyId,
        $or: [{ 'resources.url': url }, { 'comments.attachments.url': url }],
      });
    });

    it('verifyFileBelongsToCompany falls back to team comments attachments', async () => {
      taskModel.exists.mockResolvedValueOnce(null);
      teamModel.exists.mockResolvedValueOnce({ _id: new Types.ObjectId() });
      const url = 'https://res.cloudinary.com/demo/image/upload/team-doc.pdf';

      const result = await service.verifyFileBelongsToCompany(mockCompanyId, url);
      expect(result).toBe(true);
      expect(teamModel.exists).toHaveBeenCalledWith({
        companyId: mockCompanyId,
        'comments.attachments.url': url,
      });
    });

    it('verifyFileBelongsToCompany returns false when url not found in task or team', async () => {
      taskModel.exists.mockResolvedValueOnce(null);
      teamModel.exists.mockResolvedValueOnce(null);
      const url = 'https://res.cloudinary.com/demo/image/upload/not-found.pdf';

      const result = await service.verifyFileBelongsToCompany(mockCompanyId, url);
      expect(result).toBe(false);
    });
  });
});
