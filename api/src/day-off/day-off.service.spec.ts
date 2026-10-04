import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { Types } from 'mongoose';
import { DayOffService } from './day-off.service';
import { LeaveType } from './schemas/leave-type.schema';
import { LeaveApplication } from './schemas/leave-application.schema';
import { DayOffSettings } from './schemas/day-off-settings.schema';
import { LeaveBalance } from './schemas/leave-balance.schema';
import { Notification } from './schemas/notification.schema';
import { Employee } from '../employees/schemas/employee.schema';
import { Team } from '../teams/schemas/team.schema';
import { Company } from '../companies/schemas/company.schema';
import { DayOffMailService } from './day-off-mail.service';

describe('DayOffService - Scope Filtering & Approvals (P1-18)', () => {
  let service: DayOffService;
  let applicationModel: any;
  let employeeModel: any;
  let teamModel: any;
  let companyModel: any;
  let leaveTypeModel: any;
  let settingsModel: any;
  let balanceModel: any;
  let notificationModel: any;
  let mailService: any;

  // Personas
  const aliceUserId = new Types.ObjectId().toString();
  const aliceEmpId = new Types.ObjectId();
  const aliceEmail = 'alice@example.com';
  const aliceUser = { id: aliceUserId, _id: aliceUserId, email: aliceEmail, name: 'Alice Leader' };

  const bobUserId = new Types.ObjectId().toString();
  const bobEmpId = new Types.ObjectId();
  const bobEmail = 'bob@example.com';

  const charlieUserId = new Types.ObjectId().toString();
  const charlieEmpId = new Types.ObjectId();
  const charlieEmail = 'charlie@example.com';

  const adminUserId = new Types.ObjectId().toString();
  const adminEmail = 'admin@example.com';
  const adminUser = { id: adminUserId, _id: adminUserId, email: adminEmail, name: 'Admin User' };

  const teamAlphaId = new Types.ObjectId();
  const teamBetaId = new Types.ObjectId();

  const appBob = {
    _id: new Types.ObjectId(),
    employeeId: bobEmpId,
    userId: new Types.ObjectId(bobUserId),
    leaveTypeId: new Types.ObjectId(),
    fromDate: new Date('2026-06-01'),
    toDate: new Date('2026-06-05'),
    daysCount: 5,
    reason: 'Summer vacation',
    status: 'pending',
    save: jest.fn().mockResolvedValue(true),
  };

  const appCharlie = {
    _id: new Types.ObjectId(),
    employeeId: charlieEmpId,
    userId: new Types.ObjectId(charlieUserId),
    leaveTypeId: new Types.ObjectId(),
    fromDate: new Date('2026-07-01'),
    toDate: new Date('2026-07-03'),
    daysCount: 3,
    reason: 'Family event',
    status: 'pending',
    save: jest.fn().mockResolvedValue(true),
  };

  beforeEach(async () => {
    const mockFindChain = {
      populate: jest.fn().mockReturnThis(),
      sort: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      lean: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([]),
    };

    applicationModel = {
      find: jest.fn().mockReturnValue(mockFindChain),
      findById: jest.fn(),
      create: jest.fn(),
    };

    employeeModel = {
      find: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue([]),
          }),
        }),
      }),
    };

    teamModel = {
      find: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue([]),
          }),
        }),
      }),
    };

    leaveTypeModel = {
      countDocuments: jest.fn().mockResolvedValue(1),
      findById: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          _id: new Types.ObjectId(),
          name: 'Vacation',
          defaultAllocation: 10,
        }),
      }),
    };

    companyModel = {
      findById: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(null) }),
      findOne: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(null) }),
    };

    settingsModel = {
      countDocuments: jest.fn().mockResolvedValue(1),
      findOne: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(null) }),
      create: jest.fn().mockImplementation((doc) => Promise.resolve({ ...doc, save: jest.fn().mockResolvedValue(doc) })),
    };

    const mockBalance = {
      allocatedDays: 10,
      usedDays: 0,
      remainingDays: 10,
      save: jest.fn().mockResolvedValue(true),
    };

    function MockBalanceModel(this: any, data: any) {
      Object.assign(this, mockBalance, data);
      this.save = jest.fn().mockResolvedValue(this);
    }
    (MockBalanceModel as any).find = jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue([]),
    });
    (MockBalanceModel as any).findOne = jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue(mockBalance),
    });
    (MockBalanceModel as any).findOneAndUpdate = jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue(mockBalance),
    });
    (MockBalanceModel as any).create = jest.fn().mockResolvedValue(mockBalance);

    balanceModel = MockBalanceModel;

    function MockNotificationModel(this: any, data: any) {
      Object.assign(this, data);
      this.save = jest.fn().mockResolvedValue(this);
    }
    (MockNotificationModel as any).create = jest.fn().mockResolvedValue(true);
    notificationModel = MockNotificationModel;

    mailService = {
      sendLeaveAppliedToAdmin: jest.fn().mockResolvedValue(true),
      sendLeaveRequestToAdmin: jest.fn().mockResolvedValue(true),
      sendLeaveApprovedToEmployee: jest.fn().mockResolvedValue(true),
      sendLeaveRejectedToEmployee: jest.fn().mockResolvedValue(true),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DayOffService,
        { provide: getModelToken(LeaveType.name), useValue: leaveTypeModel },
        { provide: getModelToken(LeaveApplication.name), useValue: applicationModel },
        { provide: getModelToken(DayOffSettings.name), useValue: settingsModel },
        { provide: getModelToken(LeaveBalance.name), useValue: balanceModel },
        { provide: getModelToken(Notification.name), useValue: notificationModel },
        { provide: getModelToken(Employee.name), useValue: employeeModel },
        { provide: getModelToken(Team.name), useValue: teamModel },
        { provide: getModelToken(Company.name), useValue: companyModel },
        { provide: DayOffMailService, useValue: mailService },
      ],
    }).compile();

    service = module.get<DayOffService>(DayOffService);
  });

  describe('getAllApplications (Team Leader scope filtering)', () => {
    it('returns empty array immediately when scope is none', async () => {
      const result = await service.getAllApplications({}, aliceUser, 'none');
      expect(result).toEqual([]);
      expect(applicationModel.find).not.toHaveBeenCalled();
    });

    it('returns all applications unconstrained when scope is all', async () => {
      const mockQuery = {
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([appBob, appCharlie]),
      };
      applicationModel.find.mockReturnValue(mockQuery);

      const result = await service.getAllApplications({}, adminUser, 'all');
      expect(result).toEqual([appBob, appCharlie]);
      expect(applicationModel.find).toHaveBeenCalledWith({});
    });

    it('returns all applications unconstrained when caller is System Admin', async () => {
      const mockQuery = {
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([appBob, appCharlie]),
      };
      applicationModel.find.mockReturnValue(mockQuery);

      const result = await service.getAllApplications({}, adminUser, 'team', true);
      expect(result).toEqual([appBob, appCharlie]);
      expect(applicationModel.find).toHaveBeenCalledWith({});
    });

    it('FILTERS results to only team members when Team Leader calls with scope team (excludes other teams)', async () => {
      // 1. Resolve Alice's employee record
      employeeModel.find.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue([{ _id: aliceEmpId }]),
          }),
        }),
      });

      // 2. Resolve Alice's teams: Alice is team lead of Team Alpha (members: Alice, Bob)
      teamModel.find.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue([
              {
                _id: teamAlphaId,
                teamLead: aliceEmpId,
                members: [aliceEmpId, bobEmpId],
              },
            ]),
          }),
        }),
      });

      // 3. Mock applicationModel.find returning only Bob's application
      const mockQuery = {
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([appBob]),
      };
      applicationModel.find.mockReturnValue(mockQuery);

      const result = await service.getAllApplications({}, aliceUser, 'team', false);

      // Verify that Alice sees Bob's application and Charlie is not included
      expect(result).toEqual([appBob]);

      // Verify query filter explicitly includes Team Alpha members and excludes Charlie
      expect(applicationModel.find).toHaveBeenCalledWith(
        expect.objectContaining({
          $or: expect.arrayContaining([
            expect.objectContaining({
              employeeId: {
                $in: expect.arrayContaining([aliceEmpId, bobEmpId]),
              },
            }),
          ]),
        }),
      );

      // Ensure Charlie's employee ID is not in the filter
      const lastCallArg = applicationModel.find.mock.calls[0][0];
      const inArray = lastCallArg.$or[0].employeeId.$in.map((id: any) => id.toString());
      expect(inArray).toContain(aliceEmpId.toString());
      expect(inArray).toContain(bobEmpId.toString());
      expect(inArray).not.toContain(charlieEmpId.toString());
    });
  });

  describe('updateApplicationStatus (Team Leader scope enforcement)', () => {
    it('ALLOWS Team Leader to approve application for an applicant on their team', async () => {
      applicationModel.findById.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue({
              ...appBob,
              employeeId: { _id: bobEmpId, email: bobEmail, fullName: { firstName: 'Bob', lastName: 'Jones' } },
              leaveTypeId: { _id: new Types.ObjectId(), name: 'Vacation' },
            }),
          }),
        }),
      });

      // Alice's employee lookup
      employeeModel.find.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue([{ _id: aliceEmpId }]),
          }),
        }),
      });

      // Team lookup: Alice leads Team Alpha with Bob as member
      teamModel.find.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue([
              { _id: teamAlphaId, teamLead: aliceEmpId, members: [aliceEmpId, bobEmpId] },
            ]),
          }),
        }),
      });

      const result = await service.updateApplicationStatus(
        appBob._id.toString(),
        'approved',
        aliceUser,
        'Approved by team leader',
        'team',
        false,
      );

      expect(result.status).toBe('approved');
      expect(result.approvedBy).toBe('Alice Leader');
    });

    it('THROWS ForbiddenException when Team Leader attempts to approve application outside their team', async () => {
      // Charlie is on Team Beta, not Team Alpha
      applicationModel.findById.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue({
              ...appCharlie,
              employeeId: { _id: charlieEmpId, email: charlieEmail, fullName: { firstName: 'Charlie' } },
              leaveTypeId: { _id: new Types.ObjectId(), name: 'Medical' },
            }),
          }),
        }),
      });

      // Alice's employee lookup
      employeeModel.find.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue([{ _id: aliceEmpId }]),
          }),
        }),
      });

      // Team lookup: Alice only leads Team Alpha (Bob is member, not Charlie)
      teamModel.find.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue([
              { _id: teamAlphaId, teamLead: aliceEmpId, members: [aliceEmpId, bobEmpId] },
            ]),
          }),
        }),
      });

      await expect(
        service.updateApplicationStatus(
          appCharlie._id.toString(),
          'approved',
          aliceUser,
          'Unauthorized attempt',
          'team',
          false,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('ALLOWS Admin to approve application on any team', async () => {
      applicationModel.findById.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue({
              ...appCharlie,
              employeeId: { _id: charlieEmpId, email: charlieEmail, fullName: { firstName: 'Charlie' } },
              leaveTypeId: { _id: new Types.ObjectId(), name: 'Medical' },
            }),
          }),
        }),
      });

      const result = await service.updateApplicationStatus(
        appCharlie._id.toString(),
        'approved',
        adminUser,
        'Admin approval',
        'all',
        true,
      );

      expect(result.status).toBe('approved');
      expect(result.approvedBy).toBe('Admin User');
    });
  });

  describe('Company Scoping (MC-27)', () => {
    const companyA = new Types.ObjectId();
    const companyB = new Types.ObjectId();
    const testEmpId = new Types.ObjectId();

    describe('seedCompanyDefaults', () => {
      it('seeds settings and default leave types stamped with companyId', async () => {
        leaveTypeModel.countDocuments = jest.fn().mockResolvedValue(0);
        leaveTypeModel.insertMany = jest.fn().mockResolvedValue([]);
        settingsModel.findOne = jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });
        settingsModel.create = jest.fn().mockResolvedValue({ companyId: companyA });

        await service.seedCompanyDefaults(companyA, 'admin@companya.com');

        expect(settingsModel.create).toHaveBeenCalledWith(
          expect.objectContaining({
            companyId: companyA,
            defaultAdminEmail: 'admin@companya.com',
            isEnabled: true,
          }),
        );
        expect(leaveTypeModel.insertMany).toHaveBeenCalledWith(
          expect.arrayContaining([
            expect.objectContaining({
              code: 'PAID',
              companyId: companyA,
            }),
            expect.objectContaining({
              code: 'UNPAID',
              companyId: companyA,
            }),
            expect.objectContaining({
              code: 'HALF_DAY',
              companyId: companyA,
            }),
            expect.objectContaining({
              code: 'MEDICAL',
              companyId: companyA,
            }),
          ]),
        );
      });

      it('does not re-seed leave types if already existing for company', async () => {
        leaveTypeModel.countDocuments = jest.fn().mockResolvedValue(4);
        leaveTypeModel.insertMany = jest.fn();
        settingsModel.findOne = jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue({ companyId: companyA }),
        });

        await service.seedCompanyDefaults(companyA, 'admin@companya.com');

        expect(leaveTypeModel.insertMany).not.toHaveBeenCalled();
      });
    });

    describe('getSettings / updateSettings scoping', () => {
      it('creates settings on demand using company contactEmail when missing', async () => {
        settingsModel.findOne = jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });
        companyModel.findById = jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue({
            _id: companyA,
            contactEmail: 'contact@companya.com',
          }),
        });
        settingsModel.create = jest.fn().mockImplementation((data) => Promise.resolve(data));

        const settings = await service.getSettings(companyA);

        expect(settingsModel.findOne).toHaveBeenCalledWith({ companyId: companyA });
        expect(companyModel.findById).toHaveBeenCalledWith(companyA);
        expect(settingsModel.create).toHaveBeenCalledWith(
          expect.objectContaining({
            companyId: companyA,
            defaultAdminEmail: 'contact@companya.com',
            isEnabled: true,
          }),
        );
      });
    });

    describe('Leave Types Scoping: Leave type from A not visible in B', () => {
      it('scopes getLeaveTypes by companyId so Company A types are not returned for Company B', async () => {
        const mockSort = jest.fn();
        leaveTypeModel.find = jest.fn().mockImplementation((filter) => {
          if (filter.companyId?.toString() === companyA.toString()) {
            mockSort.mockReturnValue({
              exec: jest.fn().mockResolvedValue([{ _id: new Types.ObjectId(), name: 'Company A Custom Leave', companyId: companyA }]),
            });
          } else {
            mockSort.mockReturnValue({
              exec: jest.fn().mockResolvedValue([]),
            });
          }
          return { sort: mockSort };
        });

        const typesA = await service.getLeaveTypes(companyA);
        expect(typesA.length).toBe(1);
        expect(typesA[0].companyId).toEqual(companyA);

        const typesB = await service.getLeaveTypes(companyB);
        expect(typesB.length).toBe(0);
        expect(leaveTypeModel.find).toHaveBeenCalledWith({ companyId: companyB });
      });

      it('stamps companyId on created leave type', async () => {
        function MockLeaveType(this: any, data: any) {
          Object.assign(this, data);
          this.save = jest.fn().mockResolvedValue(this);
        }
        (service as any).leaveTypeModel = MockLeaveType;

        const created = await service.createLeaveType(companyA, {
          name: 'Floating Holiday',
        });

        expect(created.companyId).toEqual(companyA);
        expect(created.code).toBe('FLOATING_HOLIDAY');

        // Restore mock
        (service as any).leaveTypeModel = leaveTypeModel;
      });
    });

    describe('Leave Balances Scoping: balance created under the right company', () => {
      it('creates missing leave balance stamped with the specified companyId', async () => {
        const leaveTypeA = {
          _id: new Types.ObjectId(),
          name: 'Paid Leave',
          defaultAllocation: 14,
          companyId: companyA,
        };

        leaveTypeModel.find = jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue([leaveTypeA]),
        });
        (balanceModel as any).find = jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue([]),
        });
        (balanceModel as any).create = jest.fn().mockImplementation((data) => Promise.resolve(data));

        const balances = await service.getEmployeeBalances(companyA, testEmpId, 2026);

        expect(leaveTypeModel.find).toHaveBeenCalledWith({ companyId: companyA, isActive: true });
        expect((balanceModel as any).find).toHaveBeenCalledWith({
          companyId: companyA,
          employeeId: testEmpId,
          year: 2026,
        });
        expect((balanceModel as any).create).toHaveBeenCalledWith(
          expect.objectContaining({
            companyId: companyA,
            employeeId: testEmpId,
            leaveTypeId: leaveTypeA._id,
            year: 2026,
            allocated: 14,
            used: 0,
          }),
        );
        expect(balances[0].allocated).toBe(14);
      });
    });

    describe('applyLeave Scoping', () => {
      it('rejects applyLeave when leave type does not belong to the company', async () => {
        const otherCompanyLeaveTypeId = new Types.ObjectId();
        employeeModel.findOne = jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue({
            _id: testEmpId,
            companyId: companyA,
            fullName: { firstName: 'Test', lastName: 'Employee' },
          }),
        });

        // Leave type lookup with companyA filter returns null
        leaveTypeModel.findOne = jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(null),
        });

        await expect(
          service.applyLeave(companyA, testEmpId, aliceUser, {
            leaveTypeId: otherCompanyLeaveTypeId.toString(),
            fromDate: '2026-08-01',
            toDate: '2026-08-03',
            reason: 'Vacation',
          }),
        ).rejects.toThrow('Selected Leave Type is invalid or currently inactive.');

        expect(leaveTypeModel.findOne).toHaveBeenCalledWith({
          _id: otherCompanyLeaveTypeId,
          companyId: companyA,
        });
      });
    });

    describe('approveByToken Scoping', () => {
      it('rejects approval when application does not belong to the specified company', async () => {
        const appId = new Types.ObjectId().toString();
        const token = 'valid-token';

        // Application belongs to companyA
        applicationModel.findOne = jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnThis(),
          exec: jest.fn().mockResolvedValue(null), // filtered by companyB -> null
        });

        await expect(
          service.approveByToken(appId, token, companyB),
        ).rejects.toThrow('Leave application not found.');

        expect(applicationModel.findOne).toHaveBeenCalledWith(
          expect.objectContaining({
            _id: appId,
            companyId: companyB,
          }),
        );
      });
    });
  });
});

