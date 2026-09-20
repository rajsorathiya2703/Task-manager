import { BadRequestException } from '@nestjs/common';
import { UserGroupsService } from './user-groups.service';
import { Types } from 'mongoose';

describe('UserGroupsService', () => {
  let service: UserGroupsService;
  let mockUserGroupModel: any;

  beforeEach(() => {
    mockUserGroupModel = {
      findOne: jest.fn(),
      find: jest.fn(),
      findById: jest.fn(),
      findByIdAndUpdate: jest.fn(),
      findByIdAndDelete: jest.fn(),
      findOneAndUpdate: jest.fn(),
      create: jest.fn(),
    };

    service = new UserGroupsService(mockUserGroupModel);
  });

  describe('ensureDefaultGroups', () => {
    it('should create Administrators and Employee groups if not present', async () => {
      mockUserGroupModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });
      mockUserGroupModel.create
        .mockResolvedValueOnce({ name: 'Administrators' } as any)
        .mockResolvedValueOnce({ name: 'Employee' } as any);

      const result = await service.ensureDefaultGroups();

      expect(mockUserGroupModel.create).toHaveBeenCalledTimes(2);
      expect(result.adminGroup.name).toBe('Administrators');
      expect(result.employeeGroup.name).toBe('Employee');
    });

    it('should not re-create default groups if they already exist', async () => {
      mockUserGroupModel.findOne
        .mockReturnValueOnce({
          exec: jest.fn().mockResolvedValue({ name: 'Administrators' }),
        })
        .mockReturnValueOnce({
          exec: jest.fn().mockResolvedValue({ name: 'Employee' }),
        });

      const result = await service.ensureDefaultGroups();

      expect(mockUserGroupModel.create).not.toHaveBeenCalled();
      expect(result.adminGroup.name).toBe('Administrators');
      expect(result.employeeGroup.name).toBe('Employee');
    });
  });

  describe('remove', () => {
    it('should prevent deletion of the Administrators group', async () => {
      const validId = new Types.ObjectId().toString();
      mockUserGroupModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ _id: validId, name: 'Administrators' }),
      });

      await expect(service.remove(validId)).rejects.toThrow(BadRequestException);
    });

    it('should prevent deletion of the Employee group', async () => {
      const validId = new Types.ObjectId().toString();
      mockUserGroupModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ _id: validId, name: 'Employee' }),
      });

      await expect(service.remove(validId)).rejects.toThrow(BadRequestException);
    });

    it('should allow deletion of custom non-system groups', async () => {
      const validId = new Types.ObjectId().toString();
      mockUserGroupModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ _id: validId, name: 'Custom Group' }),
      });
      mockUserGroupModel.findByIdAndDelete.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ _id: validId, name: 'Custom Group' }),
      });

      const result = await service.remove(validId);
      expect(result.name).toBe('Custom Group');
      expect(mockUserGroupModel.findByIdAndDelete).toHaveBeenCalledWith(validId);
    });
  });

  describe('validateGroupAgainstCatalog', () => {
    it('should reject invalid module in modulePermissions', () => {
      expect(() =>
        service.validateGroupAgainstCatalog({
          modulePermissions: [
            { module: 'invalid_module', create: true, read: true, update: true, delete: true },
          ],
        }),
      ).toThrow(BadRequestException);
    });

    it('should reject invalid operation in operationPermissions', () => {
      expect(() =>
        service.validateGroupAgainstCatalog({
          operationPermissions: [
            { module: 'tasks', operation: 'tasks.invalid_op' },
          ],
        }),
      ).toThrow(BadRequestException);
    });

    it('should reject invalid field in fieldPermissions', () => {
      expect(() =>
        service.validateGroupAgainstCatalog({
          fieldPermissions: [
            { model: 'tasks', field: 'non_existent_field' },
          ],
        }),
      ).toThrow(BadRequestException);
    });

    it('should accept valid catalog module, operation, and field permissions', () => {
      expect(() =>
        service.validateGroupAgainstCatalog({
          modulePermissions: [
            { module: 'users', create: true, read: true, update: true, delete: true },
            { module: 'user-groups', create: true, read: true, update: true, delete: true },
          ],
          operationPermissions: [
            { module: 'users', operation: 'users.manage' },
            { module: 'user-groups', operation: 'user-groups.manage' },
          ],
          fieldPermissions: [
            { model: 'tasks', field: 'title' },
          ],
        }),
      ).not.toThrow();
    });

    it('should accept valid module permissions with row-level scope', () => {
      expect(() =>
        service.validateGroupAgainstCatalog({
          modulePermissions: [
            { module: 'tasks', scope: 'team', create: true, read: true, update: true, delete: true },
            { module: 'projects', scope: 'all', create: true, read: true, update: true, delete: true },
            { module: 'employees', scope: 'own', create: true, read: true, update: true, delete: true },
          ],
        }),
      ).not.toThrow();
    });
  });

  describe('update', () => {
    it('should prevent renaming default Administrators group', async () => {
      const validId = new Types.ObjectId().toString();
      mockUserGroupModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ _id: validId, name: 'Administrators' }),
      });

      await expect(
        service.update(validId, { name: 'Renamed Admins' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should prevent renaming default Employee group', async () => {
      const validId = new Types.ObjectId().toString();
      mockUserGroupModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ _id: validId, name: 'Employee' }),
      });

      await expect(
        service.update(validId, { name: 'Renamed Employee' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('Caching and Invalidation', () => {
    let cacheService: any;
    let serviceWithCache: UserGroupsService;

    beforeEach(() => {
      cacheService = {
        get: jest.fn(),
        set: jest.fn(),
        invalidate: jest.fn(),
      };
      serviceWithCache = new UserGroupsService(mockUserGroupModel, cacheService);
    });

    it('should serve from cache if cached entry exists', async () => {
      const cachedGroups = [{ name: 'Employee' }];
      cacheService.get.mockReturnValue(cachedGroups);

      const result = await serviceWithCache.getEffectiveGroups('user1');
      expect(result).toBe(cachedGroups);
      expect(mockUserGroupModel.find).not.toHaveBeenCalled();
    });

    it('should query DB and store in cache on cache miss', async () => {
      cacheService.get.mockReturnValue(undefined);
      const dbGroups = [{ name: 'Employee' }];
      mockUserGroupModel.find.mockReturnValue({
        exec: jest.fn().mockResolvedValue(dbGroups),
      });

      const result = await serviceWithCache.getEffectiveGroups('user1');
      expect(result).toEqual(dbGroups);
      expect(cacheService.set).toHaveBeenCalledWith('user1', dbGroups);
    });

    it('should invalidate cache for user on membership addition', async () => {
      mockUserGroupModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ name: 'Administrators' }),
      });
      mockUserGroupModel.findOneAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ name: 'Administrators' }),
      });

      await serviceWithCache.addUserToGroup('user1', 'Administrators');
      expect(cacheService.invalidate).toHaveBeenCalledWith('user1');
    });

    it('should invalidate cache for user on removal from Admin group', async () => {
      mockUserGroupModel.findOneAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ name: 'Administrators' }),
      });

      await serviceWithCache.removeUserFromAdminGroup('user1');
      expect(cacheService.invalidate).toHaveBeenCalledWith('user1');
    });

    it('should invalidate entire cache on group create, update, or remove', async () => {
      // create
      const saveMock = jest.fn().mockResolvedValue({ name: 'NewGroup' });
      mockUserGroupModel = jest.fn().mockImplementation(() => ({
        save: saveMock,
      }));
      serviceWithCache = new UserGroupsService(mockUserGroupModel as any, cacheService);

      await serviceWithCache.create({
        name: 'NewGroup',
        modulePermissions: [],
      } as any);
      expect(cacheService.invalidate).toHaveBeenCalled();
    });
  });
});
