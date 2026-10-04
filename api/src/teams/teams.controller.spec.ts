import { Reflector } from '@nestjs/core';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { TeamsController } from './teams.controller';
import { TeamsService } from './teams.service';
import { ACCESS_REQUIREMENT_KEY } from '../access/decorators/require-access.decorator';
import { TenantGuard } from '../common/tenant.guard';
import { makeTwoTenants } from '../../test/helpers/tenant-fixtures';

describe('TeamsController (P1-11 & MC-18)', () => {
  let controller: TeamsController;
  let teamsService: jest.Mocked<TeamsService>;
  const reflector = new Reflector();

  const mockCompanyId = new Types.ObjectId();
  const mockTeamId = new Types.ObjectId().toString();

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

  describe('Parameter forwarding with Company Scoping (MC-18)', () => {
    it('forwards companyId, isSystemAdmin=false, and req.access.teams.scope on findAll()', async () => {
      const req = {
        user: { id: 'user-emp-1', email: 'emp@test.com', is_system_admin: false },
        access: {
          teams: { scope: 'own' },
        },
      };

      await controller.findAll(mockCompanyId, req as any);

      expect(teamsService.findAll).toHaveBeenCalledWith(
        mockCompanyId,
        'user-emp-1',
        'emp@test.com',
        false,
        'own',
      );
    });

    it('forwards companyId, isSystemAdmin=false, and team scope on findOne()', async () => {
      const req = {
        user: { id: 'user-lead-1', email: 'lead@test.com', is_system_admin: false },
        access: {
          teams: { scope: 'team' },
        },
      };

      await controller.findOne(mockCompanyId, 'team-123', req as any);

      expect(teamsService.findOne).toHaveBeenCalledWith(
        mockCompanyId,
        'team-123',
        'user-lead-1',
        'lead@test.com',
        false,
        'team',
      );
    });

    it('forwards companyId, isSystemAdmin=false, and scope on update()', async () => {
      const req = {
        user: { id: 'user-lead-1', email: 'lead@test.com', is_system_admin: false },
        access: {
          teams: { scope: 'own' },
        },
      };

      const dto = { name: 'Updated Team' } as any;
      await controller.update(mockCompanyId, 'team-456', dto, req as any);

      expect(teamsService.update).toHaveBeenCalledWith(
        mockCompanyId,
        'team-456',
        dto,
        'user-lead-1',
        'lead@test.com',
        false,
        'own',
      );
    });

    it('forwards companyId, isSystemAdmin=false, and scope on remove()', async () => {
      const req = {
        user: { id: 'user-emp-1', email: 'emp@test.com', is_system_admin: false },
        access: {
          teams: { scope: 'own' },
        },
      };

      await controller.remove(mockCompanyId, 'team-789', req as any);

      expect(teamsService.remove).toHaveBeenCalledWith(
        mockCompanyId,
        'team-789',
        'user-emp-1',
        'emp@test.com',
        false,
        'own',
      );
    });

    it('forwards companyId, isSystemAdmin=false, and scope on getActiveTasks()', async () => {
      const req = {
        user: { id: 'user-lead-1', email: 'lead@test.com', is_system_admin: false },
        access: {
          teams: { scope: 'team' },
        },
      };

      await controller.getActiveTasks(mockCompanyId, 'team-123', req as any);

      expect(teamsService.getActiveTasks).toHaveBeenCalledWith(
        mockCompanyId,
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

      await controller.findOne(mockCompanyId, 'team-999', req as any);

      expect(teamsService.findOne).toHaveBeenCalledWith(
        mockCompanyId,
        'team-999',
        'admin-1',
        'admin@test.com',
        true,
        'all',
      );
    });

    it('forwards create parameters with companyId correctly', async () => {
      const dto = { name: 'New Team' } as any;
      await controller.create(mockCompanyId, dto);
      expect(teamsService.create).toHaveBeenCalledWith(mockCompanyId, dto);
    });

    it('attaches employeeId from membership to comment user payload on addComment', async () => {
      const mockEmployeeId = new Types.ObjectId();
      const req = {
        user: { id: 'user-1', name: 'John Doe', email: 'john@example.com', avatarUrl: 'avatar.png' },
        membership: { employeeId: mockEmployeeId },
      };

      await controller.addComment(mockCompanyId, req as any, mockTeamId, { content: 'Nice work' });

      expect(teamsService.addComment).toHaveBeenCalledWith(
        mockCompanyId,
        mockTeamId,
        {
          content: 'Nice work',
          user: {
            name: 'John Doe',
            avatarUrl: 'avatar.png',
            userId: 'user-1',
            email: 'john@example.com',
            employeeId: mockEmployeeId.toString(),
          },
        },
        'user-1',
        'john@example.com',
      );
    });
  });

  describe('Tenant scoping & Cross-tenant isolation (MC-18)', () => {
    let tenantGuard: TenantGuard;
    let companyModel: any;
    let membershipModel: any;

    const tenants = makeTwoTenants('Company Alpha', 'Company Beta');
    const companyA = tenants.A;
    const companyB = tenants.B;

    beforeEach(() => {
      companyModel = {
        findOne: jest.fn(),
      };
      membershipModel = {
        findOne: jest.fn(),
      };
      tenantGuard = new TenantGuard(reflector, companyModel, membershipModel);
    });

    it('mounts controller under companies/:companySlug/teams', () => {
      const path = Reflect.getMetadata('path', TeamsController);
      expect(path).toBe('companies/:companySlug/teams');
    });

    it('member of A calling /companies/B/teams -> 403 ForbiddenException', async () => {
      companyModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          _id: companyB.companyId,
          slug: companyB.slug,
          status: 'active',
        }),
      });

      membershipModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      const context = {
        switchToHttp: () => ({
          getRequest: () => ({
            params: { companySlug: companyB.slug },
            user: { id: companyA.memberUserId.toString(), _id: companyA.memberUserId.toString() },
          }),
          getResponse: () => ({}),
        }),
        getHandler: () => controller.findAll,
        getClass: () => TeamsController,
      } as any;

      await expect(tenantGuard.canActivate(context)).rejects.toThrow(ForbiddenException);
    });

    it('team id from A requested on GET under B route -> 404 NotFoundException', async () => {
      const teamFromAId = new Types.ObjectId().toString();
      teamsService.findOne.mockImplementation(async (companyId, id) => {
        if (companyId.toString() !== companyA.companyId.toString() && id === teamFromAId) {
          throw new NotFoundException(`Team #${id} not found`);
        }
        return { _id: id, companyId } as any;
      });

      const reqB = {
        user: { id: companyB.ownerUserId.toString(), email: 'admin@beta.com', is_system_admin: false },
        access: { teams: { scope: 'all' } },
      };

      await expect(
        controller.findOne(companyB.companyId, teamFromAId, reqB as any),
      ).rejects.toThrow(NotFoundException);

      expect(teamsService.findOne).toHaveBeenCalledWith(
        companyB.companyId,
        teamFromAId,
        companyB.ownerUserId.toString(),
        'admin@beta.com',
        false,
        'all',
      );
    });

    it('team id from A updated on PATCH under B route -> 404 NotFoundException', async () => {
      const teamFromAId = new Types.ObjectId().toString();
      teamsService.update.mockImplementation(async (companyId, id) => {
        if (companyId.toString() !== companyA.companyId.toString() && id === teamFromAId) {
          throw new NotFoundException(`Team #${id} not found`);
        }
        return { _id: id, companyId } as any;
      });

      const reqB = {
        user: { id: companyB.ownerUserId.toString(), email: 'admin@beta.com', is_system_admin: false },
        access: { teams: { scope: 'all' } },
      };

      await expect(
        controller.update(companyB.companyId, teamFromAId, { name: 'Rename' }, reqB as any),
      ).rejects.toThrow(NotFoundException);
    });

    it('team id from A deleted on DELETE under B route -> 404 NotFoundException', async () => {
      const teamFromAId = new Types.ObjectId().toString();
      teamsService.remove.mockImplementation(async (companyId, id) => {
        if (companyId.toString() !== companyA.companyId.toString() && id === teamFromAId) {
          throw new NotFoundException(`Team #${id} not found`);
        }
        return { _id: id, companyId } as any;
      });

      const reqB = {
        user: { id: companyB.ownerUserId.toString(), email: 'admin@beta.com', is_system_admin: false },
        access: { teams: { scope: 'all' } },
      };

      await expect(
        controller.remove(companyB.companyId, teamFromAId, reqB as any),
      ).rejects.toThrow(NotFoundException);
    });

    it('comment created in A not visible from B: operations on team from A under company B throw 404', async () => {
      const teamFromAId = new Types.ObjectId().toString();
      teamsService.addComment.mockImplementation(async (companyId, id) => {
        if (companyId.toString() !== companyA.companyId.toString() && id === teamFromAId) {
          throw new NotFoundException(`Team #${id} not found`);
        }
        return { _id: id, companyId } as any;
      });

      const reqB = {
        user: { id: companyB.ownerUserId.toString(), email: 'admin@beta.com' },
        membership: { employeeId: new Types.ObjectId() },
      };

      await expect(
        controller.addComment(companyB.companyId, reqB as any, teamFromAId, { content: 'Secret from A' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('strips client-provided companyId from create DTO', async () => {
      const dtoWithCompanyId: any = {
        name: 'Alpha Team',
        companyId: new Types.ObjectId().toString(),
      };

      await controller.create(companyA.companyId, dtoWithCompanyId);

      expect(teamsService.create).toHaveBeenCalledWith(
        companyA.companyId,
        expect.not.objectContaining({ companyId: expect.anything() }),
      );
      expect(dtoWithCompanyId.companyId).toBeUndefined();
    });

    it('strips client-provided companyId from update DTO', async () => {
      const dtoWithCompanyId: any = {
        name: 'Updated Alpha Team',
        companyId: new Types.ObjectId().toString(),
      };
      const req = {
        user: { id: companyA.ownerUserId.toString() },
        access: { teams: { scope: 'all' } },
      };

      await controller.update(companyA.companyId, 'team-1', dtoWithCompanyId, req as any);

      expect(teamsService.update).toHaveBeenCalledWith(
        companyA.companyId,
        'team-1',
        expect.not.objectContaining({ companyId: expect.anything() }),
        companyA.ownerUserId.toString(),
        undefined,
        false,
        'all',
      );
      expect(dtoWithCompanyId.companyId).toBeUndefined();
    });

    it('strips client-provided companyId from addComment & updateComment', async () => {
      const addDto: any = { content: 'comment', companyId: 'hacked' };
      const req = {
        user: { id: 'u1', email: 'u1@test.com' },
        membership: { employeeId: new Types.ObjectId() },
      };

      await controller.addComment(companyA.companyId, req as any, 't1', addDto);
      expect(addDto.companyId).toBeUndefined();

      const updateDto: any = { content: 'updated', companyId: 'hacked' };
      await controller.updateComment(companyA.companyId, req as any, 't1', 'c1', updateDto);
      expect(updateDto.companyId).toBeUndefined();
    });
  });
});
