import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { ForbiddenException } from '@nestjs/common';
import { Types } from 'mongoose';
import { DashboardService } from './dashboard.service';
import { Task } from '../tasks/schemas/task.schema';
import { Employee } from '../employees/schemas/employee.schema';

describe('DashboardService', () => {
  let service: DashboardService;
  let taskModel: any;
  let employeeModel: any;

  const mockMyUserId = new Types.ObjectId().toString();
  const mockMyEmpId = new Types.ObjectId();
  const mockOtherEmpId = new Types.ObjectId();

  const mockMyEmployee = {
    _id: mockMyEmpId,
    fullName: { firstName: 'Alice', lastName: 'Self' },
    email: 'alice@example.com',
    role: 'Engineer',
    department: 'Engineering',
    status: 'Active',
    joiningDate: new Date('2024-01-01'),
  };

  const mockOtherEmployee = {
    _id: mockOtherEmpId,
    fullName: { firstName: 'Bob', lastName: 'Other' },
    email: 'bob@example.com',
    role: 'Designer',
    department: 'Design',
    status: 'Active',
    joiningDate: new Date('2024-02-01'),
  };

  beforeEach(async () => {
    taskModel = {
      aggregate: jest.fn().mockResolvedValue([
        {
          tasksCompleted: [{ count: 5 }],
          tasksCompletedPrev: [{ count: 4 }],
          openTasks: [{ total: 3, overdue: 1 }],
          hoursLogged: [{ totalSeconds: 36000 }],
          hoursLoggedPrev: [{ totalSeconds: 32000 }],
          completionTrend: [],
          departmentPerformance: [],
          statusDistribution: [],
          topPerformersCompleted: [],
          topPerformersHours: [],
          recentActivity: [],
          liveNow: [],
        },
      ]),
    };

    employeeModel = {
      find: jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue([mockMyEmployee, mockOtherEmployee]),
        }),
        exec: jest.fn().mockResolvedValue([mockMyEmployee, mockOtherEmployee]),
      }),
      findOne: jest.fn(),
      findById: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DashboardService,
        { provide: getModelToken(Task.name), useValue: taskModel },
        { provide: getModelToken(Employee.name), useValue: employeeModel },
      ],
    }).compile();

    service = module.get<DashboardService>(DashboardService);
  });

  describe('getEmployeeActivity', () => {
    it('should view employee activity when employeeId is omitted', async () => {
      employeeModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockMyEmployee),
      });

      const result = await service.getEmployeeActivity(
        { range: 'weekly' } as any,
        mockMyUserId,
        'alice@example.com',
        false,
      );

      expect(result).toBeDefined();
      expect(result.selectedEmployee?._id).toBe(mockMyEmpId.toString());
      expect(result.selectedEmployee?.name).toBe('Alice Self');
      expect(result.employeesList).toHaveLength(2);
    });

    it('should ALLOW viewing employee activity when query.employeeId is provided', async () => {
      employeeModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockMyEmployee),
      });
      employeeModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockOtherEmployee),
      });

      const result = await service.getEmployeeActivity(
        { range: 'weekly', employeeId: mockOtherEmpId.toString() } as any,
        mockMyUserId,
        'alice@example.com',
        false,
      );

      expect(result.selectedEmployee?._id).toBe(mockOtherEmpId.toString());
      expect(result.selectedEmployee?.name).toBe('Bob Other');
      expect(result.employeesList).toHaveLength(2);
    });

    it('should fallback to first employee if user has no employee profile', async () => {
      employeeModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockMyEmployee),
      });

      const result = await service.getEmployeeActivity(
        { range: 'weekly' } as any,
        mockMyUserId,
        'alice@example.com',
        false,
      );

      expect(result).toBeDefined();
      expect(result.selectedEmployee).toBeDefined();
    });
  });
});
