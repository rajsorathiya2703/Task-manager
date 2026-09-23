import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { EmployeesService } from '../employees/employees.service';

describe('UsersController', () => {
  let controller: UsersController;
  let usersService: jest.Mocked<UsersService>;
  let employeesService: jest.Mocked<EmployeesService>;

  beforeEach(async () => {
    usersService = {
      findAll: jest.fn(),
      findById: jest.fn(),
      updateUser: jest.fn(),
      remove: jest.fn(),
      countSystemAdmins: jest.fn(),
    } as any;

    employeesService = {
      createFromUser: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        { provide: UsersService, useValue: usersService },
        { provide: EmployeesService, useValue: employeesService },
      ],
    }).compile();

    controller = module.get<UsersController>(UsersController);
  });

  describe('update', () => {
    it('should update user profile fields', async () => {
      const updatedUser = { _id: 'user1', name: 'New Name' } as any;
      usersService.updateUser.mockResolvedValue(updatedUser);

      const result = await controller.update('user1', { name: 'New Name' });

      expect(result).toBe(updatedUser);
      expect(usersService.updateUser).toHaveBeenCalledWith('user1', { name: 'New Name' });
    });
  });

  describe('remove', () => {
    it('should delete a user', async () => {
      usersService.findById.mockResolvedValue({ _id: 'user1' } as any);
      usersService.remove.mockResolvedValue({ _id: 'user1' } as any);

      const result = await controller.remove('user1');
      expect(result).toEqual({ _id: 'user1' });
      expect(usersService.remove).toHaveBeenCalledWith('user1');
    });
  });
});
