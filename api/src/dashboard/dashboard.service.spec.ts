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

  describe('getEmployeeActivity row-level access control', () => {
    it('should ALLOW non-admin to view their own activity when employeeId is omitted', async () => {
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
      // For non-admin, employeesList should only contain themselves
      expect(result.employeesList).toHaveLength(1);
      expect(result.employeesList[0]._id).toBe(mockMyEmpId.toString());
    });

    it('should ALLOW non-admin to view their own activity when query.employeeId matches their own ID', async () => {
      employeeModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockMyEmployee),
      });

      const result = await service.getEmployeeActivity(
        { range: 'weekly', employeeId: mockMyEmpId.toString() } as any,
        mockMyUserId,
        'alice@example.com',
        false,
      );

      expect(result.selectedEmployee?._id).toBe(mockMyEmpId.toString());
    });

    it('should THROW ForbiddenException when non-admin queries another user employeeId', async () => {
      employeeModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockMyEmployee),
      });

      await expect(
        service.getEmployeeActivity(
          { range: 'weekly', employeeId: mockOtherEmpId.toString() } as any,
          mockMyUserId,
          'alice@example.com',
          false,
        ),
      ).rejects.toThrow(
        /Access Denied: You do not have permission to view other employees' activity data./,
      );
    });

    it('should THROW ForbiddenException if user has no employee profile', async () => {
      employeeModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(
        service.getEmployeeActivity(
          { range: 'weekly' } as any,
          mockMyUserId,
          'alice@example.com',
          false,
        ),
      ).rejects.toThrow(
        /No employee profile found for your account. An active employee profile is required to access the activity dashboard./,
      );
    });

    it('should ALLOW system admin to view ANY employee activity via query.employeeId', async () => {
      employeeModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockMyEmployee),
      });
      employeeModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockOtherEmployee),
      });

      const result = await service.getEmployeeActivity(
        { range: 'weekly', employeeId: mockOtherEmpId.toString() } as any,
        mockMyUserId,
        'admin@example.com',
        true, // isSystemAdmin: true
      );

      expect(result.selectedEmployee?._id).toBe(mockOtherEmpId.toString());
      expect(result.selectedEmployee?.name).toBe('Bob Other');
      // For admin, employeesList contains all employees for selector
      expect(result.employeesList).toHaveLength(2);
    });
  });
});
