import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { DashboardService } from './dashboard.service';
import { Task } from '../tasks/schemas/task.schema';
import { Employee } from '../employees/schemas/employee.schema';
import { Team } from '../teams/schemas/team.schema';
import { makeTwoTenants } from '../../test/helpers/tenant-fixtures';

describe('DashboardService (P1-19 & MC-24)', () => {
  let service: DashboardService;
  let taskModel: any;
  let employeeModel: any;
  let teamModel: any;

  const mockCompanyId = new Types.ObjectId();
  const mockMyUserId = new Types.ObjectId().toString();
  const mockMyEmpId = new Types.ObjectId();
  const mockTeammateEmpId = new Types.ObjectId();
  const mockOtherEmpId = new Types.ObjectId();

  const mockMyEmployee = {
    _id: mockMyEmpId,
    companyId: mockCompanyId,
    fullName: { firstName: 'Alice', lastName: 'Self' },
    email: 'alice@example.com',
    role: 'Engineer',
    department: 'Engineering',
    status: 'Active',
    joiningDate: new Date('2024-01-01'),
  };

  const mockTeammateEmployee = {
    _id: mockTeammateEmpId,
    companyId: mockCompanyId,
    fullName: { firstName: 'Charlie', lastName: 'Teammate' },
    email: 'charlie@example.com',
    role: 'QA',
    department: 'Engineering',
    status: 'Active',
    joiningDate: new Date('2024-03-01'),
  };

  const mockOtherEmployee = {
    _id: mockOtherEmpId,
    companyId: mockCompanyId,
    fullName: { firstName: 'Bob', lastName: 'Other' },
    email: 'bob@example.com',
    role: 'Designer',
    department: 'Design',
    status: 'Active',
    joiningDate: new Date('2024-02-01'),
  };

  beforeEach(async () => {
    taskModel = {
      aggregate: jest.fn().mockImplementation((pipeline: any[]) => {
        // Return structured facet result for the big facet call
        if (pipeline && pipeline.some((stage) => stage.$facet)) {
          return Promise.resolve([
            {
              tasksCompleted: [{ count: 5 }],
              tasksCompletedPrev: [{ count: 4 }],
              openTasks: [{ total: 3, overdue: 1 }],
              hoursLogged: [{ totalSeconds: 36000 }],
              hoursLoggedPrev: [{ totalSeconds: 32000 }],
              completionTrend: [],
              departmentPerformance: [],
              statusDistribution: [],
              topPerformersCompleted: [{ _id: mockMyEmpId, tasksCompleted: 10 }],
              topPerformersHours: [{ _id: mockMyEmpId, totalSeconds: 7200 }],
              recentActivity: [],
              liveNow: [],
            },
          ]);
        }
        // Return default array for specific aggregates
        return Promise.resolve([]);
      }),
    };

    employeeModel = {
      find: jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue([mockMyEmployee, mockTeammateEmployee, mockOtherEmployee]),
        }),
        exec: jest.fn().mockResolvedValue([mockMyEmployee, mockTeammateEmployee, mockOtherEmployee]),
      }),
      findOne: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockMyEmployee),
      }),
      findById: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockMyEmployee),
      }),
    };

    teamModel = {
      find: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue([
              {
                _id: new Types.ObjectId(),
                companyId: mockCompanyId,
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
        const result = await service.getEmployeeActivity(
          { range: 'weekly' } as any,
          mockMyUserId,
          'alice@example.com',
          false,
          'own',
        );

        expect(result.selectedEmployee?._id).toBe(mockMyEmpId.toString());
        expect(result.selectedEmployee?.name).toBe('Alice Self');
        expect(result.employeesList).toHaveLength(1);
        expect(result.employeesList[0]._id).toBe(mockMyEmpId.toString());
      });

      it('ALLOWS viewing own activity when employeeId matches caller own employee ID', async () => {
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
        employeeModel.findById.mockReturnValue({
          exec: jest.fn().mockResolvedValue(mockTeammateEmployee),
        });
        employeeModel.find.mockReturnValue({
          sort: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue([mockMyEmployee, mockTeammateEmployee]),
          }),
          exec: jest.fn().mockResolvedValue([mockMyEmployee, mockTeammateEmployee]),
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
        expect(result.employeesList).toHaveLength(2);
      });

      it('REJECTS with 403 ForbiddenException when requesting activity of employee outside team', async () => {
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

  describe('Company Scoping & Aggregate Pipeline Isolation (MC-24)', () => {
    it('resolves caller employee via membership employeeId before falling back to userId/email', async () => {
      const membershipEmpId = new Types.ObjectId();
      const membershipEmployee = {
        _id: membershipEmpId,
        companyId: mockCompanyId,
        fullName: { firstName: 'Member', lastName: 'Emp' },
        email: 'member@example.com',
      };

      employeeModel.findOne.mockImplementation(({ _id, companyId }: any) => {
        if (_id?.toString() === membershipEmpId.toString() && companyId?.toString() === mockCompanyId.toString()) {
          return { exec: jest.fn().mockResolvedValue(membershipEmployee) };
        }
        return { exec: jest.fn().mockResolvedValue(null) };
      });

      const result = await service.getEmployeeActivity(
        { range: 'weekly' } as any,
        mockMyUserId,
        'member@example.com',
        mockCompanyId,
        membershipEmpId,
      );

      expect(employeeModel.findOne).toHaveBeenCalledWith({
        _id: membershipEmpId,
        companyId: mockCompanyId,
      });
      expect(result.selectedEmployee?._id).toBe(membershipEmpId.toString());
    });

    it('limits fallback employee lookup to this company when user has no matching employee profile', async () => {
      employeeModel.findOne.mockImplementation((filter: any) => {
        if (filter.userId || filter.email || filter._id) {
          return { exec: jest.fn().mockResolvedValue(null) };
        }
        if (filter.companyId?.toString() === mockCompanyId.toString()) {
          return { exec: jest.fn().mockResolvedValue(mockMyEmployee) };
        }
        return { exec: jest.fn().mockResolvedValue(null) };
      });

      await service.getEmployeeActivity(
        { range: 'weekly' } as any,
        mockMyUserId,
        'nomatch@example.com',
        mockCompanyId,
      );

      expect(employeeModel.findOne).toHaveBeenCalledWith({ companyId: mockCompanyId });
    });

    it('filters allEmployees by companyId', async () => {
      await service.getEmployeeActivity(
        { range: 'weekly' } as any,
        mockMyUserId,
        'alice@example.com',
        mockCompanyId,
      );

      expect(employeeModel.find).toHaveBeenCalledWith(
        { companyId: mockCompanyId },
        expect.anything(),
      );
    });

    it('puts { $match: { companyId } } as the FIRST stage of the big $facet aggregate', async () => {
      await service.getEmployeeActivity(
        { range: 'weekly' } as any,
        mockMyUserId,
        'alice@example.com',
        mockCompanyId,
      );

      // Verify that the aggregate pipeline with $facet had { $match: { companyId } } as its first stage
      const calls = taskModel.aggregate.mock.calls;
      const facetCall = calls.find((callArgs: any[]) =>
        callArgs[0] && Array.isArray(callArgs[0]) && callArgs[0].some((stage: any) => stage.$facet),
      );

      expect(facetCall).toBeDefined();
      const pipeline = facetCall[0];
      expect(pipeline[0]).toEqual({ $match: { companyId: mockCompanyId } });
      expect(pipeline[1]).toHaveProperty('$facet');

      // Verify that inside departmentPerformance and liveNow, the $lookup matches companyId
      const facetObj = pipeline[1].$facet;
      const deptLookup = facetObj.departmentPerformance.find((s: any) => s.$lookup);
      expect(deptLookup.$lookup.pipeline[0]).toEqual({
        $match: {
          $expr: { $eq: ['$_id', '$$assigneeId'] },
          companyId: mockCompanyId,
        },
      });

      const liveLookup = facetObj.liveNow.find((s: any) => s.$lookup);
      expect(liveLookup.$lookup.pipeline[0]).toEqual({
        $match: {
          $expr: { $eq: ['$_id', '$$assigneeId'] },
          companyId: mockCompanyId,
        },
      });
    });

    it('includes companyId in first stage of all other aggregates', async () => {
      await service.getEmployeeActivity(
        { range: 'weekly' } as any,
        mockMyUserId,
        'alice@example.com',
        mockCompanyId,
      );

      const calls = taskModel.aggregate.mock.calls;
      // All calls to taskModel.aggregate must have companyId in their first stage ($match)
      for (const callArgs of calls) {
        const pipeline = callArgs[0];
        expect(Array.isArray(pipeline)).toBe(true);
        expect(pipeline.length).toBeGreaterThan(0);
        const firstStage = pipeline[0];
        expect(firstStage).toHaveProperty('$match');
        if (firstStage.$match.companyId) {
          expect(firstStage.$match.companyId.toString()).toBe(mockCompanyId.toString());
        } else {
          // In case $match is matchQuery (recentActivity)
          expect(firstStage.$match).toHaveProperty('companyId', mockCompanyId);
        }
      }
    });

    it('filters topPerformers employee fetch by companyId', async () => {
      await service.getEmployeeActivity(
        { range: 'weekly' } as any,
        mockMyUserId,
        'alice@example.com',
        mockCompanyId,
      );

      expect(employeeModel.find).toHaveBeenCalledWith(
        expect.objectContaining({
          companyId: mockCompanyId,
          _id: expect.anything(),
        }),
      );
    });

    it('throws 404 NotFoundException if query.employeeId does not belong to the company', async () => {
      const otherEmpId = new Types.ObjectId();
      employeeModel.findOne.mockImplementation(({ _id, companyId }: any) => {
        if (_id?.toString() === otherEmpId.toString() && companyId?.toString() === mockCompanyId.toString()) {
          return { exec: jest.fn().mockResolvedValue(null) }; // Not found in this company
        }
        return { exec: jest.fn().mockResolvedValue(mockMyEmployee) };
      });

      await expect(
        service.getEmployeeActivity(
          { range: 'weekly', employeeId: otherEmpId.toString() } as any,
          mockMyUserId,
          'alice@example.com',
          mockCompanyId,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('cross-tenant test: employee from Company A requested under Company B route throws 404 NotFoundException', async () => {
      const { A: companyA, B: companyB } = makeTwoTenants();
      const empFromAId = new Types.ObjectId();

      employeeModel.findOne.mockImplementation(({ _id, companyId }: any) => {
        if (_id?.toString() === empFromAId.toString() && companyId?.toString() === companyB.companyId.toString()) {
          return { exec: jest.fn().mockResolvedValue(null) };
        }
        return { exec: jest.fn().mockResolvedValue(mockMyEmployee) };
      });

      await expect(
        service.getEmployeeActivity(
          { range: 'weekly', employeeId: empFromAId.toString() } as any,
          companyB.ownerUserId.toString(),
          'admin@beta.com',
          companyB.companyId,
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
