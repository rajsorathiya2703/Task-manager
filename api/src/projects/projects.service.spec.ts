import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { ProjectsService } from './projects.service';
import { Project } from './schemas/project.schema';
import { Team } from '../teams/schemas/team.schema';
import { Employee } from '../employees/schemas/employee.schema';
import { Task } from '../tasks/schemas/task.schema';

describe('ProjectsService - Authorization & Role-based Access', () => {
  let service: ProjectsService;
  let projectModel: any;
  let teamModel: any;
  let employeeModel: any;
  let taskModel: any;

  const mockAdminUserId = new Types.ObjectId().toString();
  const mockOwnerUserId = new Types.ObjectId().toString();
  const mockOtherUserId = new Types.ObjectId().toString();

  const mockProjectId = new Types.ObjectId().toString();

  const mockProject: any = {
    _id: new Types.ObjectId(mockProjectId),
    name: 'Project Alpha',
    userId: new Types.ObjectId(mockOwnerUserId),
    members: [],
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

    teamModel = {
      find: jest.fn(),
      findById: jest.fn(),
    };

    employeeModel = {
      find: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue([]),
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

  describe('findAll', () => {
    it('should ALLOW system admin to view all projects', async () => {
      const mockQuery = {
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([mockProject]),
      };
      projectModel.find.mockReturnValue(mockQuery);

      const result = await service.findAll(mockAdminUserId, 'admin@example.com', true);
      expect(result).toHaveLength(1);
      expect(projectModel.find).toHaveBeenCalledWith();
    });
  });

  describe('findOne', () => {
    it('should ALLOW system admin to view any project without team/member restrictions', async () => {
      projectModel.findById.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockProject),
      });

      const result = await service.findOne(mockProjectId, mockAdminUserId, 'admin@example.com', true);
      expect(result).toBeDefined();
      expect(result?._id.toString()).toBe(mockProjectId);
    });

    it('should THROW ForbiddenException when regular user does not have access', async () => {
      projectModel.findById.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockProject),
      });

      await expect(
        service.findOne(mockProjectId, mockOtherUserId, 'other@example.com', false),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('update', () => {
    it('should ALLOW system admin to update any project', async () => {
      projectModel.findById.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockProject),
      });
      projectModel.findByIdAndUpdate.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue({ ...mockProject, name: 'Updated Alpha' }),
      });

      const result = await service.update(
        mockProjectId,
        { name: 'Updated Alpha' },
        mockAdminUserId,
        'admin@example.com',
        true, // isSystemAdmin
      );

      expect(result).toBeDefined();
      expect(result?.name).toBe('Updated Alpha');
    });

    it('should ALLOW project owner to update project details', async () => {
      projectModel.findById.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockProject),
      });
      projectModel.findByIdAndUpdate.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue({ ...mockProject, name: 'Owner Updated' }),
      });

      const result = await service.update(
        mockProjectId,
        { name: 'Owner Updated' },
        mockOwnerUserId,
        'owner@example.com',
        false,
      );

      expect(result).toBeDefined();
      expect(result?.name).toBe('Owner Updated');
    });
  });

  describe('remove', () => {
    it('should ALLOW system admin to delete any project', async () => {
      projectModel.findById.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockProject),
      });
      projectModel.findByIdAndDelete.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockProject),
      });

      const result = await service.remove(
        mockProjectId,
        mockAdminUserId,
        'admin@example.com',
        true, // isSystemAdmin
      );

      expect(result).toBeDefined();
      expect(projectModel.findByIdAndDelete).toHaveBeenCalledWith(mockProjectId);
    });

    it('should ALLOW project owner to delete their project', async () => {
      projectModel.findById.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockProject),
      });
      projectModel.findByIdAndDelete.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockProject),
      });

      const result = await service.remove(
        mockProjectId,
        mockOwnerUserId,
        'owner@example.com',
        false,
      );

      expect(result).toBeDefined();
      expect(projectModel.findByIdAndDelete).toHaveBeenCalledWith(mockProjectId);
    });

    it('should THROW ForbiddenException when regular user attempts to delete project created by someone else', async () => {
      projectModel.findById.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue({
          ...mockProject,
          members: [{ email: 'other@example.com' }], // has read access, but is not owner
        }),
      });

      await expect(
        service.remove(mockProjectId, mockOtherUserId, 'other@example.com', false),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
