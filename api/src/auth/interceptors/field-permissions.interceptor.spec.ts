import { ExecutionContext, CallHandler } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { of, lastValueFrom } from 'rxjs';
import { FieldPermissionsInterceptor, PAYROLL_FIELDS } from './field-permissions.interceptor';
import { REQUIRE_PERMISSION_KEY } from '../decorators/permissions.decorator';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

describe('FieldPermissionsInterceptor', () => {
  let interceptor: FieldPermissionsInterceptor;
  let reflector: jest.Mocked<Reflector>;
  let userGroupsService: any;

  beforeEach(() => {
    reflector = {
      getAllAndOverride: jest.fn(),
    } as any;

    userGroupsService = {
      getUserPermissions: jest.fn(),
    };

    interceptor = new FieldPermissionsInterceptor(reflector, userGroupsService);
  });

  const createMockContext = (req: any): ExecutionContext => {
    return {
      getType: () => 'http',
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({
        getRequest: () => req,
        getResponse: () => ({}),
        getNext: () => ({}),
      }),
    } as unknown as ExecutionContext;
  };

  const createCallHandler = (data: any): CallHandler => ({
    handle: () => of(data),
  });

  it('should allow unmodified response if route is @Public()', async () => {
    reflector.getAllAndOverride.mockImplementation((key: string) => {
      if (key === IS_PUBLIC_KEY) return true;
      return undefined;
    });

    const context = createMockContext({ user: { id: 'user1' } });
    const rawData = { baseSalary: 100000, fullName: { firstName: 'Alice' } };
    const next = createCallHandler(rawData);

    const result$ = await interceptor.intercept(context, next);
    const result = await lastValueFrom(result$);

    expect(result).toEqual(rawData);
    expect(result.baseSalary).toBe(100000);
  });

  it('should allow unmodified response if user is system admin', async () => {
    reflector.getAllAndOverride.mockImplementation((key: string) => {
      if (key === REQUIRE_PERMISSION_KEY) {
        return { module: 'employees', action: 'read', model: 'employees' };
      }
      return undefined;
    });

    const req = {
      user: { id: 'admin1', is_system_admin: true },
      isSystemAdmin: true,
      userPerms: {
        groups: ['Administrators'],
        permissions: [],
        modulePermissions: {},
        operationPermissions: {},
        fieldPermissions: {},
      },
    };
    const context = createMockContext(req);
    const rawEmployee = {
      _id: 'emp1',
      fullName: { firstName: 'Alice', lastName: 'Smith' },
      email: 'alice@example.com',
      baseSalary: 120000,
      bankAccountNumber: '123456789',
      taxId: 'TAX-999',
    };
    const next = createCallHandler(rawEmployee);

    const result$ = await interceptor.intercept(context, next);
    const result = await lastValueFrom(result$);

    expect(result.baseSalary).toBe(120000);
    expect(result.bankAccountNumber).toBe('123456789');
    expect(result.taxId).toBe('TAX-999');
  });

  it('should STRIP payroll fields for standard employee with employees.compensation read: false', async () => {
    reflector.getAllAndOverride.mockImplementation((key: string) => {
      if (key === REQUIRE_PERMISSION_KEY) {
        return { module: 'employees', action: 'read', model: 'employees' };
      }
      return undefined;
    });

    const req = {
      user: { id: 'emp_user', is_system_admin: false },
      isSystemAdmin: false,
      userPerms: {
        groups: ['Employee'],
        permissions: ['employees:read'],
        modulePermissions: { employees: { read: true, create: false, update: false, delete: false } },
        operationPermissions: {
          'employees.directory': { read: true, write: false, update: false, delete: false },
          'employees.compensation': { read: false, write: false, update: false, delete: false },
        },
        fieldPermissions: {
          employees: {
            baseSalary: { read: false, write: false, update: false, delete: false },
            bankAccountNumber: { read: false, write: false, update: false, delete: false },
            taxId: { read: false, write: false, update: false, delete: false },
          },
        },
      },
    };
    const context = createMockContext(req);
    const rawEmployee = {
      _id: 'emp1',
      fullName: { firstName: 'Alice', lastName: 'Smith' },
      email: 'alice@example.com',
      role: 'Engineer',
      baseSalary: 120000,
      currency: 'USD',
      payFrequency: 'Monthly',
      bankAccountNumber: '9876543210',
      bankRoutingNumber: '111222333',
      taxId: 'SSN-0001',
    };
    const next = createCallHandler(rawEmployee);

    const result$ = await interceptor.intercept(context, next);
    const result = await lastValueFrom(result$);

    expect(result.fullName.firstName).toBe('Alice');
    expect(result.email).toBe('alice@example.com');
    expect(result.role).toBe('Engineer');

    // Confidential payroll fields MUST be stripped!
    expect(result.baseSalary).toBeUndefined();
    expect(result.currency).toBeUndefined();
    expect(result.payFrequency).toBeUndefined();
    expect(result.bankAccountNumber).toBeUndefined();
    expect(result.bankRoutingNumber).toBeUndefined();
    expect(result.taxId).toBeUndefined();
  });

  it('should STRIP payroll fields across array of employees in findAll()', async () => {
    reflector.getAllAndOverride.mockImplementation((key: string) => {
      if (key === REQUIRE_PERMISSION_KEY) {
        return { module: 'employees', action: 'read', model: 'employees' };
      }
      return undefined;
    });

    const req = {
      user: { id: 'emp_user' },
      isSystemAdmin: false,
      userPerms: {
        groups: ['Employee'],
        operationPermissions: {
          'employees.compensation': { read: false, write: false, update: false, delete: false },
        },
        fieldPermissions: {},
      },
    };
    const context = createMockContext(req);
    const rawEmployees = [
      { _id: '1', fullName: { firstName: 'Alice' }, baseSalary: 100000, bankAccountNumber: '111' },
      { _id: '2', fullName: { firstName: 'Bob' }, baseSalary: 80000, bankAccountNumber: '222' },
    ];
    const next = createCallHandler(rawEmployees);

    const result$ = await interceptor.intercept(context, next);
    const result = await lastValueFrom(result$);

    expect(result).toHaveLength(2);
    expect(result[0].fullName.firstName).toBe('Alice');
    expect(result[0].baseSalary).toBeUndefined();
    expect(result[0].bankAccountNumber).toBeUndefined();
    expect(result[1].fullName.firstName).toBe('Bob');
    expect(result[1].baseSalary).toBeUndefined();
    expect(result[1].bankAccountNumber).toBeUndefined();
  });

  it('should STRIP forbidden fields in paginated response wrapper { data: [...], total: ... }', async () => {
    reflector.getAllAndOverride.mockImplementation((key: string) => {
      if (key === REQUIRE_PERMISSION_KEY) {
        return { module: 'employees', action: 'read', model: 'employees' };
      }
      return undefined;
    });

    const req = {
      user: { id: 'emp_user' },
      isSystemAdmin: false,
      userPerms: {
        groups: ['Employee'],
        operationPermissions: {
          'employees.compensation': { read: false, write: false, update: false, delete: false },
        },
        fieldPermissions: {},
      },
    };
    const context = createMockContext(req);
    const paginated = {
      data: [{ _id: '1', fullName: { firstName: 'Alice' }, baseSalary: 100000 }],
      total: 1,
    };
    const next = createCallHandler(paginated);

    const result$ = await interceptor.intercept(context, next);
    const result = await lastValueFrom(result$);

    expect(result.total).toBe(1);
    expect(result.data[0].fullName.firstName).toBe('Alice');
    expect(result.data[0].baseSalary).toBeUndefined();
  });

  it('should STRIP custom model fields when fieldPermissions specify read: false (e.g. tasks.estimatedHours)', async () => {
    reflector.getAllAndOverride.mockImplementation((key: string) => {
      if (key === REQUIRE_PERMISSION_KEY) {
        return { module: 'tasks', action: 'read', model: 'tasks' };
      }
      return undefined;
    });

    const req = {
      user: { id: 'user1' },
      isSystemAdmin: false,
      userPerms: {
        groups: ['CustomRole'],
        modulePermissions: { tasks: { read: true, create: true, update: true, delete: false } },
        operationPermissions: {},
        fieldPermissions: {
          tasks: {
            estimatedHours: { read: false, write: true, update: true, delete: true },
          },
        },
      },
    };
    const context = createMockContext(req);
    const rawTask = {
      _id: 'task1',
      title: 'Fix issue',
      estimatedHours: 40,
      status: 'In Progress',
    };
    const next = createCallHandler(rawTask);

    const result$ = await interceptor.intercept(context, next);
    const result = await lastValueFrom(result$);

    expect(result.title).toBe('Fix issue');
    expect(result.status).toBe('In Progress');
    expect(result.estimatedHours).toBeUndefined();
  });

  it('should convert Mongoose Document using toObject() when present', async () => {
    reflector.getAllAndOverride.mockImplementation((key: string) => {
      if (key === REQUIRE_PERMISSION_KEY) {
        return { module: 'employees', action: 'read', model: 'employees' };
      }
      return undefined;
    });

    const req = {
      user: { id: 'emp_user' },
      isSystemAdmin: false,
      userPerms: {
        groups: ['Employee'],
        operationPermissions: {
          'employees.compensation': { read: false, write: false, update: false, delete: false },
        },
        fieldPermissions: {},
      },
    };
    const context = createMockContext(req);

    // Mock Mongoose document
    const mockMongooseDoc = {
      _id: 'emp1',
      fullName: { firstName: 'Alice' },
      baseSalary: 95000,
      toObject: jest.fn().mockReturnValue({
        _id: 'emp1',
        fullName: { firstName: 'Alice' },
        baseSalary: 95000,
      }),
    };
    const next = createCallHandler(mockMongooseDoc);

    const result$ = await interceptor.intercept(context, next);
    const result = await lastValueFrom(result$);

    expect(mockMongooseDoc.toObject).toHaveBeenCalled();
    expect(result.fullName.firstName).toBe('Alice');
    expect(result.baseSalary).toBeUndefined();
  });
});
