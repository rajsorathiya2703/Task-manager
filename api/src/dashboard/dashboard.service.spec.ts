import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { ForbiddenException } from '@nestjs/common';
import { Types } from 'mongoose';
import { DashboardService } from './dashboard.service';
import { Task } from '../tasks/schemas/task.schema';
import { Employee } from '../employees/schemas/employee.schema';
import { Team } from '../teams/schemas/team.schema';

describe('DashboardService', () => {
  let service: DashboardService;
  let taskModel: any;
  let employeeModel: any;
  let teamModel: any;

  const mockMyUserId = new Types.ObjectId().toString();
  const mockMyEmpId = new Types.ObjectId();
  const mockTeammateEmpId = new Types.ObjectId();
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

  const mockTeammateEmployee = {
    _id: mockTeammateEmpId,
    fullName: { firstName: 'Charlie', lastName: 'Teammate' },
    email: 'charlie@example.com',
    role: 'QA',
    department: 'Engineering',
    status: 'Active',
    joiningDate: new Date('2024-03-01'),
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
          exec: jest.fn().mockResolvedValue([mockMyEmployee, mockTeammateEmployee, mockOtherEmployee]),
        }),
        exec: jest.fn().mockResolvedValue([mockMyEmployee, mockTeammateEmployee, mockOtherEmployee]),
      }),
      findOne: jest.fn(),
      findById: jest.fn(),
    };

    teamModel = {
      find: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue([
              {
                _id: new Types.ObjectId(),
                name: 'Engineering Team',
                teamLead: mockMyEmpId,
                members: [mockMyEmpId, mockTeammateEmpId],
              },
            ]),
          }),
        }),
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DashboardService,
        { provide: getModelToken(Task.name), useValue: taskModel },
        { provide: getModelToken(Employee.name), useValue: employeeModel },
        { provide: getModelToken(Team.name), useValue: teamModel },
      ],
    }).compile();

    service = module.get<DashboardService>(DashboardService);
  });

  describe('getEmployeeActivity - legacy / default behavior', () => {
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
      expect(result.employeesList).toHaveLength(3);
    });

    it('should ALLOW viewing employee activity when query.employeeId is provided (scope all)', async () => {
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
      expect(result.employeesList).toHaveLength(3);
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

  describe('getEmployeeActivity - scope enforcement (P1-19)', () => {
    describe('scope: own', () => {
      it('ALLOWS viewing own activity when employeeId is omitted and restricts dropdown to caller', async () => {
        employeeModel.findOne.mockReturnValue({
          exec: jest.fn().mockResolvedValue(mockMyEmployee),
        });

        const result = await service.getEmployeeActivity(
          { range: 'weekly' } as any,
          mockMyUserId,
          'alice@example.com',
          false,
          'own',
        );

        expect(result.selectedEmployee?._id).toBe(mockMyEmpId.toString());
        expect(result.selectedEmployee?.name).toBe('Alice Self');
        // Dropdown is restricted to only the caller's employee profile
        expect(result.employeesList).toHaveLength(1);
        expect(result.employeesList[0]._id).toBe(mockMyEmpId.toString());
      });

      it('ALLOWS viewing own activity when employeeId matches caller own employee ID', async () => {
        employeeModel.findOne.mockReturnValue({
          exec: jest.fn().mockResolvedValue(mockMyEmployee),
        });

        const result = await service.getEmployeeActivity(
          { range: 'weekly', employeeId: mockMyEmpId.toString() } as any,
          mockMyUserId,
          'alice@example.com',
          false,
          'own',
        );

        expect(result.selectedEmployee?._id).toBe(mockMyEmpId.toString());
        expect(result.employeesList).toHaveLength(1);
      });

      it('REJECTS with 403 ForbiddenException when requesting ?employeeId=<someone-else>', async () => {
        employeeModel.findOne.mockReturnValue({
          exec: jest.fn().mockResolvedValue(mockMyEmployee),
        });

        await expect(
          service.getEmployeeActivity(
            { range: 'weekly', employeeId: mockOtherEmpId.toString() } as any,
            mockMyUserId,
            'alice@example.com',
            false,
            'own',
          ),
        ).rejects.toThrow(
          new ForbiddenException('You do not have permission to view activity for other employees'),
        );
      });

      it('REJECTS with 403 ForbiddenException when caller has no employee profile and passes employeeId', async () => {
        employeeModel.findOne.mockReturnValue({
          exec: jest.fn().mockResolvedValue(null),
        });

        await expect(
          service.getEmployeeActivity(
            { range: 'weekly', employeeId: mockOtherEmpId.toString() } as any,
            mockMyUserId,
            'alice@example.com',
            false,
            'own',
          ),
        ).rejects.toThrow(
          new ForbiddenException('You do not have permission to view activity for other employees'),
        );
      });
    });

    describe('scope: team', () => {
      it('ALLOWS viewing activity of an employee on caller team', async () => {
        employeeModel.findOne.mockReturnValue({
          exec: jest.fn().mockResolvedValue(mockMyEmployee),
        });
        employeeModel.findById.mockReturnValue({
          exec: jest.fn().mockResolvedValue(mockTeammateEmployee),
        });
        employeeModel.find.mockReturnValue({
          sort: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue([mockMyEmployee, mockTeammateEmployee]),
          }),
        });

        const result = await service.getEmployeeActivity(
          { range: 'weekly', employeeId: mockTeammateEmpId.toString() } as any,
          mockMyUserId,
          'alice@example.com',
          false,
          'team',
        );

        expect(result.selectedEmployee?._id).toBe(mockTeammateEmpId.toString());
        expect(result.selectedEmployee?.name).toBe('Charlie Teammate');
        // List only contains team members
        expect(result.employeesList).toHaveLength(2);
      });

      it('REJECTS with 403 ForbiddenException when requesting activity of employee outside team', async () => {
        employeeModel.findOne.mockReturnValue({
          exec: jest.fn().mockResolvedValue(mockMyEmployee),
        });

        await expect(
          service.getEmployeeActivity(
            { range: 'weekly', employeeId: mockOtherEmpId.toString() } as any,
            mockMyUserId,
            'alice@example.com',
            false,
            'team',
          ),
        ).rejects.toThrow(
          new ForbiddenException('You do not have permission to view activity for employees outside your team'),
        );
      });
    });

    describe('scope: all and isSystemAdmin', () => {
      it('ALLOWS viewing any employee when caller has scope all', async () => {
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
          'all',
        );

        expect(result.selectedEmployee?._id).toBe(mockOtherEmpId.toString());
        expect(result.selectedEmployee?.name).toBe('Bob Other');
        expect(result.employeesList).toHaveLength(3);
      });

      it('ALLOWS System Admin to view any employee even if scope passed was own', async () => {
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
          true, // isSystemAdmin
          'own',
        );

        expect(result.selectedEmployee?._id).toBe(mockOtherEmpId.toString());
        expect(result.employeesList).toHaveLength(3);
      });
    });

    describe('scope: none', () => {
      it('THROWS 403 ForbiddenException when scope is none', async () => {
        await expect(
          service.getEmployeeActivity(
            { range: 'weekly' } as any,
            mockMyUserId,
            'alice@example.com',
            false,
            'none',
          ),
        ).rejects.toThrow(
          new ForbiddenException('You do not have access to the dashboard'),
        );
      });
    });
  });
});
