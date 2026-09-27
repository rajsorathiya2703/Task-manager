import { Reflector } from '@nestjs/core';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { ACCESS_REQUIREMENT_KEY } from '../access/decorators/require-access.decorator';

describe('TasksController (P1-05 — Tasks Controller PBAC)', () => {
  let controller: TasksController;
  let tasksService: jest.Mocked<TasksService>;
  let cloudinaryService: jest.Mocked<CloudinaryService>;
  const reflector = new Reflector();

  beforeEach(() => {
    tasksService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
      getTimeline: jest.fn(),
      getActiveTimer: jest.fn(),
      inviteMember: jest.fn(),
      duplicate: jest.fn(),
      startTimer: jest.fn(),
      stopTimer: jest.fn(),
      addComment: jest.fn(),
      updateComment: jest.fn(),
      deleteComment: jest.fn(),
    } as any;

    cloudinaryService = {
      uploadFile: jest.fn(),
      extractPublicId: jest.fn(),
      getFileStream: jest.fn(),
    } as any;

    controller = new TasksController(tasksService, cloudinaryService);
  });

  describe('Route @RequireAccess metadata', () => {
    it('decorates create with { module: "tasks", action: "create" }', () => {
      const meta = reflector.get(ACCESS_REQUIREMENT_KEY, controller.create);
      expect(meta).toEqual({ module: 'tasks', action: 'create' });
    });

    it('decorates findAll with { module: "tasks", action: "read" }', () => {
      const meta = reflector.get(ACCESS_REQUIREMENT_KEY, controller.findAll);
      expect(meta).toEqual({ module: 'tasks', action: 'read' });
    });

    it('decorates getTimeline with { module: "timeline", action: "read" }', () => {
      const meta = reflector.get(ACCESS_REQUIREMENT_KEY, controller.getTimeline);
      expect(meta).toEqual({ module: 'timeline', action: 'read' });
    });

    it('decorates findOne with { module: "tasks", action: "read" }', () => {
      const meta = reflector.get(ACCESS_REQUIREMENT_KEY, controller.findOne);
      expect(meta).toEqual({ module: 'tasks', action: 'read' });
    });

    it('decorates update with { module: "tasks", action: "update" }', () => {
      const meta = reflector.get(ACCESS_REQUIREMENT_KEY, controller.update);
      expect(meta).toEqual({ module: 'tasks', action: 'update' });
    });

    it('decorates remove with { module: "tasks", action: "delete" }', () => {
      const meta = reflector.get(ACCESS_REQUIREMENT_KEY, controller.remove);
      expect(meta).toEqual({ module: 'tasks', action: 'delete' });
    });

    it('decorates inviteMember with { module: "tasks", action: "update" }', () => {
      const meta = reflector.get(ACCESS_REQUIREMENT_KEY, controller.inviteMember);
      expect(meta).toEqual({ module: 'tasks', action: 'update' });
    });
  });

  describe('Parameter forwarding (replacing hardcoded true/"all" with resolved scope)', () => {
    it('forwards non-admin isSystemAdmin=false and req.access.tasks.scope on remove()', async () => {
      const req = {
        user: { id: 'user-emp-1', email: 'emp@test.com', is_system_admin: false },
        access: {
          tasks: { scope: 'own' },
        },
      };

      await controller.remove(req as any, 'task-123');

      expect(tasksService.remove).toHaveBeenCalledWith(
        'task-123',
        'user-emp-1',
        'emp@test.com',
        false, // was previously hardcoded true!
        'own', // was previously hardcoded 'all'!
      );
    });

    it('forwards non-admin isSystemAdmin=false and team scope on findAll()', async () => {
      const req = {
        user: { id: 'user-lead-1', email: 'lead@test.com', is_system_admin: false },
        access: {
          tasks: { scope: 'team' },
        },
      };

      await controller.findAll(req as any, 'proj-1');

      expect(tasksService.findAll).toHaveBeenCalledWith(
        'user-lead-1',
        'lead@test.com',
        'proj-1',
        false, // was hardcoded true
        'team', // was hardcoded 'all'
      );
    });

    it('forwards non-admin isSystemAdmin=false on create()', async () => {
      const req = {
        user: { id: 'user-emp-1', email: 'emp@test.com', is_system_admin: false },
        access: {
          tasks: { scope: 'own' },
        },
      };

      const dto = { title: 'New Task', dueDate: '2026-10-01' } as any;
      await controller.create(req as any, dto);

      expect(tasksService.create).toHaveBeenCalledWith(
        'user-emp-1',
        dto,
        'emp@test.com',
        false, // was hardcoded true
      );
    });

    it('forwards isSystemAdmin=true and scope="all" for system admin user', async () => {
      const req = {
        user: { id: 'admin-1', email: 'admin@test.com', is_system_admin: true },
        access: {
          tasks: { scope: 'all' },
        },
      };

      await controller.findOne(req as any, 'task-999');

      expect(tasksService.findOne).toHaveBeenCalledWith(
        'task-999',
        'admin-1',
        'admin@test.com',
        true,
        'all',
      );
    });
  });
});
