import { Reflector } from '@nestjs/core';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { ACCESS_REQUIREMENT_KEY } from '../access/decorators/require-access.decorator';
import { makeTwoTenants } from '../../test/helpers/tenant-fixtures';

describe('TasksController (P1-05 & MC-23 — Company-scoped Tasks Controller)', () => {
  let controller: TasksController;
  let tasksService: jest.Mocked<TasksService>;
  let cloudinaryService: jest.Mocked<CloudinaryService>;
  const reflector = new Reflector();

  const mockCompanyId = new Types.ObjectId();
  const mockTaskId = new Types.ObjectId().toString();

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
      verifyFileBelongsToCompany: jest.fn(),
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

    it('decorates getActiveTimer with { module: "tasks", action: "read" }', () => {
      const meta = reflector.get(ACCESS_REQUIREMENT_KEY, controller.getActiveTimer);
      expect(meta).toEqual({ module: 'tasks', action: 'read' });
    });

    it('decorates viewFile with { module: "tasks", action: "read" }', () => {
      const meta = reflector.get(ACCESS_REQUIREMENT_KEY, controller.viewFile);
      expect(meta).toEqual({ module: 'tasks', action: 'read' });
    });

    it('decorates uploadGenericFiles with { module: "tasks", action: "create" }', () => {
      const meta = reflector.get(ACCESS_REQUIREMENT_KEY, controller.uploadGenericFiles);
      expect(meta).toEqual({ module: 'tasks', action: 'create' });
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

    it('decorates duplicate with { module: "tasks", action: "create" }', () => {
      const meta = reflector.get(ACCESS_REQUIREMENT_KEY, controller.duplicate);
      expect(meta).toEqual({ module: 'tasks', action: 'create' });
    });

    it('decorates uploadFiles with { module: "tasks", action: "update" }', () => {
      const meta = reflector.get(ACCESS_REQUIREMENT_KEY, controller.uploadFiles);
      expect(meta).toEqual({ module: 'tasks', action: 'update' });
    });

    it('decorates comment endpoints with { module: "tasks", action: "read" }', () => {
      expect(reflector.get(ACCESS_REQUIREMENT_KEY, controller.addComment)).toEqual({ module: 'tasks', action: 'read' });
      expect(reflector.get(ACCESS_REQUIREMENT_KEY, controller.updateComment)).toEqual({ module: 'tasks', action: 'read' });
      expect(reflector.get(ACCESS_REQUIREMENT_KEY, controller.deleteComment)).toEqual({ module: 'tasks', action: 'read' });
    });

    it('decorates inviteMember with { module: "tasks", action: "update" }', () => {
      const meta = reflector.get(ACCESS_REQUIREMENT_KEY, controller.inviteMember);
      expect(meta).toEqual({ module: 'tasks', action: 'update' });
    });

    it('decorates timer endpoints with { module: "tasks", action: "read" }', () => {
      expect(reflector.get(ACCESS_REQUIREMENT_KEY, controller.startTimer)).toEqual({ module: 'tasks', action: 'read' });
      expect(reflector.get(ACCESS_REQUIREMENT_KEY, controller.stopTimer)).toEqual({ module: 'tasks', action: 'read' });
    });
  });

  describe('Parameter forwarding with Company Scoping (MC-23)', () => {
    it('forwards companyId, isSystemAdmin=false, and req.access.tasks.scope on remove()', async () => {
      tasksService.remove.mockResolvedValue({ _id: mockTaskId } as any);
      const req = {
        user: { id: 'user-emp-1', email: 'emp@test.com', is_system_admin: false },
        access: {
          tasks: { scope: 'own' },
        },
      };

      await controller.remove(mockCompanyId, req as any, mockTaskId);

      expect(tasksService.remove).toHaveBeenCalledWith(
        mockCompanyId,
        mockTaskId,
        'user-emp-1',
        'emp@test.com',
        false,
        'own',
      );
    });

    it('forwards companyId, isSystemAdmin=false, and team scope on findAll()', async () => {
      const req = {
        user: { id: 'user-lead-1', email: 'lead@test.com', is_system_admin: false },
        access: {
          tasks: { scope: 'team' },
        },
      };

      await controller.findAll(mockCompanyId, req as any, 'proj-1');

      expect(tasksService.findAll).toHaveBeenCalledWith(
        mockCompanyId,
        'user-lead-1',
        'lead@test.com',
        'proj-1',
        false,
        'team',
      );
    });

    it('forwards companyId, isSystemAdmin=false on create() and strips client companyId', async () => {
      const req = {
        user: { id: 'user-emp-1', email: 'emp@test.com', is_system_admin: false },
        access: {
          tasks: { scope: 'own' },
        },
      };

      const dto: any = { title: 'New Task', dueDate: '2026-10-01', companyId: 'untrusted' };
      await controller.create(mockCompanyId, req as any, dto);

      expect(dto.companyId).toBeUndefined();
      expect(tasksService.create).toHaveBeenCalledWith(
        mockCompanyId,
        'user-emp-1',
        dto,
        'emp@test.com',
        false,
      );
    });

    it('forwards isSystemAdmin=true and scope="all" for system admin on findOne()', async () => {
      tasksService.findOne.mockResolvedValue({ _id: 'task-999' } as any);
      const req = {
        user: { id: 'admin-1', email: 'admin@test.com', is_system_admin: true },
        access: {
          tasks: { scope: 'all' },
        },
      };

      await controller.findOne(mockCompanyId, req as any, 'task-999');

      expect(tasksService.findOne).toHaveBeenCalledWith(
        mockCompanyId,
        'task-999',
        'admin-1',
        'admin@test.com',
        true,
        'all',
      );
    });

    it('forwards companyId on getTimeline()', async () => {
      const req = {
        user: { id: 'user-1', email: 'user@test.com' },
      };
      const query = { startDate: '2026-01-01', endDate: '2026-01-31' };

      await controller.getTimeline(mockCompanyId, req as any, query);

      expect(tasksService.getTimeline).toHaveBeenCalledWith(
        mockCompanyId,
        'user-1',
        'user@test.com',
        query,
      );
    });

    it('forwards companyId on getActiveTimer()', async () => {
      const req = {
        user: { id: 'user-1', email: 'user@test.com' },
      };

      await controller.getActiveTimer(mockCompanyId, req as any);

      expect(tasksService.getActiveTimer).toHaveBeenCalledWith(
        mockCompanyId,
        'user@test.com',
      );
    });

    it('attaches employeeId from membership to comment user payload on addComment', async () => {
      const employeeId = new Types.ObjectId();
      tasksService.addComment.mockResolvedValue({ _id: mockTaskId } as any);
      const req = {
        user: { id: 'u1', email: 'emp@test.com', name: 'Alice' },
        membership: { employeeId },
      };

      await controller.addComment(mockCompanyId, req as any, mockTaskId, { content: 'Good progress' });

      expect(tasksService.addComment).toHaveBeenCalledWith(
        mockCompanyId,
        mockTaskId,
        {
          content: 'Good progress',
          user: {
            name: 'Alice',
            avatarUrl: undefined,
            userId: 'u1',
            email: 'emp@test.com',
            employeeId: employeeId.toString(),
          },
        },
        'u1',
        'emp@test.com',
      );
    });

    it('strips client-provided companyId on addComment and updateComment', async () => {
      tasksService.addComment.mockResolvedValue({ _id: mockTaskId } as any);
      tasksService.updateComment.mockResolvedValue({ _id: mockTaskId } as any);
      const req = {
        user: { id: 'u1', email: 'emp@test.com' },
        membership: {},
      };

      const addDto = { content: 'c1', companyId: 'untrusted' };
      await controller.addComment(mockCompanyId, req as any, mockTaskId, addDto);
      expect(addDto.companyId).toBeUndefined();

      const updateDto = { content: 'c2', companyId: 'untrusted' };
      await controller.updateComment(mockCompanyId, req as any, mockTaskId, 'comment-1', updateDto);
      expect(updateDto.companyId).toBeUndefined();
    });

    it('forwards companyId on inviteMember without writing invite-error.log to disk on error', async () => {
      tasksService.inviteMember.mockRejectedValue(new BadRequestException('Invite failed'));
      const req = {
        user: { id: 'u1', email: 'inviter@test.com', name: 'Bob', is_system_admin: false },
      };

      await expect(
        controller.inviteMember(mockCompanyId, req as any, mockTaskId, { email: 'new@test.com', name: 'New' }),
      ).rejects.toThrow(BadRequestException);

      expect(tasksService.inviteMember).toHaveBeenCalledWith(
        mockCompanyId,
        mockTaskId,
        'new@test.com',
        'New',
        'Bob',
        'u1',
        'inviter@test.com',
        false,
      );
    });

    it('forwards companyId on startTimer and stopTimer', async () => {
      const req = {
        user: { id: 'u1', email: 'emp@test.com', name: 'Alice', avatarUrl: 'http://avatar.jpg' },
      };

      await controller.startTimer(mockCompanyId, req as any, mockTaskId);
      expect(tasksService.startTimer).toHaveBeenCalledWith(
        mockCompanyId,
        mockTaskId,
        { name: 'Alice', email: 'emp@test.com', avatarUrl: 'http://avatar.jpg' },
        'u1',
        'emp@test.com',
      );

      await controller.stopTimer(mockCompanyId, req as any, mockTaskId);
      expect(tasksService.stopTimer).toHaveBeenCalledWith(
        mockCompanyId,
        mockTaskId,
        { name: 'Alice', email: 'emp@test.com', avatarUrl: 'http://avatar.jpg' },
        'u1',
        'emp@test.com',
      );
    });
  });

  describe('Cross-Tenant Isolation (MC-23)', () => {
    const { A: companyA, B: companyB } = makeTwoTenants();

    it('task id from A requested on GET under B route -> 404 NotFoundException', async () => {
      const taskFromAId = new Types.ObjectId().toString();
      tasksService.findOne.mockImplementation(async (companyId, id) => {
        if (companyId.toString() !== companyA.companyId.toString() && id === taskFromAId) {
          return null;
        }
        return { _id: id, companyId } as any;
      });

      const reqB = {
        user: { id: companyB.ownerUserId.toString(), email: 'admin@beta.com', is_system_admin: false },
        access: { tasks: { scope: 'all' } },
      };

      await expect(
        controller.findOne(companyB.companyId, reqB as any, taskFromAId),
      ).rejects.toThrow(NotFoundException);

      expect(tasksService.findOne).toHaveBeenCalledWith(
        companyB.companyId,
        taskFromAId,
        companyB.ownerUserId.toString(),
        'admin@beta.com',
        false,
        'all',
      );
    });

    it('task id from A updated on PATCH under B route -> 404 NotFoundException', async () => {
      const taskFromAId = new Types.ObjectId().toString();
      tasksService.update.mockImplementation(async (companyId, id) => {
        if (companyId.toString() !== companyA.companyId.toString() && id === taskFromAId) {
          return null;
        }
        return { _id: id, companyId } as any;
      });

      const reqB = {
        user: { id: companyB.ownerUserId.toString(), email: 'admin@beta.com', is_system_admin: false },
        access: { tasks: { scope: 'all' } },
      };

      await expect(
        controller.update(companyB.companyId, reqB as any, taskFromAId, { title: 'Hacked' } as any),
      ).rejects.toThrow(NotFoundException);
    });

    it('task id from A deleted on DELETE under B route -> 404 NotFoundException', async () => {
      const taskFromAId = new Types.ObjectId().toString();
      tasksService.remove.mockImplementation(async (companyId, id) => {
        if (companyId.toString() !== companyA.companyId.toString() && id === taskFromAId) {
          return null;
        }
        return { _id: id, companyId } as any;
      });

      const reqB = {
        user: { id: companyB.ownerUserId.toString(), email: 'admin@beta.com', is_system_admin: false },
        access: { tasks: { scope: 'all' } },
      };

      await expect(
        controller.remove(companyB.companyId, reqB as any, taskFromAId),
      ).rejects.toThrow(NotFoundException);
    });

    it('timer operations on task from A under company B route throw 404 NotFoundException', async () => {
      const taskFromAId = new Types.ObjectId().toString();
      tasksService.startTimer.mockImplementation(async (companyId, id) => {
        if (companyId.toString() !== companyA.companyId.toString() && id === taskFromAId) {
          throw new NotFoundException('Task not found');
        }
        return { _id: id, companyId } as any;
      });
      tasksService.stopTimer.mockImplementation(async (companyId, id) => {
        if (companyId.toString() !== companyA.companyId.toString() && id === taskFromAId) {
          throw new NotFoundException('Task not found');
        }
        return { _id: id, companyId } as any;
      });

      const reqB = {
        user: { id: companyB.ownerUserId.toString(), email: 'admin@beta.com' },
      };

      await expect(
        controller.startTimer(companyB.companyId, reqB as any, taskFromAId),
      ).rejects.toThrow(NotFoundException);

      await expect(
        controller.stopTimer(companyB.companyId, reqB as any, taskFromAId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('file/view endpoint tenant restriction & safe-host checks', () => {
    it('throws BadRequestException if fileUrl is missing', async () => {
      const res: any = { redirect: jest.fn() };
      await expect(
        controller.viewFile(mockCompanyId, '', 'test.pdf', '', res),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException if fileUrl host is untrusted', async () => {
      const res: any = { redirect: jest.fn() };
      await expect(
        controller.viewFile(mockCompanyId, 'https://malicious-site.com/file.pdf', 'test.pdf', '', res),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws NotFoundException (404) if URL does not belong to the company', async () => {
      const fileUrl = 'https://res.cloudinary.com/demo/image/upload/sample.jpg';
      tasksService.verifyFileBelongsToCompany.mockResolvedValue(false);
      const res: any = { redirect: jest.fn() };

      await expect(
        controller.viewFile(mockCompanyId, fileUrl, 'sample.jpg', '', res),
      ).rejects.toThrow(NotFoundException);

      expect(tasksService.verifyFileBelongsToCompany).toHaveBeenCalledWith(mockCompanyId, fileUrl);
    });

    it('redirects to fileUrl when file belongs to company and is not a PDF stream', async () => {
      const fileUrl = 'https://res.cloudinary.com/demo/image/upload/sample.jpg';
      tasksService.verifyFileBelongsToCompany.mockResolvedValue(true);
      cloudinaryService.extractPublicId.mockReturnValue('sample');
      cloudinaryService.getFileStream.mockResolvedValue(null);

      const res: any = { redirect: jest.fn() };
      await controller.viewFile(mockCompanyId, fileUrl, 'sample.jpg', '', res);

      expect(res.redirect).toHaveBeenCalledWith(fileUrl);
    });

    it('streams PDF when file belongs to company, is a PDF, and stream is available', async () => {
      const fileUrl = 'https://res.cloudinary.com/demo/image/upload/sample.pdf';
      tasksService.verifyFileBelongsToCompany.mockResolvedValue(true);
      cloudinaryService.extractPublicId.mockReturnValue('sample');

      const mockPipe = jest.fn();
      cloudinaryService.getFileStream.mockResolvedValue({
        stream: { pipe: mockPipe } as any,
        contentType: 'application/pdf',
        length: 1234,
      });

      const res: any = {
        setHeader: jest.fn(),
      };

      await controller.viewFile(mockCompanyId, fileUrl, 'sample.pdf', '1', res);

      expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/pdf');
      expect(res.setHeader).toHaveBeenCalledWith('Content-Disposition', 'attachment; filename="sample.pdf"');
      expect(res.setHeader).toHaveBeenCalledWith('Content-Length', '1234');
      expect(mockPipe).toHaveBeenCalledWith(res);
    });
  });
});
