import { Reflector } from '@nestjs/core';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';
import { ACCESS_REQUIREMENT_KEY } from '../access/decorators/require-access.decorator';
import { TenantGuard } from '../common/tenant.guard';
import { makeTwoTenants } from '../../test/helpers/tenant-fixtures';

describe('ProjectsController (P1-08 & MC-20)', () => {
  let controller: ProjectsController;
  let projectsService: jest.Mocked<ProjectsService>;
  const reflector = new Reflector();

  const mockCompanyId = new Types.ObjectId();
  const mockProjectId = new Types.ObjectId().toString();

  beforeEach(() => {
    projectsService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn().mockResolvedValue({ _id: mockProjectId } as any),
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

  describe('Parameter forwarding with Company Scoping (MC-20)', () => {
    it('forwards companyId, non-admin isSystemAdmin=false and req.access.projects.scope on findAll()', async () => {
      const req = {
        user: { id: 'user-emp-1', email: 'emp@test.com', is_system_admin: false },
        access: {
          projects: { scope: 'own' },
        },
      };

      await controller.findAll(mockCompanyId, req as any);

      expect(projectsService.findAll).toHaveBeenCalledWith(
        mockCompanyId,
        'user-emp-1',
        'emp@test.com',
        false,
        'own',
      );
    });

    it('forwards companyId, non-admin isSystemAdmin=false and team scope on findOne()', async () => {
      const req = {
        user: { id: 'user-lead-1', email: 'lead@test.com', is_system_admin: false },
        access: {
          projects: { scope: 'team' },
        },
      };

      await controller.findOne(mockCompanyId, req as any, 'proj-123');

      expect(projectsService.findOne).toHaveBeenCalledWith(
        mockCompanyId,
        'proj-123',
        'user-lead-1',
        'lead@test.com',
        false,
        'team',
      );
    });

    it('forwards companyId, non-admin isSystemAdmin=false and scope on update()', async () => {
      const req = {
        user: { id: 'user-emp-1', email: 'emp@test.com', is_system_admin: false },
        access: {
          projects: { scope: 'own' },
        },
      };

      const dto = { name: 'Updated Project' } as any;
      await controller.update(mockCompanyId, req as any, 'proj-456', dto);

      expect(projectsService.update).toHaveBeenCalledWith(
        mockCompanyId,
        'proj-456',
        dto,
        'user-emp-1',
        'emp@test.com',
        false,
        'own',
      );
    });

    it('forwards companyId, non-admin isSystemAdmin=false and scope on remove()', async () => {
      const req = {
        user: { id: 'user-emp-1', email: 'emp@test.com', is_system_admin: false },
        access: {
          projects: { scope: 'own' },
        },
      };

      await controller.remove(mockCompanyId, req as any, 'proj-789');

      expect(projectsService.remove).toHaveBeenCalledWith(
        mockCompanyId,
        'proj-789',
        'user-emp-1',
        'emp@test.com',
        false,
        'own',
      );
    });

    it('forwards isSystemAdmin=true and scope="all" for system admin user', async () => {
      const req = {
        user: { id: 'admin-1', email: 'admin@test.com', is_system_admin: true },
        access: {
          projects: { scope: 'all' },
        },
      };

      await controller.findOne(mockCompanyId, req as any, 'proj-999');

      expect(projectsService.findOne).toHaveBeenCalledWith(
        mockCompanyId,
        'proj-999',
        'admin-1',
        'admin@test.com',
        true,
        'all',
      );
    });

    it('forwards create parameters with companyId correctly', async () => {
      const req = {
        user: { id: 'user-1', email: 'user@test.com' },
      };
      const dto = { name: 'New Project' } as any;

      await controller.create(mockCompanyId, req as any, dto);

      expect(projectsService.create).toHaveBeenCalledWith(mockCompanyId, 'user-1', dto);
    });
  });

  describe('Tenant scoping & Cross-tenant isolation (MC-20)', () => {
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

    it('mounts controller under companies/:companySlug/projects', () => {
      const path = Reflect.getMetadata('path', ProjectsController);
      expect(path).toBe('companies/:companySlug/projects');
    });

    it('member of B calling /companies/A/projects -> 403 ForbiddenException', async () => {
      companyModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          _id: companyA.companyId,
          slug: companyA.slug,
          status: 'active',
        }),
      });

      // User belongs to Company B, so membership lookup for Company A returns null
      membershipModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      const context = {
        switchToHttp: () => ({
          getRequest: () => ({
            params: { companySlug: companyA.slug },
            user: { id: companyB.memberUserId.toString(), _id: companyB.memberUserId.toString() },
          }),
          getResponse: () => ({}),
        }),
        getHandler: () => controller.findAll,
        getClass: () => ProjectsController,
      } as any;

      await expect(tenantGuard.canActivate(context)).rejects.toThrow(ForbiddenException);
    });

    it('project id from A requested on GET under B route -> 404 NotFoundException if not found', async () => {
      const projFromAId = new Types.ObjectId().toString();
      projectsService.findOne.mockImplementation(async (companyId, id) => {
        if (companyId.toString() !== companyA.companyId.toString() && id === projFromAId) {
          throw new NotFoundException(`Project #${id} not found`);
        }
        return { _id: id, companyId } as any;
      });

      const reqB = {
        user: { id: companyB.ownerUserId.toString(), email: 'admin@beta.com', is_system_admin: false },
        access: { projects: { scope: 'all' } },
      };

      await expect(
        controller.findOne(companyB.companyId, reqB as any, projFromAId),
      ).rejects.toThrow(NotFoundException);

      expect(projectsService.findOne).toHaveBeenCalledWith(
        companyB.companyId,
        projFromAId,
        companyB.ownerUserId.toString(),
        'admin@beta.com',
        false,
        'all',
      );
    });

    it('strips client-provided companyId from create DTO', async () => {
      const dtoWithCompanyId: any = {
        name: 'Alpha Project',
        companyId: new Types.ObjectId().toString(),
      };
      const req = {
        user: { id: companyA.ownerUserId.toString() },
      };

      await controller.create(companyA.companyId, req as any, dtoWithCompanyId);

      expect(projectsService.create).toHaveBeenCalledWith(
        companyA.companyId,
        companyA.ownerUserId.toString(),
        expect.not.objectContaining({ companyId: expect.anything() }),
      );
      expect(dtoWithCompanyId.companyId).toBeUndefined();
    });

    it('strips client-provided companyId from update DTO', async () => {
      const dtoWithCompanyId: any = {
        name: 'Updated Alpha Project',
        companyId: new Types.ObjectId().toString(),
      };
      const req = {
        user: { id: companyA.ownerUserId.toString() },
        access: { projects: { scope: 'all' } },
      };

      await controller.update(companyA.companyId, req as any, 'proj-1', dtoWithCompanyId);

      expect(projectsService.update).toHaveBeenCalledWith(
        companyA.companyId,
        'proj-1',
        expect.not.objectContaining({ companyId: expect.anything() }),
        companyA.ownerUserId.toString(),
        undefined,
        false,
        'all',
      );
      expect(dtoWithCompanyId.companyId).toBeUndefined();
    });
  });
});
