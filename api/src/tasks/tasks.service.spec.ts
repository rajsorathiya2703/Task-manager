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

describe('TasksService - Authorization & Role-based Access', () => {
  let service: TasksService;
  let taskModel: any;
  let projectModel: any;
  let teamModel: any;
  let employeeModel: any;
  let emailService: any;
  let commentsService: any;

  const mockAdminUserId = new Types.ObjectId().toString();
  const mockOwnerUserId = new Types.ObjectId().toString();
  const mockOtherUserId = new Types.ObjectId().toString();

  const mockOwnerEmpId = new Types.ObjectId();
  const mockOtherEmpId = new Types.ObjectId();

  const mockTaskId = new Types.ObjectId().toString();
  const mockProjectId = new Types.ObjectId().toString();

  const mockTask: any = {
    _id: new Types.ObjectId(mockTaskId),
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
    taskModel.find = jest.fn();
    taskModel.findOne = jest.fn();
    taskModel.updateOne = jest.fn();

    projectModel = {
      findById: jest.fn(),
    };

    teamModel = {
      findById: jest.fn(),
    };

    employeeModel = {
      find: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue([]),
      }),
      findById: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      }),
      findOne: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
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

  describe('remove', () => {
    it('should ALLOW system admin to delete a task created by another user', async () => {
      taskModel.findByIdAndDelete.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockTask),
      });

      const result = await service.remove(mockTaskId, mockAdminUserId, 'admin@example.com', true);
      expect(result).toBeDefined();
      expect(taskModel.findByIdAndDelete).toHaveBeenCalledWith(mockTaskId);
    });

    it('should ALLOW task owner to delete their own task', async () => {
      taskModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockTask),
      });
      taskModel.findByIdAndDelete.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockTask),
      });

      const result = await service.remove(mockTaskId, mockOwnerUserId, 'owner@example.com', false);
      expect(result).toBeDefined();
      expect(taskModel.findByIdAndDelete).toHaveBeenCalledWith(mockTaskId);
    });

    it('should THROW ForbiddenException when regular user attempts to delete someone else task without lead role', async () => {
      taskModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockTask),
      });
      projectModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(
        service.remove(mockTaskId, mockOtherUserId, 'other@example.com', false),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('update (modifying task dates)', () => {
    it('should ALLOW system admin to modify startDate and dueDate even if not owner', async () => {
      const mockExec = {
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue({
          ...mockTask,
          toObject: () => ({ ...mockTask }),
        }),
      };
      taskModel.findById.mockReturnValue(mockExec);
      taskModel.findByIdAndUpdate.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue({
          ...mockTask,
          startDate: '2026-09-02T00:00:00.000Z',
          toObject: () => ({ ...mockTask }),
        }),
      });

      const result = await service.update(
        mockTaskId,
        { startDate: '2026-09-02T00:00:00.000Z' },
        mockAdminUserId,
        'admin@example.com',
        { name: 'Admin' },
        true, // isSystemAdmin: true
      );

      expect(result).toBeDefined();
      expect((result as any).isOwner).toBe(true);
    });

    it('should ALLOW task owner to modify dates', async () => {
      const mockExec = {
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue({
          ...mockTask,
          toObject: () => ({ ...mockTask }),
        }),
      };
      taskModel.findById.mockReturnValue(mockExec);
      taskModel.findByIdAndUpdate.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue({
          ...mockTask,
          dueDate: '2026-09-15T00:00:00.000Z',
          toObject: () => ({ ...mockTask }),
        }),
      });

      const result = await service.update(
        mockTaskId,
        { dueDate: '2026-09-15T00:00:00.000Z' },
        mockOwnerUserId,
        'owner@example.com',
        { name: 'Owner' },
        false,
      );

      expect(result).toBeDefined();
    });
  });

  describe('inviteMember', () => {
    it('should ALLOW system admin to invite a member to any task', async () => {
      const mockExec = {
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue({
          ...mockTask,
          toObject: () => ({ ...mockTask }),
        }),
      };
      taskModel.findById.mockReturnValue(mockExec);
      taskModel.findByIdAndUpdate.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue({
          ...mockTask,
          toObject: () => ({ ...mockTask }),
        }),
      });

      const result = await service.inviteMember(
        mockTaskId,
        'new@example.com',
        'New Member',
        'Admin',
        mockAdminUserId,
        'admin@example.com',
        true, // isSystemAdmin
      );

      expect(result).toBeDefined();
    });

    it('should ALLOW task owner to invite a member', async () => {
      const mockExec = {
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue({
          ...mockTask,
          toObject: () => ({ ...mockTask }),
        }),
      };
      taskModel.findById.mockReturnValue(mockExec);
      taskModel.findByIdAndUpdate.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue({
          ...mockTask,
          toObject: () => ({ ...mockTask }),
        }),
      });

      const result = await service.inviteMember(
        mockTaskId,
        'new@example.com',
        'New Member',
        'Owner',
        mockOwnerUserId,
        'owner@example.com',
        false,
      );

      expect(result).toBeDefined();
    });
  });

  describe('findOne', () => {
    it('should return isOwner as true for system admin', async () => {
      const mockExec = {
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue({
          ...mockTask,
          toObject: () => ({ ...mockTask }),
        }),
      };
      taskModel.findById.mockReturnValue(mockExec);

      const result = await service.findOne(mockTaskId, mockAdminUserId, 'admin@example.com', true);
      expect(result.isOwner).toBe(true);
    });
  });
});
