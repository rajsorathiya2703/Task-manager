import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { Types } from 'mongoose';
import { TeamsService } from './teams.service';
import { Team } from './schemas/team.schema';
import { Task } from '../tasks/schemas/task.schema';
import { Employee } from '../employees/schemas/employee.schema';
import { CommentsService } from '../comments/comments.service';

describe('TeamsService', () => {
  let service: TeamsService;
  let teamModel: any;
  let taskModel: any;
  let employeeModel: any;
  let commentsService: any;

  const mockTeamId = new Types.ObjectId().toString();
  const mockMemberUserId = new Types.ObjectId().toString();
  const mockMemberEmpId = new Types.ObjectId();
  const mockLeadEmpId = new Types.ObjectId();
  const mockOtherUserId = new Types.ObjectId().toString();

  const mockTeam = {
    _id: new Types.ObjectId(mockTeamId),
    name: 'Frontend Team',
    description: 'UI engineering team',
    teamLead: {
      _id: mockLeadEmpId,
      email: 'lead@example.com',
      fullName: { firstName: 'Team', lastName: 'Lead' },
    },
    members: [
      {
        _id: mockMemberEmpId,
        email: 'member@example.com',
        fullName: { firstName: 'Team', lastName: 'Member' },
      },
    ],
  };

  beforeEach(async () => {
    teamModel = {
      find: jest.fn(),
      findById: jest.fn(),
      findByIdAndUpdate: jest.fn(),
      findByIdAndDelete: jest.fn(),
      findOneAndUpdate: jest.fn(),
    };

    taskModel = {
      find: jest.fn(),
    };

    employeeModel = {
      find: jest.fn(),
    };

    commentsService = {
      isCommentOwner: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TeamsService,
        { provide: getModelToken(Team.name), useValue: teamModel },
        { provide: getModelToken(Task.name), useValue: taskModel },
        { provide: getModelToken(Employee.name), useValue: employeeModel },
        { provide: CommentsService, useValue: commentsService },
      ],
    }).compile();

    service = module.get<TeamsService>(TeamsService);
  });

  describe('findOne', () => {
    it('should throw NotFoundException if id is invalid', async () => {
      await expect(service.findOne('invalid-id', mockMemberUserId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException if team does not exist', async () => {
      teamModel.findById.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue(null),
          }),
        }),
      });

      await expect(service.findOne(mockTeamId, mockMemberUserId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should ALLOW system admin to view any team without membership check', async () => {
      teamModel.findById.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue(mockTeam),
          }),
        }),
      });

      const result = await service.findOne(mockTeamId, mockOtherUserId, 'admin@example.com', true);
      expect(result).toBe(mockTeam);
    });

    it('should ALLOW team member to view team', async () => {
      teamModel.findById.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue(mockTeam),
          }),
        }),
      });

      employeeModel.find.mockReturnValue({
        exec: jest.fn().mockResolvedValue([{ _id: mockMemberEmpId }]),
      });

      const result = await service.findOne(
        mockTeamId,
        mockMemberUserId,
        'member@example.com',
        false,
      );
      expect(result).toBe(mockTeam);
    });

    it('should ALLOW team lead to view team', async () => {
      teamModel.findById.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue(mockTeam),
          }),
        }),
      });

      employeeModel.find.mockReturnValue({
        exec: jest.fn().mockResolvedValue([{ _id: mockLeadEmpId }]),
      });

      const result = await service.findOne(
        mockTeamId,
        'leadUserId',
        'lead@example.com',
        false,
      );
      expect(result).toBe(mockTeam);
    });

    it('should THROW ForbiddenException if non-admin user is NOT a member of the team', async () => {
      teamModel.findById.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue(mockTeam),
          }),
        }),
      });

      const otherEmpId = new Types.ObjectId();
      employeeModel.find.mockReturnValue({
        exec: jest.fn().mockResolvedValue([{ _id: otherEmpId }]),
      });

      await expect(
        service.findOne(mockTeamId, mockOtherUserId, 'other@example.com', false),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('getActiveTasks', () => {
    it('should THROW ForbiddenException if user is not in team', async () => {
      teamModel.findById.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue(mockTeam),
          }),
        }),
      });

      employeeModel.find.mockReturnValue({
        exec: jest.fn().mockResolvedValue([]),
      });

      await expect(
        service.getActiveTasks(mockTeamId, mockOtherUserId, 'other@example.com', false),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should ALLOW member to get active tasks', async () => {
      teamModel.findById.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue(mockTeam),
          }),
        }),
      });

      employeeModel.find.mockReturnValue({
        exec: jest.fn().mockResolvedValue([{ _id: mockMemberEmpId }]),
      });

      const mockTasks = [{ _id: 'task1', title: 'Task 1', isTimerRunning: true }];
      taskModel.find.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue(mockTasks),
          }),
        }),
      });

      const result = await service.getActiveTasks(
        mockTeamId,
        mockMemberUserId,
        'member@example.com',
        false,
      );
      expect(result).toBe(mockTasks);
    });
  });

  describe('update', () => {
    it('should THROW ForbiddenException if non-admin user is not a member', async () => {
      teamModel.findById.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue(mockTeam),
          }),
        }),
      });

      employeeModel.find.mockReturnValue({
        exec: jest.fn().mockResolvedValue([]),
      });

      await expect(
        service.update(mockTeamId, { name: 'New Name' }, mockOtherUserId, 'other@example.com', false),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should ALLOW member to update team', async () => {
      teamModel.findById.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue(mockTeam),
          }),
        }),
      });

      employeeModel.find.mockReturnValue({
        exec: jest.fn().mockResolvedValue([{ _id: mockMemberEmpId }]),
      });

      const updatedTeam = { ...mockTeam, name: 'Updated Team' };
      teamModel.findByIdAndUpdate.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue(updatedTeam),
          }),
        }),
      });

      const result = await service.update(
        mockTeamId,
        { name: 'Updated Team' },
        mockMemberUserId,
        'member@example.com',
        false,
      );
      expect(result).toBe(updatedTeam);
    });
  });

  describe('findAll', () => {
    it('should return all teams for system admin', async () => {
      teamModel.find.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue([mockTeam]),
          }),
        }),
      });

      const result = await service.findAll(mockOtherUserId, 'admin@example.com', true);
      expect(result).toEqual([mockTeam]);
      expect(teamModel.find).toHaveBeenCalledWith();
    });

    it('should return only member teams for standard user', async () => {
      employeeModel.find.mockReturnValue({
        exec: jest.fn().mockResolvedValue([{ _id: mockMemberEmpId }]),
      });

      teamModel.find.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue([mockTeam]),
          }),
        }),
      });

      const result = await service.findAll(mockMemberUserId, 'member@example.com', false);
      expect(result).toEqual([mockTeam]);
      expect(teamModel.find).toHaveBeenCalledWith(
        expect.objectContaining({
          $or: expect.any(Array),
        }),
      );
    });
  });
});
