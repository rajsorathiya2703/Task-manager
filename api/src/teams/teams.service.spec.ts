import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { Types } from 'mongoose';
import { TeamsService } from './teams.service';
import { Team } from './schemas/team.schema';
import { Task } from '../tasks/schemas/task.schema';
import { Employee } from '../employees/schemas/employee.schema';
import { CommentsService } from '../comments/comments.service';

describe('TeamsService - Authorization & Scope Filtering (P1-12 & MC-17)', () => {
  let service: TeamsService;
  let teamModel: any;
  let taskModel: any;
  let employeeModel: any;
  let commentsService: any;

  // Personas & Tenants
  const mockCompanyId = new Types.ObjectId();
  const mockOtherCompanyId = new Types.ObjectId();
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
    companyId: mockCompanyId,
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

    const mockConstructor: any = jest.fn().mockImplementation((dto) => ({
      ...dto,
      save: jest.fn().mockResolvedValue({ _id: new Types.ObjectId(), ...dto }),
    }));

    mockConstructor.find = jest.fn().mockReturnValue(mockFindChain);
    mockConstructor.findOne = jest.fn();
    mockConstructor.findById = jest.fn();
    mockConstructor.findOneAndUpdate = jest.fn();
    mockConstructor.findByIdAndUpdate = jest.fn();
    mockConstructor.findOneAndDelete = jest.fn();
    mockConstructor.findByIdAndDelete = jest.fn();

    teamModel = mockConstructor;

    taskModel = {
      find: jest.fn(),
    };

    employeeModel = {
      find: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnThis(),
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
      await expect(service.findOne(mockCompanyId, 'invalid-id', mockMemberUserId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException if team does not exist', async () => {
      teamModel.findOne.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue(null),
          }),
        }),
      });

      await expect(service.findOne(mockCompanyId, mockTeamId, mockMemberUserId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should THROW NotFoundException when a team from company A is requested under company B (Cross-Tenant isolation)', async () => {
      teamModel.findOne.mockImplementation(({ _id, companyId }: any) => ({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue(
              companyId.toString() === mockCompanyId.toString() && _id.toString() === mockTeamId
                ? mockTeam
                : null,
            ),
          }),
        }),
      }));

      await expect(
        service.findOne(mockOtherCompanyId, mockTeamId, mockAdminUserId, 'admin@b.com', true, 'all'),
      ).rejects.toThrow(NotFoundException);

      expect(teamModel.findOne).toHaveBeenCalledWith({
        _id: mockTeamId,
        companyId: mockOtherCompanyId,
      });
    });

    it('should ALLOW team lead to view team under scope own', async () => {
      teamModel.findOne.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue(mockTeam),
          }),
        }),
      });

      employeeModel.find.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([{ _id: mockLeadEmpId }]),
      });

      const result = await service.findOne(
        mockCompanyId,
        mockTeamId,
        mockLeadUserId,
        'lead@example.com',
        false,
        'own',
      );
      expect(result).toBe(mockTeam);
    });

    it('should ALLOW team member to view team under scope team', async () => {
      teamModel.findOne.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue(mockTeam),
          }),
        }),
      });

      employeeModel.find.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([{ _id: mockMemberEmpId }]),
      });

      const result = await service.findOne(
        mockCompanyId,
        mockTeamId,
        mockMemberUserId,
        'member@example.com',
        false,
        'team',
      );
      expect(result).toBe(mockTeam);
    });

    it('should THROW ForbiddenException when user NOT on Team X reads it under scope own', async () => {
      teamModel.findOne.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue(mockTeam),
          }),
        }),
      });

      employeeModel.find.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([{ _id: mockOtherEmpId }]),
      });

      await expect(
        service.findOne(mockCompanyId, mockTeamId, mockOtherUserId, 'other@example.com', false, 'own'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should THROW ForbiddenException when user NOT on Team X reads it under scope team', async () => {
      teamModel.findOne.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue(mockTeam),
          }),
        }),
      });

      employeeModel.find.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([{ _id: mockOtherEmpId }]),
      });

      await expect(
        service.findOne(mockCompanyId, mockTeamId, mockOtherUserId, 'other@example.com', false, 'team'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should ALLOW Manager-role user with all scope to read Team X even if not a member', async () => {
      teamModel.findOne.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue(mockTeam),
          }),
        }),
      });

      const result = await service.findOne(
        mockCompanyId,
        mockTeamId,
        mockOtherUserId,
        'manager@example.com',
        false,
        'all',
      );
      expect(result).toBe(mockTeam);
    });

    it('should ALLOW System Admin to read Team X without restrictions', async () => {
      teamModel.findOne.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue(mockTeam),
          }),
        }),
      });

      const result = await service.findOne(
        mockCompanyId,
        mockTeamId,
        mockAdminUserId,
        'admin@example.com',
        true,
        'all',
      );
      expect(result).toBe(mockTeam);
    });

    it('should THROW ForbiddenException when reading under scope none', async () => {
      teamModel.findOne.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue(mockTeam),
          }),
        }),
      });

      await expect(
        service.findOne(mockCompanyId, mockTeamId, mockLeadUserId, 'lead@example.com', false, 'none'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('create', () => {
    it('should create team with companyId when employees belong to the company', async () => {
      employeeModel.find.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([{ _id: mockLeadEmpId }, { _id: mockMemberEmpId }]),
      });

      const dto = {
        name: 'New Team',
        teamLead: mockLeadEmpId.toString(),
        members: [mockMemberEmpId.toString()],
      };

      const result = await service.create(mockCompanyId, dto);

      expect(employeeModel.find).toHaveBeenCalledWith({
        _id: { $in: expect.arrayContaining([mockLeadEmpId, mockMemberEmpId]) },
        companyId: mockCompanyId,
      });
      expect(result).toEqual(
        expect.objectContaining({
          name: 'New Team',
          companyId: mockCompanyId,
        }),
      );
    });

    it('should throw BadRequestException when teamLead or members do not belong to the company', async () => {
      // employeeModel finds fewer employees than requested -> mismatch
      employeeModel.find.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([{ _id: mockLeadEmpId }]), // mockMemberEmpId not found in this company
      });

      const dto = {
        name: 'Mismatch Team',
        teamLead: mockLeadEmpId.toString(),
        members: [mockMemberEmpId.toString()],
      };

      await expect(service.create(mockCompanyId, dto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('findAll', () => {
    it('should return all teams unconstrained for scope all with companyId', async () => {
      const mockQuery = {
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([mockTeam]),
      };
      teamModel.find.mockReturnValue(mockQuery);

      const result = await service.findAll(mockCompanyId, mockOtherUserId, 'manager@example.com', false, 'all');
      expect(result).toEqual([mockTeam]);
      expect(teamModel.find).toHaveBeenCalledWith({ companyId: mockCompanyId });
    });

    it('should return empty array immediately when scope is none', async () => {
      const result = await service.findAll(mockCompanyId, mockOtherUserId, 'other@example.com', false, 'none');
      expect(result).toEqual([]);
      expect(teamModel.find).not.toHaveBeenCalled();
    });

    it('should filter teams by member/lead for user under scope own within companyId', async () => {
      employeeModel.find.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([{ _id: mockLeadEmpId }]),
      });

      const mockQuery = {
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([mockTeam]),
      };
      teamModel.find.mockReturnValue(mockQuery);

      await service.findAll(mockCompanyId, mockLeadUserId, 'lead@example.com', false, 'own');

      expect(teamModel.find).toHaveBeenCalledWith(
        expect.objectContaining({
          companyId: mockCompanyId,
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
      teamModel.findOne.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue(mockTeam),
          }),
        }),
      });

      employeeModel.find.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([{ _id: mockLeadEmpId }]),
      });

      const updatedTeam = { ...mockTeam, name: 'Updated Team' };
      teamModel.findOneAndUpdate.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue(updatedTeam),
          }),
        }),
      });

      const result = await service.update(
        mockCompanyId,
        mockTeamId,
        { name: 'Updated Team' },
        mockLeadUserId,
        'lead@example.com',
        false,
        'own',
      );
      expect(result).toBe(updatedTeam);
      expect(teamModel.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: mockTeamId, companyId: mockCompanyId },
        { $set: { name: 'Updated Team' } },
        { new: true },
      );
    });

    it('should THROW BadRequestException when updating team with members from another company', async () => {
      teamModel.findOne.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue(mockTeam),
          }),
        }),
      });

      // Employee lookup fails to match member
      employeeModel.find.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([]),
      });

      await expect(
        service.update(
          mockCompanyId,
          mockTeamId,
          { members: [new Types.ObjectId().toString()] },
          mockLeadUserId,
          'lead@example.com',
          false,
          'all',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should THROW ForbiddenException when user NOT on Team X updates it under scope own', async () => {
      teamModel.findOne.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue(mockTeam),
          }),
        }),
      });

      employeeModel.find.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([{ _id: mockOtherEmpId }]),
      });

      await expect(
        service.update(
          mockCompanyId,
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
      teamModel.findOneAndUpdate.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue(updatedTeam),
          }),
        }),
      });

      const result = await service.update(
        mockCompanyId,
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
      teamModel.findOne.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue(mockTeam),
          }),
        }),
      });

      employeeModel.find.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([{ _id: mockLeadEmpId }]),
      });

      teamModel.findOneAndDelete.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockTeam),
      });

      const result = await service.remove(
        mockCompanyId,
        mockTeamId,
        mockLeadUserId,
        'lead@example.com',
        false,
        'own',
      );
      expect(result).toBe(mockTeam);
      expect(teamModel.findOneAndDelete).toHaveBeenCalledWith({
        _id: mockTeamId,
        companyId: mockCompanyId,
      });
    });

    it('should THROW ForbiddenException when user NOT on Team X deletes it under scope own', async () => {
      teamModel.findOne.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue(mockTeam),
          }),
        }),
      });

      employeeModel.find.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([{ _id: mockOtherEmpId }]),
      });

      await expect(
        service.remove(mockCompanyId, mockTeamId, mockOtherUserId, 'other@example.com', false, 'own'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('getActiveTasks', () => {
    it('should ALLOW team member to get active tasks scoped to companyId', async () => {
      teamModel.findOne.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue(mockTeam),
          }),
        }),
      });

      employeeModel.find.mockReturnValue({
        select: jest.fn().mockReturnThis(),
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
        mockCompanyId,
        mockTeamId,
        mockMemberUserId,
        'member@example.com',
        false,
        'team',
      );
      expect(result).toBe(mockTasks);
      expect(taskModel.find).toHaveBeenCalledWith(
        expect.objectContaining({
          companyId: mockCompanyId,
          assignee: { $in: mockTeam.members },
          isTimerRunning: true,
        }),
      );
    });

    it('should THROW ForbiddenException when user NOT on Team X gets active tasks under scope own', async () => {
      teamModel.findOne.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue(mockTeam),
          }),
        }),
      });

      employeeModel.find.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([{ _id: mockOtherEmpId }]),
      });

      await expect(
        service.getActiveTasks(
          mockCompanyId,
          mockTeamId,
          mockOtherUserId,
          'other@example.com',
          false,
          'own',
        ),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('comments', () => {
    it('addComment filters by companyId', async () => {
      teamModel.findOneAndUpdate.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue(mockTeam),
          }),
        }),
      });

      const result = await service.addComment(
        mockCompanyId,
        mockTeamId,
        { content: 'Hello' },
        mockLeadUserId,
        'lead@example.com',
      );
      expect(result).toBe(mockTeam);
      expect(teamModel.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: mockTeamId, companyId: mockCompanyId },
        { $push: { comments: { content: 'Hello' } } },
        { new: true },
      );
    });

    it('updateComment checks companyId and comment ownership', async () => {
      const teamWithComment = {
        ...mockTeam,
        comments: [{ _id: 'comm-1', content: 'Old', user: { userId: mockLeadUserId } }],
      };
      teamModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(teamWithComment),
      });
      commentsService.isCommentOwner.mockReturnValue(true);
      teamModel.findOneAndUpdate.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue(teamWithComment),
          }),
        }),
      });

      const result = await service.updateComment(
        mockCompanyId,
        mockTeamId,
        'comm-1',
        { content: 'New' },
        mockLeadUserId,
        'lead@example.com',
      );
      expect(result).toBe(teamWithComment);
      expect(teamModel.findOne).toHaveBeenCalledWith({ _id: mockTeamId, companyId: mockCompanyId });
      expect(teamModel.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: mockTeamId, companyId: mockCompanyId, 'comments._id': 'comm-1' },
        { $set: { 'comments.$.content': 'New' } },
        { new: true },
      );
    });

    it('deleteComment checks companyId and comment ownership', async () => {
      const teamWithComment = {
        ...mockTeam,
        comments: [{ _id: 'comm-1', content: 'Old', user: { userId: mockLeadUserId } }],
      };
      teamModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(teamWithComment),
      });
      commentsService.isCommentOwner.mockReturnValue(true);
      teamModel.findOneAndUpdate.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue(teamWithComment),
          }),
        }),
      });

      const result = await service.deleteComment(
        mockCompanyId,
        mockTeamId,
        'comm-1',
        mockLeadUserId,
        'lead@example.com',
      );
      expect(result).toBe(teamWithComment);
      expect(teamModel.findOne).toHaveBeenCalledWith({ _id: mockTeamId, companyId: mockCompanyId });
      expect(teamModel.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: mockTeamId, companyId: mockCompanyId },
        { $pull: { comments: { _id: 'comm-1' } } },
        { new: true },
      );
    });
  });
});
