import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { ProjectsService } from './projects.service';
import { Project } from './schemas/project.schema';
import { Team } from '../teams/schemas/team.schema';
import { Employee } from '../employees/schemas/employee.schema';
import { Task } from '../tasks/schemas/task.schema';

describe('ProjectsService - Authorization & Role-based Access (P1-09)', () => {
  let service: ProjectsService;
  let projectModel: any;
  let teamModel: any;
  let employeeModel: any;
  let taskModel: any;

  // Personas
  const mockAdminUserId = new Types.ObjectId().toString();
  const mockOwnerUserId = new Types.ObjectId().toString(); // User A
  const mockOtherUserId = new Types.ObjectId().toString(); // User B

  // Projects
  const mockProjectId = new Types.ObjectId().toString();     // Project Alpha (owned by User A)
  const mockProjectBetaId = new Types.ObjectId().toString(); // Project Beta (owned by User B)

  const mockProjectAlpha: any = {
    _id: new Types.ObjectId(mockProjectId),
    name: 'Project Alpha',
    userId: new Types.ObjectId(mockOwnerUserId),
    teamId: null,
  };

  const mockProjectBeta: any = {
    _id: new Types.ObjectId(mockProjectBetaId),
    name: 'Project Beta',
    userId: new Types.ObjectId(mockOtherUserId),
    teamId: null,
  };

  beforeEach(async () => {
    projectModel = function (dto: any) {
      return {
        ...dto,
        save: jest.fn().mockResolvedValue(dto),
      };
    };
    projectModel.findById = jest.fn();
    projectModel.findByIdAndUpdate = jest.fn();
    projectModel.findByIdAndDelete = jest.fn();
    projectModel.find = jest.fn();

    const mockTeamQuery = {
      select: jest.fn().mockReturnThis(),
      lean: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([]),
    };

    teamModel = {
      find: jest.fn().mockReturnValue(mockTeamQuery),
      findById: jest.fn(),
    };

    employeeModel = {
      find: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue([]),
      }),
      findById: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      }),
    };

    taskModel = {
      distinct: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue([]),
      }),
      exists: jest.fn().mockResolvedValue(false),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectsService,
        { provide: getModelToken(Project.name), useValue: projectModel },
        { provide: getModelToken(Team.name), useValue: teamModel },
        { provide: getModelToken(Employee.name), useValue: employeeModel },
        { provide: getModelToken(Task.name), useValue: taskModel },
      ],
    }).compile();

    service = module.get<ProjectsService>(ProjectsService);
  });

  describe('findAll (scope filtering)', () => {
    it('should ALLOW system admin to view all projects unconstrained', async () => {
      const mockQuery = {
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([mockProjectAlpha, mockProjectBeta]),
      };
      projectModel.find.mockReturnValue(mockQuery);

      const result = await service.findAll(mockAdminUserId, 'admin@example.com', true, 'all');
      expect(result).toHaveLength(2);
      expect(projectModel.find).toHaveBeenCalledWith({});
    });

    it('should filter projects by userId for User B under scope own (filtering out User A project)', async () => {
      const mockQuery = {
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([mockProjectBeta]),
      };
      projectModel.find.mockReturnValue(mockQuery);

      const result = await service.findAll(mockOtherUserId, 'other@example.com', false, 'own');
      expect(result).toHaveLength(1);
      expect(projectModel.find).toHaveBeenCalledWith(
        expect.objectContaining({
          $or: expect.arrayContaining([
            expect.objectContaining({ userId: mockOtherUserId }),
          ]),
        }),
      );
    });

    it('should return empty array immediately when scope is none', async () => {
      const result = await service.findAll(mockOtherUserId, 'other@example.com', false, 'none');
      expect(result).toEqual([]);
      expect(projectModel.find).not.toHaveBeenCalled();
    });
  });

  describe('findOne (two users / two projects record-level checks)', () => {
    it('should ALLOW system admin to view any project', async () => {
      projectModel.findById.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockProjectAlpha),
      });

      const result = await service.findOne(mockProjectId, mockAdminUserId, 'admin@example.com', true);
      expect(result).toBeDefined();
      expect(result?._id.toString()).toBe(mockProjectId);
    });

    it('should ALLOW User A to view their own project (Project Alpha) under scope own', async () => {
      projectModel.findById.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockProjectAlpha),
      });

      const result = await service.findOne(mockProjectId, mockOwnerUserId, 'owner@example.com', false, 'own');
      expect(result).toBeDefined();
      expect(result?._id.toString()).toBe(mockProjectId);
    });

    it('should THROW ForbiddenException when User B attempts to view User A project under scope own', async () => {
      projectModel.findById.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockProjectAlpha),
      });

      await expect(
        service.findOne(mockProjectId, mockOtherUserId, 'other@example.com', false, 'own'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should ALLOW User B to view User A project under scope team when User B belongs to project team', async () => {
      const teamId = new Types.ObjectId();
      const projectWithTeam = {
        ...mockProjectAlpha,
        teamId: {
          _id: teamId,
          members: [new Types.ObjectId()],
          teamLead: null,
        },
      };

      projectModel.findById.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(projectWithTeam),
      });

      // Mock user teams for User B to include teamId
      teamModel.find.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([{ _id: teamId }]),
      });

      const result = await service.findOne(mockProjectId, mockOtherUserId, 'other@example.com', false, 'team');
      expect(result).toBeDefined();
    });

    it('should THROW ForbiddenException when User B attempts to view User A project under scope team if not on team', async () => {
      projectModel.findById.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockProjectAlpha),
      });

      await expect(
        service.findOne(mockProjectId, mockOtherUserId, 'other@example.com', false, 'team'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should THROW ForbiddenException when viewing under scope none', async () => {
      projectModel.findById.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockProjectAlpha),
      });

      await expect(
        service.findOne(mockProjectId, mockOwnerUserId, 'owner@example.com', false, 'none'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('update (two users / two projects)', () => {
    it('should ALLOW system admin to update any project', async () => {
      projectModel.findById.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockProjectAlpha),
      });
      projectModel.findByIdAndUpdate.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue({ ...mockProjectAlpha, name: 'Updated Alpha' }),
      });

      const result = await service.update(
        mockProjectId,
        { name: 'Updated Alpha' },
        mockAdminUserId,
        'admin@example.com',
        true,
        'all',
      );

      expect(result).toBeDefined();
      expect(result?.name).toBe('Updated Alpha');
    });

    it('should ALLOW User A to update their own Project Alpha', async () => {
      projectModel.findById.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockProjectAlpha),
      });
      projectModel.findByIdAndUpdate.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue({ ...mockProjectAlpha, name: 'Owner Updated' }),
      });

      const result = await service.update(
        mockProjectId,
        { name: 'Owner Updated' },
        mockOwnerUserId,
        'owner@example.com',
        false,
        'own',
      );

      expect(result).toBeDefined();
      expect(result?.name).toBe('Owner Updated');
    });

    it('should THROW ForbiddenException when User B attempts to update User A Project Alpha under scope own', async () => {
      projectModel.findById.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockProjectAlpha),
      });

      await expect(
        service.update(
          mockProjectId,
          { name: 'Hacked Title' },
          mockOtherUserId,
          'other@example.com',
          false,
          'own',
        ),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('remove (two users / two projects)', () => {
    it('should ALLOW system admin to delete any project', async () => {
      projectModel.findById.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockProjectAlpha),
      });
      projectModel.findByIdAndDelete.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockProjectAlpha),
      });

      const result = await service.remove(
        mockProjectId,
        mockAdminUserId,
        'admin@example.com',
        true,
        'all',
      );

      expect(result).toBeDefined();
      expect(projectModel.findByIdAndDelete).toHaveBeenCalledWith(mockProjectId);
    });

    it('should ALLOW User A to delete their own Project Alpha', async () => {
      projectModel.findById.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockProjectAlpha),
      });
      projectModel.findByIdAndDelete.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockProjectAlpha),
      });

      const result = await service.remove(
        mockProjectId,
        mockOwnerUserId,
        'owner@example.com',
        false,
        'own',
      );

      expect(result).toBeDefined();
      expect(projectModel.findByIdAndDelete).toHaveBeenCalledWith(mockProjectId);
    });

    it('should THROW ForbiddenException when User B attempts to delete User A Project Alpha under scope own', async () => {
      projectModel.findById.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockProjectAlpha),
      });

      await expect(
        service.remove(mockProjectId, mockOtherUserId, 'other@example.com', false, 'own'),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
