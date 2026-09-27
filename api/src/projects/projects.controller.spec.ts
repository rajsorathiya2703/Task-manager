import { Reflector } from '@nestjs/core';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';
import { ACCESS_REQUIREMENT_KEY } from '../access/decorators/require-access.decorator';

describe('ProjectsController (P1-08 — Projects Controller PBAC)', () => {
  let controller: ProjectsController;
  let projectsService: jest.Mocked<ProjectsService>;
  const reflector = new Reflector();

  beforeEach(() => {
    projectsService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    } as any;

    controller = new ProjectsController(projectsService);
  });

  describe('Route @RequireAccess metadata', () => {
    it('decorates create with { module: "projects", action: "create" }', () => {
      const meta = reflector.get(ACCESS_REQUIREMENT_KEY, controller.create);
      expect(meta).toEqual({ module: 'projects', action: 'create' });
    });

    it('decorates findAll with { module: "projects", action: "read" }', () => {
      const meta = reflector.get(ACCESS_REQUIREMENT_KEY, controller.findAll);
      expect(meta).toEqual({ module: 'projects', action: 'read' });
    });

    it('decorates findOne with { module: "projects", action: "read" }', () => {
      const meta = reflector.get(ACCESS_REQUIREMENT_KEY, controller.findOne);
      expect(meta).toEqual({ module: 'projects', action: 'read' });
    });

    it('decorates update with { module: "projects", action: "update" }', () => {
      const meta = reflector.get(ACCESS_REQUIREMENT_KEY, controller.update);
      expect(meta).toEqual({ module: 'projects', action: 'update' });
    });

    it('decorates remove with { module: "projects", action: "delete" }', () => {
      const meta = reflector.get(ACCESS_REQUIREMENT_KEY, controller.remove);
      expect(meta).toEqual({ module: 'projects', action: 'delete' });
    });
  });

  describe('Parameter forwarding (replacing hardcoded true/"all" with resolved scope)', () => {
    it('forwards non-admin isSystemAdmin=false and req.access.projects.scope on findAll()', async () => {
      const req = {
        user: { id: 'user-emp-1', email: 'emp@test.com', is_system_admin: false },
        access: {
          projects: { scope: 'own' },
        },
      };

      await controller.findAll(req as any);

      expect(projectsService.findAll).toHaveBeenCalledWith(
        'user-emp-1',
        'emp@test.com',
        false, // was previously hardcoded true!
        'own', // was previously hardcoded 'all'!
      );
    });

    it('forwards non-admin isSystemAdmin=false and team scope on findOne()', async () => {
      const req = {
        user: { id: 'user-lead-1', email: 'lead@test.com', is_system_admin: false },
        access: {
          projects: { scope: 'team' },
        },
      };

      await controller.findOne(req as any, 'proj-123');

      expect(projectsService.findOne).toHaveBeenCalledWith(
        'proj-123',
        'user-lead-1',
        'lead@test.com',
        false, // was hardcoded true
        'team', // was hardcoded 'all'
      );
    });

    it('forwards non-admin isSystemAdmin=false and scope on update()', async () => {
      const req = {
        user: { id: 'user-emp-1', email: 'emp@test.com', is_system_admin: false },
        access: {
          projects: { scope: 'own' },
        },
      };

      const dto = { name: 'Updated Project' } as any;
      await controller.update(req as any, 'proj-456', dto);

      expect(projectsService.update).toHaveBeenCalledWith(
        'proj-456',
        dto,
        'user-emp-1',
        'emp@test.com',
        false, // was hardcoded true
        'own', // was hardcoded 'all'
      );
    });

    it('forwards non-admin isSystemAdmin=false and scope on remove()', async () => {
      const req = {
        user: { id: 'user-emp-1', email: 'emp@test.com', is_system_admin: false },
        access: {
          projects: { scope: 'own' },
        },
      };

      await controller.remove(req as any, 'proj-789');

      expect(projectsService.remove).toHaveBeenCalledWith(
        'proj-789',
        'user-emp-1',
        'emp@test.com',
        false, // was hardcoded true
        'own', // was hardcoded 'all'
      );
    });

    it('forwards isSystemAdmin=true and scope="all" for system admin user', async () => {
      const req = {
        user: { id: 'admin-1', email: 'admin@test.com', is_system_admin: true },
        access: {
          projects: { scope: 'all' },
        },
      };

      await controller.findOne(req as any, 'proj-999');

      expect(projectsService.findOne).toHaveBeenCalledWith(
        'proj-999',
        'admin-1',
        'admin@test.com',
        true,
        'all',
      );
    });

    it('forwards create parameters correctly', async () => {
      const req = {
        user: { id: 'user-1', email: 'user@test.com' },
      };
      const dto = { name: 'New Project' } as any;

      await controller.create(req as any, dto);

      expect(projectsService.create).toHaveBeenCalledWith('user-1', dto);
    });
  });
});
