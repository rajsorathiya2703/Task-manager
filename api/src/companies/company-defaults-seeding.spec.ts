import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { DayOffService } from '../day-off/day-off.service';
import { LeaveType } from '../day-off/schemas/leave-type.schema';
import { LeaveApplication } from '../day-off/schemas/leave-application.schema';
import { DayOffSettings } from '../day-off/schemas/day-off-settings.schema';
import { LeaveBalance } from '../day-off/schemas/leave-balance.schema';
import { Notification } from '../day-off/schemas/notification.schema';
import { Employee } from '../employees/schemas/employee.schema';
import { Team } from '../teams/schemas/team.schema';
import { Company } from './schemas/company.schema';
import { DayOffMailService } from '../day-off/day-off-mail.service';
import { makeTwoTenants } from '../../test/helpers/tenant-fixtures';

describe('Company Defaults Seeding (TASK MC-30)', () => {
  let dayOffService: DayOffService;

  // In-memory data store for isolated multi-tenant verification
  const leaveTypesStore: any[] = [];
  const settingsStore: any[] = [];

  const mockLeaveTypeModel = {
    countDocuments: jest.fn().mockImplementation((filter: any) => ({
      session: jest.fn().mockReturnThis(),
      exec: jest.fn().mockImplementation(async () => {
        return leaveTypesStore.filter((lt) =>
          filter.companyId ? lt.companyId.toString() === filter.companyId.toString() : true,
        ).length;
      }),
    })),
    insertMany: jest.fn().mockImplementation((docs: any[], opts?: any) => {
      const inserted = docs.map((d) => ({
        _id: new Types.ObjectId(),
        ...d,
      }));
      leaveTypesStore.push(...inserted);
      return Promise.resolve(inserted);
    }),
    find: jest.fn().mockImplementation((filter: any) => ({
      sort: jest.fn().mockReturnThis(),
      exec: jest.fn().mockImplementation(async () => {
        return leaveTypesStore.filter((lt) => {
          if (filter.companyId) {
            return lt.companyId.toString() === filter.companyId.toString();
          }
          return true;
        });
      }),
    })),
  };

  const mockSettingsModel = {
    findOne: jest.fn().mockImplementation((filter: any) => ({
      session: jest.fn().mockReturnThis(),
      exec: jest.fn().mockImplementation(async () => {
        return (
          settingsStore.find((s) => {
            if (filter.companyId) {
              return s.companyId.toString() === filter.companyId.toString();
            }
            return true;
          }) || null
        );
      }),
    })),
    create: jest.fn().mockImplementation((doc: any, opts?: any) => {
      const data = Array.isArray(doc) ? doc[0] : doc;
      const created = {
        _id: new Types.ObjectId(),
        ...data,
      };
      settingsStore.push(created);
      return Promise.resolve(Array.isArray(doc) ? [created] : created);
    }),
  };

  beforeEach(async () => {
    leaveTypesStore.length = 0;
    settingsStore.length = 0;
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DayOffService,
        { provide: getModelToken(LeaveType.name), useValue: mockLeaveTypeModel },
        { provide: getModelToken(LeaveApplication.name), useValue: {} },
        { provide: getModelToken(DayOffSettings.name), useValue: mockSettingsModel },
        { provide: getModelToken(LeaveBalance.name), useValue: {} },
        { provide: getModelToken(Notification.name), useValue: {} },
        { provide: getModelToken(Employee.name), useValue: {} },
        { provide: getModelToken(Team.name), useValue: {} },
        { provide: getModelToken(Company.name), useValue: {} },
        { provide: DayOffMailService, useValue: {} },
      ],
    }).compile();

    dayOffService = module.get<DayOffService>(DayOffService);
  });

  it('registering company A creates 4 leave types and 1 settings doc for company A and NONE for company B', async () => {
    const { A, B } = makeTwoTenants();

    // 1. Seed defaults for Company A on registration
    await dayOffService.seedCompanyDefaults(A.companyId, 'admin@companya.com');

    // 2. Query leave types for Company A -> must have exactly 4 default types
    const leaveTypesA = await dayOffService.getLeaveTypes(A.companyId);
    expect(leaveTypesA).toHaveLength(4);

    const codesA = leaveTypesA.map((lt) => lt.code);
    expect(codesA).toEqual(
      expect.arrayContaining(['PAID', 'UNPAID', 'HALF_DAY', 'MEDICAL']),
    );
    for (const lt of leaveTypesA) {
      expect(lt.companyId.toString()).toBe(A.companyId.toString());
    }

    // 3. Query settings for Company A -> must exist and have company A's contact/admin email
    const settingsA = await mockSettingsModel.findOne({ companyId: A.companyId }).exec();
    expect(settingsA).toBeDefined();
    expect(settingsA.companyId.toString()).toBe(A.companyId.toString());
    expect(settingsA.defaultAdminEmail).toBe('admin@companya.com');

    // 4. Query leave types for Company B -> must be 0 (none exist for other companies)
    const leaveTypesB = await dayOffService.getLeaveTypes(B.companyId);
    expect(leaveTypesB).toHaveLength(0);

    // 5. Query settings for Company B -> must be null
    const settingsB = await mockSettingsModel.findOne({ companyId: B.companyId }).exec();
    expect(settingsB).toBeNull();
  });

  it('multiple companies each receive strictly scoped independent default sets', async () => {
    const { A, B } = makeTwoTenants();

    await dayOffService.seedCompanyDefaults(A.companyId, 'ownerA@alpha.com');
    await dayOffService.seedCompanyDefaults(B.companyId, 'ownerB@beta.com');

    const leaveTypesA = await dayOffService.getLeaveTypes(A.companyId);
    const leaveTypesB = await dayOffService.getLeaveTypes(B.companyId);

    expect(leaveTypesA).toHaveLength(4);
    expect(leaveTypesB).toHaveLength(4);

    // Each set belongs only to its respective tenant
    expect(leaveTypesA.every((lt) => lt.companyId.toString() === A.companyId.toString())).toBe(true);
    expect(leaveTypesB.every((lt) => lt.companyId.toString() === B.companyId.toString())).toBe(true);

    const settingsA = await mockSettingsModel.findOne({ companyId: A.companyId }).exec();
    const settingsB = await mockSettingsModel.findOne({ companyId: B.companyId }).exec();

    expect(settingsA.defaultAdminEmail).toBe('ownerA@alpha.com');
    expect(settingsB.defaultAdminEmail).toBe('ownerB@beta.com');
    expect(settingsA.companyId.toString()).toBe(A.companyId.toString());
    expect(settingsB.companyId.toString()).toBe(B.companyId.toString());
  });

  it('seeding is idempotent within a company (does not duplicate settings or leave types)', async () => {
    const { A } = makeTwoTenants();

    await dayOffService.seedCompanyDefaults(A.companyId, 'admin@company.com');
    await dayOffService.seedCompanyDefaults(A.companyId, 'admin@company.com');

    const leaveTypesA = await dayOffService.getLeaveTypes(A.companyId);
    expect(leaveTypesA).toHaveLength(4);

    const allSettings = settingsStore.filter(
      (s) => s.companyId.toString() === A.companyId.toString(),
    );
    expect(allSettings).toHaveLength(1);
  });
});
