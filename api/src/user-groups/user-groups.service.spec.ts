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
});
