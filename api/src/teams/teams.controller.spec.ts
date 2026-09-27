import { Reflector } from '@nestjs/core';
import { TeamsController } from './teams.controller';
import { TeamsService } from './teams.service';
import { ACCESS_REQUIREMENT_KEY } from '../access/decorators/require-access.decorator';

describe('TeamsController (P1-11 — Teams Controller PBAC)', () => {
  let controller: TeamsController;
  let teamsService: jest.Mocked<TeamsService>;
  const reflector = new Reflector();

  beforeEach(() => {
    teamsService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
      getActiveTasks: jest.fn(),
      addComment: jest.fn(),
      updateComment: jest.fn(),
      deleteComment: jest.fn(),
    } as any;

    controller = new TeamsController(teamsService);
  });

  describe('Route @RequireAccess metadata', () => {
    it('decorates create with { module: "teams", action: "create" }', () => {
      const meta = reflector.get(ACCESS_REQUIREMENT_KEY, controller.create);
      expect(meta).toEqual({ module: 'teams', action: 'create' });
    });

    it('decorates findAll with { module: "teams", action: "read" }', () => {
      const meta = reflector.get(ACCESS_REQUIREMENT_KEY, controller.findAll);
      expect(meta).toEqual({ module: 'teams', action: 'read' });
    });

    it('decorates findOne with { module: "teams", action: "read" }', () => {
      const meta = reflector.get(ACCESS_REQUIREMENT_KEY, controller.findOne);
      expect(meta).toEqual({ module: 'teams', action: 'read' });
    });

    it('decorates update with { module: "teams", action: "update" }', () => {
      const meta = reflector.get(ACCESS_REQUIREMENT_KEY, controller.update);
      expect(meta).toEqual({ module: 'teams', action: 'update' });
    });

    it('decorates remove with { module: "teams", action: "delete" }', () => {
      const meta = reflector.get(ACCESS_REQUIREMENT_KEY, controller.remove);
      expect(meta).toEqual({ module: 'teams', action: 'delete' });
    });

    it('decorates getActiveTasks with { module: "teams", action: "read" }', () => {
      const meta = reflector.get(ACCESS_REQUIREMENT_KEY, controller.getActiveTasks);
      expect(meta).toEqual({ module: 'teams', action: 'read' });
    });

    it('decorates comment endpoints with { module: "teams", action: "read" }', () => {
      expect(reflector.get(ACCESS_REQUIREMENT_KEY, controller.addComment)).toEqual({ module: 'teams', action: 'read' });
      expect(reflector.get(ACCESS_REQUIREMENT_KEY, controller.updateComment)).toEqual({ module: 'teams', action: 'read' });
      expect(reflector.get(ACCESS_REQUIREMENT_KEY, controller.deleteComment)).toEqual({ module: 'teams', action: 'read' });
    });
  });

  describe('Parameter forwarding (replacing hardcoded true/"all" with resolved scope)', () => {
    it('forwards non-admin isSystemAdmin=false and req.access.teams.scope on findAll()', async () => {
      const req = {
        user: { id: 'user-emp-1', email: 'emp@test.com', is_system_admin: false },
        access: {
          teams: { scope: 'own' },
        },
      };

      await controller.findAll(req as any);

      expect(teamsService.findAll).toHaveBeenCalledWith(
        'user-emp-1',
        'emp@test.com',
        false, // was hardcoded true!
        'own', // was hardcoded 'all'!
      );
    });

    it('forwards non-admin isSystemAdmin=false and team scope on findOne()', async () => {
      const req = {
        user: { id: 'user-lead-1', email: 'lead@test.com', is_system_admin: false },
        access: {
          teams: { scope: 'team' },
        },
      };

      await controller.findOne('team-123', req as any);

      expect(teamsService.findOne).toHaveBeenCalledWith(
        'team-123',
        'user-lead-1',
        'lead@test.com',
        false, // was hardcoded true
        'team', // was hardcoded 'all'
      );
    });

    it('forwards non-admin isSystemAdmin=false and scope on update()', async () => {
      const req = {
        user: { id: 'user-lead-1', email: 'lead@test.com', is_system_admin: false },
        access: {
          teams: { scope: 'own' },
        },
      };

      const dto = { name: 'Updated Team' } as any;
      await controller.update('team-456', dto, req as any);

      expect(teamsService.update).toHaveBeenCalledWith(
        'team-456',
        dto,
        'user-lead-1',
        'lead@test.com',
        false, // was hardcoded true
        'own', // was hardcoded 'all'
      );
    });

    it('forwards non-admin isSystemAdmin=false and scope on remove()', async () => {
      const req = {
        user: { id: 'user-emp-1', email: 'emp@test.com', is_system_admin: false },
        access: {
          teams: { scope: 'own' },
        },
      };

      await controller.remove('team-789', req as any);

      expect(teamsService.remove).toHaveBeenCalledWith(
        'team-789',
        'user-emp-1',
        'emp@test.com',
        false, // was hardcoded true
        'own', // was hardcoded 'all'
      );
    });

    it('forwards non-admin isSystemAdmin=false and scope on getActiveTasks()', async () => {
      const req = {
        user: { id: 'user-lead-1', email: 'lead@test.com', is_system_admin: false },
        access: {
          teams: { scope: 'team' },
        },
      };

      await controller.getActiveTasks('team-123', req as any);

      expect(teamsService.getActiveTasks).toHaveBeenCalledWith(
        'team-123',
        'user-lead-1',
        'lead@test.com',
        false,
        'team',
      );
    });

    it('forwards isSystemAdmin=true and scope="all" for system admin user', async () => {
      const req = {
        user: { id: 'admin-1', email: 'admin@test.com', is_system_admin: true },
        access: {
          teams: { scope: 'all' },
        },
      };

      await controller.findOne('team-999', req as any);

      expect(teamsService.findOne).toHaveBeenCalledWith(
        'team-999',
        'admin-1',
        'admin@test.com',
        true,
        'all',
      );
    });

    it('forwards create parameters correctly', async () => {
      const dto = { name: 'New Team' } as any;
      await controller.create(dto);
      expect(teamsService.create).toHaveBeenCalledWith(dto);
    });
  });
});
