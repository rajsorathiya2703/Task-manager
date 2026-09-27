import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { Types } from 'mongoose';
import { TeamsService } from './teams.service';
import { Team } from './schemas/team.schema';
import { Task } from '../tasks/schemas/task.schema';
import { Employee } from '../employees/schemas/employee.schema';
import { CommentsService } from '../comments/comments.service';

describe('TeamsService - Authorization & Scope Filtering (P1-12)', () => {
  let service: TeamsService;
  let teamModel: any;
  let taskModel: any;
  let employeeModel: any;
  let commentsService: any;

  // Personas
  const mockTeamId = new Types.ObjectId().toString(); // Team X
  const mockLeadUserId = new Types.ObjectId().toString();
  const mockLeadEmpId = new Types.ObjectId();

  const mockMemberUserId = new Types.ObjectId().toString();
  const mockMemberEmpId = new Types.ObjectId();

  const mockOtherUserId = new Types.ObjectId().toString(); // Not on Team X
  const mockOtherEmpId = new Types.ObjectId();

  const mockAdminUserId = new Types.ObjectId().toString();

  const mockTeam = {
    _id: new Types.ObjectId(mockTeamId),
    name: 'Team X',
    description: 'Frontend engineering team',
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
    const mockFindChain = {
      populate: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      lean: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([]),
    };

    teamModel = {
      find: jest.fn().mockReturnValue(mockFindChain),
      findById: jest.fn(),
      findByIdAndUpdate: jest.fn(),
      findByIdAndDelete: jest.fn(),
      findOneAndUpdate: jest.fn(),
    };

    taskModel = {
      find: jest.fn(),
    };

    employeeModel = {
      find: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue([]),
      }),
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

    it('should ALLOW team lead to view team under scope own', async () => {
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
        mockLeadUserId,
        'lead@example.com',
        false,
        'own',
      );
      expect(result).toBe(mockTeam);
    });

    it('should ALLOW team member to view team under scope team', async () => {
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
        'team',
      );
      expect(result).toBe(mockTeam);
    });

    it('should THROW ForbiddenException when user NOT on Team X reads it under scope own', async () => {
      teamModel.findById.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue(mockTeam),
          }),
        }),
      });

      employeeModel.find.mockReturnValue({
        exec: jest.fn().mockResolvedValue([{ _id: mockOtherEmpId }]),
      });

      await expect(
        service.findOne(mockTeamId, mockOtherUserId, 'other@example.com', false, 'own'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should THROW ForbiddenException when user NOT on Team X reads it under scope team', async () => {
      teamModel.findById.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue(mockTeam),
          }),
        }),
      });

      employeeModel.find.mockReturnValue({
        exec: jest.fn().mockResolvedValue([{ _id: mockOtherEmpId }]),
      });

      await expect(
        service.findOne(mockTeamId, mockOtherUserId, 'other@example.com', false, 'team'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should ALLOW Manager-role user with all scope to read Team X even if not a member', async () => {
      teamModel.findById.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue(mockTeam),
          }),
        }),
      });

      const result = await service.findOne(
        mockTeamId,
        mockOtherUserId,
        'manager@example.com',
        false,
        'all',
      );
      expect(result).toBe(mockTeam);
    });

    it('should ALLOW System Admin to read Team X without restrictions', async () => {
      teamModel.findById.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue(mockTeam),
          }),
        }),
      });

      const result = await service.findOne(
        mockTeamId,
        mockAdminUserId,
        'admin@example.com',
        true,
        'all',
      );
      expect(result).toBe(mockTeam);
    });

    it('should THROW ForbiddenException when reading under scope none', async () => {
      teamModel.findById.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue(mockTeam),
          }),
        }),
      });

      await expect(
        service.findOne(mockTeamId, mockLeadUserId, 'lead@example.com', false, 'none'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('findAll', () => {
    it('should return all teams unconstrained for scope all', async () => {
      const mockQuery = {
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([mockTeam]),
      };
      teamModel.find.mockReturnValue(mockQuery);

      const result = await service.findAll(mockOtherUserId, 'manager@example.com', false, 'all');
      expect(result).toEqual([mockTeam]);
      expect(teamModel.find).toHaveBeenCalledWith({});
    });

    it('should return empty array immediately when scope is none', async () => {
      const result = await service.findAll(mockOtherUserId, 'other@example.com', false, 'none');
      expect(result).toEqual([]);
      expect(teamModel.find).not.toHaveBeenCalled();
    });

    it('should filter teams by member/lead for user under scope own', async () => {
      employeeModel.find.mockReturnValue({
        exec: jest.fn().mockResolvedValue([{ _id: mockLeadEmpId }]),
      });

      const mockQuery = {
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([mockTeam]),
      };
      teamModel.find.mockReturnValue(mockQuery);

      await service.findAll(mockLeadUserId, 'lead@example.com', false, 'own');

      expect(teamModel.find).toHaveBeenCalledWith(
        expect.objectContaining({
          $or: expect.arrayContaining([
            expect.objectContaining({ members: expect.any(Object) }),
            expect.objectContaining({ teamLead: expect.any(Object) }),
          ]),
        }),
      );
    });
  });

  describe('update', () => {
    it('should ALLOW team lead to update Team X under scope own', async () => {
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
        mockLeadUserId,
        'lead@example.com',
        false,
        'own',
      );
      expect(result).toBe(updatedTeam);
    });

    it('should THROW ForbiddenException when user NOT on Team X updates it under scope own', async () => {
      teamModel.findById.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue(mockTeam),
          }),
        }),
      });

      employeeModel.find.mockReturnValue({
        exec: jest.fn().mockResolvedValue([{ _id: mockOtherEmpId }]),
      });

      await expect(
        service.update(
          mockTeamId,
          { name: 'Hacked Team' },
          mockOtherUserId,
          'other@example.com',
          false,
          'own',
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should ALLOW Manager with scope all to update Team X', async () => {
      const updatedTeam = { ...mockTeam, name: 'Manager Updated' };
      teamModel.findByIdAndUpdate.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue(updatedTeam),
          }),
        }),
      });

      const result = await service.update(
        mockTeamId,
        { name: 'Manager Updated' },
        mockOtherUserId,
        'manager@example.com',
        false,
        'all',
      );
      expect(result).toBe(updatedTeam);
    });
  });

  describe('remove', () => {
    it('should ALLOW team lead to delete Team X under scope own', async () => {
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

      teamModel.findByIdAndDelete.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockTeam),
      });

      const result = await service.remove(
        mockTeamId,
        mockLeadUserId,
        'lead@example.com',
        false,
        'own',
      );
      expect(result).toBe(mockTeam);
      expect(teamModel.findByIdAndDelete).toHaveBeenCalledWith(mockTeamId);
    });

    it('should THROW ForbiddenException when user NOT on Team X deletes it under scope own', async () => {
      teamModel.findById.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue(mockTeam),
          }),
        }),
      });

      employeeModel.find.mockReturnValue({
        exec: jest.fn().mockResolvedValue([{ _id: mockOtherEmpId }]),
      });

      await expect(
        service.remove(mockTeamId, mockOtherUserId, 'other@example.com', false, 'own'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('getActiveTasks', () => {
    it('should ALLOW team member to get active tasks under scope team', async () => {
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
        'team',
      );
      expect(result).toBe(mockTasks);
    });

    it('should THROW ForbiddenException when user NOT on Team X gets active tasks under scope own', async () => {
      teamModel.findById.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue(mockTeam),
          }),
        }),
      });

      employeeModel.find.mockReturnValue({
        exec: jest.fn().mockResolvedValue([{ _id: mockOtherEmpId }]),
      });

      await expect(
        service.getActiveTasks(
          mockTeamId,
          mockOtherUserId,
          'other@example.com',
          false,
          'own',
        ),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
