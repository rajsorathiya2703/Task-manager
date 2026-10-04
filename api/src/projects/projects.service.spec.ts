import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { Types } from 'mongoose';
import { ProjectsService } from './projects.service';
import { Project } from './schemas/project.schema';
import { Team } from '../teams/schemas/team.schema';
import { Employee } from '../employees/schemas/employee.schema';
import { Task } from '../tasks/schemas/task.schema';

describe('ProjectsService - Authorization & Tenant Scoping (P1-09 & MC-19)', () => {
  let service: ProjectsService;
  let projectModel: any;
  let teamModel: any;
  let employeeModel: any;
  let taskModel: any;

  // Tenants
  const mockCompanyId = new Types.ObjectId();
  const mockOtherCompanyId = new Types.ObjectId();

  // Personas
  const mockAdminUserId = new Types.ObjectId().toString();
  const mockOwnerUserId = new Types.ObjectId().toString(); // User A
  const mockOtherUserId = new Types.ObjectId().toString(); // User B

  // Projects
  const mockProjectId = new Types.ObjectId().toString();     // Project Alpha (owned by User A)
  const mockProjectBetaId = new Types.ObjectId().toString(); // Project Beta (owned by User B)

  const mockProjectAlpha: any = {
    _id: new Types.ObjectId(mockProjectId),
    companyId: mockCompanyId,
    name: 'Project Alpha',
    userId: new Types.ObjectId(mockOwnerUserId),
    teamId: null,
  };

  const mockProjectBeta: any = {
    _id: new Types.ObjectId(mockProjectBetaId),
    companyId: mockCompanyId,
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
    projectModel.findOne = jest.fn();
    projectModel.findOneAndUpdate = jest.fn();
    projectModel.findOneAndDelete = jest.fn();
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
      findOne: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue({ _id: new Types.ObjectId() }),
      }),
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

  describe('create (tenant scoping & team validation)', () => {
    it('creates project with companyId', async () => {
      const dto = { name: 'Alpha Project' } as any;
      const result = await service.create(mockCompanyId, mockOwnerUserId, dto);
      expect(result).toEqual(
        expect.objectContaining({
          name: 'Alpha Project',
          companyId: mockCompanyId,
          userId: mockOwnerUserId,
        }),
      );
    });

    it('validates teamId belongs to company', async () => {
      const validTeamId = new Types.ObjectId();
      teamModel.findOne.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue({ _id: validTeamId }),
      });

      const dto = { name: 'Team Project', teamId: validTeamId.toString() } as any;
      const result = await service.create(mockCompanyId, mockOwnerUserId, dto);

      expect(teamModel.findOne).toHaveBeenCalledWith({
        _id: validTeamId,
        companyId: mockCompanyId,
      });
      expect(result).toBeDefined();
    });

    it('throws BadRequestException if team does not belong to company on create', async () => {
      const foreignTeamId = new Types.ObjectId();
      teamModel.findOne.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(null),
      });

      const dto = { name: 'Invalid Team Project', teamId: foreignTeamId.toString() } as any;
      await expect(service.create(mockCompanyId, mockOwnerUserId, dto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('findAll (scope filtering & company scoping)', () => {
    it('should ALLOW system admin to view all projects unconstrained for companyId', async () => {
      const mockQuery = {
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([mockProjectAlpha, mockProjectBeta]),
      };
      projectModel.find.mockReturnValue(mockQuery);

      const result = await service.findAll(mockCompanyId, mockAdminUserId, 'admin@example.com', true, 'all');
      expect(result).toHaveLength(2);
      expect(projectModel.find).toHaveBeenCalledWith({ companyId: mockCompanyId });
    });

    it('should filter projects by userId for User B under scope own (filtering out User A project)', async () => {
      const mockQuery = {
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([mockProjectBeta]),
      };
      projectModel.find.mockReturnValue(mockQuery);

      const result = await service.findAll(mockCompanyId, mockOtherUserId, 'other@example.com', false, 'own');
      expect(result).toHaveLength(1);
      expect(projectModel.find).toHaveBeenCalledWith(
        expect.objectContaining({
          companyId: mockCompanyId,
          $or: expect.arrayContaining([
            expect.objectContaining({ userId: mockOtherUserId }),
          ]),
        }),
      );
    });

    it('should return empty array immediately when scope is none', async () => {
      const result = await service.findAll(mockCompanyId, mockOtherUserId, 'other@example.com', false, 'none');
      expect(result).toEqual([]);
      expect(projectModel.find).not.toHaveBeenCalled();
    });
  });

  describe('findOne (record-level & cross-tenant checks)', () => {
    it('should ALLOW system admin to view any project within company', async () => {
      projectModel.findOne.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockProjectAlpha),
      });

      const result = await service.findOne(mockCompanyId, mockProjectId, mockAdminUserId, 'admin@example.com', true);
      expect(result).toBeDefined();
      expect(result?._id.toString()).toBe(mockProjectId);
      expect(projectModel.findOne).toHaveBeenCalledWith({
        _id: mockProjectId,
        companyId: mockCompanyId,
      });
    });

    it('should return null when project belongs to company A but queried under company B (Cross-Tenant isolation)', async () => {
      projectModel.findOne.mockImplementation(({ _id, companyId }: any) => ({
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(
          companyId.toString() === mockCompanyId.toString() && _id.toString() === mockProjectId
            ? mockProjectAlpha
            : null,
        ),
      }));

      const result = await service.findOne(
        mockOtherCompanyId,
        mockProjectId,
        mockAdminUserId,
        'admin@other.com',
        true,
        'all',
      );

      expect(result).toBeNull();
      expect(projectModel.findOne).toHaveBeenCalledWith({
        _id: mockProjectId,
        companyId: mockOtherCompanyId,
      });
    });

    it('should ALLOW User A to view their own project (Project Alpha) under scope own', async () => {
      projectModel.findOne.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockProjectAlpha),
      });

      const result = await service.findOne(mockCompanyId, mockProjectId, mockOwnerUserId, 'owner@example.com', false, 'own');
      expect(result).toBeDefined();
      expect(result?._id.toString()).toBe(mockProjectId);
    });

    it('should THROW ForbiddenException when User B attempts to view User A project under scope own', async () => {
      projectModel.findOne.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockProjectAlpha),
      });

      await expect(
        service.findOne(mockCompanyId, mockProjectId, mockOtherUserId, 'other@example.com', false, 'own'),
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

      projectModel.findOne.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(projectWithTeam),
      });

      // Mock user teams for User B to include teamId
      teamModel.find.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([{ _id: teamId }]),
      });

      const result = await service.findOne(mockCompanyId, mockProjectId, mockOtherUserId, 'other@example.com', false, 'team');
      expect(result).toBeDefined();
    });

    it('should THROW ForbiddenException when User B attempts to view User A project under scope team if not on team', async () => {
      projectModel.findOne.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockProjectAlpha),
      });

      await expect(
        service.findOne(mockCompanyId, mockProjectId, mockOtherUserId, 'other@example.com', false, 'team'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should THROW ForbiddenException when viewing under scope none', async () => {
      projectModel.findOne.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockProjectAlpha),
      });

      await expect(
        service.findOne(mockCompanyId, mockProjectId, mockOwnerUserId, 'owner@example.com', false, 'none'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('update (two users / two projects & team validation)', () => {
    it('should ALLOW system admin to update any project within company', async () => {
      projectModel.findOne.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockProjectAlpha),
      });
      projectModel.findOneAndUpdate.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue({ ...mockProjectAlpha, name: 'Updated Alpha' }),
      });

      const result = await service.update(
        mockCompanyId,
        mockProjectId,
        { name: 'Updated Alpha' },
        mockAdminUserId,
        'admin@example.com',
        true,
        'all',
      );

      expect(result).toBeDefined();
      expect(result?.name).toBe('Updated Alpha');
      expect(projectModel.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: mockProjectId, companyId: mockCompanyId },
        { name: 'Updated Alpha' },
        { new: true },
      );
    });

    it('should throw BadRequestException if update specifies foreign teamId', async () => {
      projectModel.findOne.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockProjectAlpha),
      });
      teamModel.findOne.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(null),
      });

      const foreignTeamId = new Types.ObjectId().toString();
      await expect(
        service.update(
          mockCompanyId,
          mockProjectId,
          { teamId: foreignTeamId } as any,
          mockOwnerUserId,
          'owner@example.com',
          false,
          'own',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should ALLOW User A to update their own Project Alpha', async () => {
      projectModel.findOne.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockProjectAlpha),
      });
      projectModel.findOneAndUpdate.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue({ ...mockProjectAlpha, name: 'Owner Updated' }),
      });

      const result = await service.update(
        mockCompanyId,
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
      projectModel.findOne.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockProjectAlpha),
      });

      await expect(
        service.update(
          mockCompanyId,
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

  describe('remove (two users / task reference check)', () => {
    it('should ALLOW system admin to delete project when no tasks reference it', async () => {
      projectModel.findOne.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockProjectAlpha),
      });
      taskModel.exists.mockResolvedValue(false);
      projectModel.findOneAndDelete.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockProjectAlpha),
      });

      const result = await service.remove(
        mockCompanyId,
        mockProjectId,
        mockAdminUserId,
        'admin@example.com',
        true,
        'all',
      );

      expect(result).toBeDefined();
      expect(taskModel.exists).toHaveBeenCalledWith({
        projectId: mockProjectId,
        companyId: mockCompanyId,
      });
      expect(projectModel.findOneAndDelete).toHaveBeenCalledWith({
        _id: mockProjectId,
        companyId: mockCompanyId,
      });
    });

    it('should throw BadRequestException when tasks in the company reference the project', async () => {
      projectModel.findOne.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockProjectAlpha),
      });
      taskModel.exists.mockResolvedValue(true);

      await expect(
        service.remove(
          mockCompanyId,
          mockProjectId,
          mockAdminUserId,
          'admin@example.com',
          true,
          'all',
        ),
      ).rejects.toThrow(BadRequestException);

      expect(projectModel.findOneAndDelete).not.toHaveBeenCalled();
    });

    it('should ALLOW User A to delete their own Project Alpha', async () => {
      projectModel.findOne.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockProjectAlpha),
      });
      taskModel.exists.mockResolvedValue(false);
      projectModel.findOneAndDelete.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockProjectAlpha),
      });

      const result = await service.remove(
        mockCompanyId,
        mockProjectId,
        mockOwnerUserId,
        'owner@example.com',
        false,
        'own',
      );

      expect(result).toBeDefined();
      expect(projectModel.findOneAndDelete).toHaveBeenCalledWith({
        _id: mockProjectId,
        companyId: mockCompanyId,
      });
    });

    it('should THROW ForbiddenException when User B attempts to delete User A Project Alpha under scope own', async () => {
      projectModel.findOne.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockProjectAlpha),
      });

      await expect(
        service.remove(mockCompanyId, mockProjectId, mockOtherUserId, 'other@example.com', false, 'own'),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
