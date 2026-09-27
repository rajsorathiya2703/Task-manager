import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { of, lastValueFrom } from 'rxjs';
import { FieldAccessInterceptor } from './field-access.interceptor';
import { IS_PUBLIC_KEY } from '../auth/decorators/public.decorator';
import {
  ACCESS_REQUIREMENT_KEY,
  AccessRequirement,
} from './decorators/require-access.decorator';
import { Decision } from './policy.engine';

describe('FieldAccessInterceptor (Phase 2 — P2-01 & P2-02)', () => {
  let interceptor: FieldAccessInterceptor;
  let reflector: jest.Mocked<Reflector>;

  beforeEach(() => {
    reflector = {
      getAllAndOverride: jest.fn(),
    } as any;

    interceptor = new FieldAccessInterceptor(reflector);
  });

  function createMockExecutionContext(
    request: any,
    contextType: string = 'http',
  ): ExecutionContext {
    return {
      getType: () => contextType,
      switchToHttp: () => ({
        getRequest: () => request,
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as any;
  }

  function createCallHandler(returnValue: any) {
    return {
      handle: jest.fn().mockReturnValue(of(returnValue)),
    };
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Non-HTTP, @Public, and Unguarded Routes (Fail-safe & Passthrough)
  // ───────────────────────────────────────────────────────────────────────────

  it('bypasses interceptor for non-http execution contexts (e.g. RPC/Microservices)', async () => {
    const context = createMockExecutionContext({}, 'rpc');
    const next = createCallHandler({ result: 'ok' });

    const result$ = interceptor.intercept(context, next);
    const result = await lastValueFrom(result$);

    expect(result).toEqual({ result: 'ok' });
    expect(next.handle).toHaveBeenCalled();
  });

  it('bypasses interceptor if route is marked @Public()', async () => {
    reflector.getAllAndOverride.mockImplementation((key: string) => {
      if (key === IS_PUBLIC_KEY) return true;
      return undefined;
    });

    const context = createMockExecutionContext({
      method: 'PATCH',
      body: { secretField: 'test' },
    });
    const next = createCallHandler({ publicData: true });

    const result$ = interceptor.intercept(context, next);
    const result = await lastValueFrom(result$);

    expect(result).toEqual({ publicData: true });
    expect(next.handle).toHaveBeenCalled();
  });

  it('bypasses interceptor if route does not declare @RequireAccess', async () => {
    reflector.getAllAndOverride.mockImplementation((key: string) => {
      if (key === IS_PUBLIC_KEY) return false;
      if (key === ACCESS_REQUIREMENT_KEY) return undefined;
      return undefined;
    });

    const context = createMockExecutionContext({
      method: 'PATCH',
      body: { someField: 123 },
    });
    const next = createCallHandler({ passed: true });

    const result$ = interceptor.intercept(context, next);
    const result = await lastValueFrom(result$);

    expect(result).toEqual({ passed: true });
    expect(next.handle).toHaveBeenCalled();
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Verification Scenario 1: Outbound Read Redaction (GET /employees/:id)
  // ───────────────────────────────────────────────────────────────────────────

  describe('Outbound Response Sanitization (Read Protection — §9.3)', () => {
    it('strips baseSalary key completely from GET /employees/:id when baseSalary.read=false', async () => {
      reflector.getAllAndOverride.mockImplementation((key: string) => {
        if (key === IS_PUBLIC_KEY) return false;
        if (key === ACCESS_REQUIREMENT_KEY) {
          return { module: 'employees', action: 'read' } as AccessRequirement;
        }
        return undefined;
      });

      const decision: Decision = {
        allow: true,
        scope: 'all',
        readableFields: ['fullName', 'email', 'role', 'phone'],
        updatableFields: ['phone'],
        hiddenFields: ['baseSalary', 'bankAccountNumber', 'taxId'],
      };

      const rawEmployee = {
        _id: 'emp-101',
        fullName: { firstName: 'Alice', lastName: 'Wonder' },
        email: 'alice@example.com',
        role: 'Engineer',
        phone: '+1234567890',
        baseSalary: 125000,
        bankAccountNumber: '987654321',
        taxId: 'TAX-001',
      };

      const req = {
        method: 'GET',
        user: { id: 'u1', is_system_admin: false },
        accessDecision: decision,
      };

      const context = createMockExecutionContext(req);
      const next = createCallHandler(rawEmployee);

      const result$ = interceptor.intercept(context, next);
      const result = await lastValueFrom(result$);

      // Allowed fields are kept intact
      expect(result._id).toBe('emp-101');
      expect(result.fullName.firstName).toBe('Alice');
      expect(result.email).toBe('alice@example.com');
      expect(result.role).toBe('Engineer');
      expect(result.phone).toBe('+1234567890');

      // Hidden fields MUST NOT be present at all
      expect('baseSalary' in result).toBe(false);
      expect(result.baseSalary).toBeUndefined();
      expect('bankAccountNumber' in result).toBe(false);
      expect(result.bankAccountNumber).toBeUndefined();
      expect('taxId' in result).toBe(false);
      expect(result.taxId).toBeUndefined();
    });

    it('strips hidden fields across an array of records in GET /employees', async () => {
      reflector.getAllAndOverride.mockImplementation((key: string) => {
        if (key === ACCESS_REQUIREMENT_KEY) {
          return { module: 'employees', action: 'read' } as AccessRequirement;
        }
        return undefined;
      });

      const decision: Decision = {
        allow: true,
        scope: 'all',
        readableFields: ['fullName', 'email'],
        updatableFields: [],
        hiddenFields: ['baseSalary'],
      };

      const rawList = [
        { _id: '1', fullName: { firstName: 'Alice' }, email: 'alice@a.com', baseSalary: 100000 },
        { _id: '2', fullName: { firstName: 'Bob' }, email: 'bob@b.com', baseSalary: 85000 },
      ];

      const req = {
        method: 'GET',
        user: { id: 'u1' },
        accessDecision: decision,
      };

      const context = createMockExecutionContext(req);
      const next = createCallHandler(rawList);

      const result$ = interceptor.intercept(context, next);
      const result = await lastValueFrom(result$);

      expect(result).toHaveLength(2);
      expect(result[0].email).toBe('alice@a.com');
      expect('baseSalary' in result[0]).toBe(false);
      expect(result[0].baseSalary).toBeUndefined();

      expect(result[1].email).toBe('bob@b.com');
      expect('baseSalary' in result[1]).toBe(false);
      expect(result[1].baseSalary).toBeUndefined();
    });

    it('strips hidden fields inside paginated response wrappers { data: [...], total: ... }', async () => {
      reflector.getAllAndOverride.mockImplementation((key: string) => {
        if (key === ACCESS_REQUIREMENT_KEY) {
          return { module: 'employees', action: 'read' } as AccessRequirement;
        }
        return undefined;
      });

      const decision: Decision = {
        allow: true,
        scope: 'all',
        readableFields: ['fullName'],
        updatableFields: [],
        hiddenFields: ['baseSalary'],
      };

      const paginated = {
        total: 1,
        page: 1,
        data: [{ _id: '1', fullName: { firstName: 'Alice' }, baseSalary: 99000 }],
      };

      const req = {
        method: 'GET',
        user: { id: 'u1' },
        accessDecision: decision,
      };

      const context = createMockExecutionContext(req);
      const next = createCallHandler(paginated);

      const result$ = interceptor.intercept(context, next);
      const result = await lastValueFrom(result$);

      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.data[0].fullName.firstName).toBe('Alice');
      expect('baseSalary' in result.data[0]).toBe(false);
    });

    it('converts Mongoose document via toObject() before sanitizing', async () => {
      reflector.getAllAndOverride.mockImplementation((key: string) => {
        if (key === ACCESS_REQUIREMENT_KEY) {
          return { module: 'employees', action: 'read' } as AccessRequirement;
        }
        return undefined;
      });

      const decision: Decision = {
        allow: true,
        scope: 'all',
        readableFields: ['fullName'],
        updatableFields: [],
        hiddenFields: ['baseSalary'],
      };

      const mockMongooseDoc = {
        _id: 'emp-doc-1',
        fullName: { firstName: 'Alice' },
        baseSalary: 110000,
        toObject: jest.fn().mockReturnValue({
          _id: 'emp-doc-1',
          fullName: { firstName: 'Alice' },
          baseSalary: 110000,
        }),
      };

      const req = {
        method: 'GET',
        user: { id: 'u1' },
        accessDecision: decision,
      };

      const context = createMockExecutionContext(req);
      const next = createCallHandler(mockMongooseDoc);

      const result$ = interceptor.intercept(context, next);
      const result = await lastValueFrom(result$);

      expect(mockMongooseDoc.toObject).toHaveBeenCalled();
      expect(result.fullName.firstName).toBe('Alice');
      expect('baseSalary' in result).toBe(false);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Verification Scenario 2: Inbound Write Rejection (PATCH /tasks/:id)
  // ───────────────────────────────────────────────────────────────────────────

  describe('Inbound Body Validation (Write Protection — §9.2 & §9.5)', () => {
    it('throws 403 FIELD_FORBIDDEN on PATCH /tasks/:id with { priority: "High" } when priority.update=false', () => {
      reflector.getAllAndOverride.mockImplementation((key: string) => {
        if (key === IS_PUBLIC_KEY) return false;
        if (key === ACCESS_REQUIREMENT_KEY) {
          return { module: 'tasks', action: 'update' } as AccessRequirement;
        }
        return undefined;
      });

      // Role has update on title, description, status, but NOT priority
      const decision: Decision = {
        allow: true,
        scope: 'own',
        readableFields: ['title', 'description', 'status', 'priority'],
        updatableFields: ['title', 'description', 'status'],
        hiddenFields: [],
      };

      const req = {
        method: 'PATCH',
        body: { priority: 'High' },
        user: { id: 'u1', is_system_admin: false },
        accessDecision: decision,
      };

      const context = createMockExecutionContext(req);
      const next = createCallHandler({ updated: true });

      try {
        interceptor.intercept(context, next);
        fail('Expected ForbiddenException to be thrown');
      } catch (err: any) {
        expect(err).toBeInstanceOf(ForbiddenException);
        const response = err.getResponse();

        expect(response).toMatchObject({
          statusCode: 403,
          code: 'FIELD_FORBIDDEN',
          module: 'tasks',
          action: 'update',
          fields: ['priority'],
          message: "You do not have permission to update field 'priority' on tasks.",
        });

        // Handler MUST NOT be executed (reject, don't silently strip)
        expect(next.handle).not.toHaveBeenCalled();
      }
    });

    it('throws 403 FIELD_FORBIDDEN listing all forbidden fields when multiple disallowed keys are sent', () => {
      reflector.getAllAndOverride.mockImplementation((key: string) => {
        if (key === ACCESS_REQUIREMENT_KEY) {
          return { module: 'tasks', action: 'update' } as AccessRequirement;
        }
        return undefined;
      });

      const decision: Decision = {
        allow: true,
        scope: 'own',
        readableFields: ['status'],
        updatableFields: ['status'],
        hiddenFields: [],
      };

      const req = {
        method: 'PATCH',
        body: { status: 'In Progress', priority: 'High', estimatedHours: 20 },
        user: { id: 'u1' },
        accessDecision: decision,
      };

      const context = createMockExecutionContext(req);
      const next = createCallHandler({ updated: true });

      try {
        interceptor.intercept(context, next);
        fail('Expected ForbiddenException to be thrown');
      } catch (err: any) {
        expect(err).toBeInstanceOf(ForbiddenException);
        const response = err.getResponse();

        expect(response.statusCode).toBe(403);
        expect(response.code).toBe('FIELD_FORBIDDEN');
        expect(response.module).toBe('tasks');
        expect(response.fields).toEqual(['priority', 'estimatedHours']);
        expect(response.message).toContain("You do not have permission to update fields 'priority', 'estimatedHours' on tasks.");
        expect(next.handle).not.toHaveBeenCalled();
      }
    });

    it('allows PATCH /tasks/:id when all payload keys are in updatableFields', async () => {
      reflector.getAllAndOverride.mockImplementation((key: string) => {
        if (key === ACCESS_REQUIREMENT_KEY) {
          return { module: 'tasks', action: 'update' } as AccessRequirement;
        }
        return undefined;
      });

      const decision: Decision = {
        allow: true,
        scope: 'own',
        readableFields: ['title', 'status'],
        updatableFields: ['title', 'status'],
        hiddenFields: [],
      };

      const req = {
        method: 'PATCH',
        body: { status: 'Completed', title: 'Reviewed docs' },
        user: { id: 'u1' },
        accessDecision: decision,
      };

      const context = createMockExecutionContext(req);
      const next = createCallHandler({ _id: 'task-1', status: 'Completed', title: 'Reviewed docs' });

      const result$ = interceptor.intercept(context, next);
      const result = await lastValueFrom(result$);

      expect(next.handle).toHaveBeenCalled();
      expect(result.status).toBe('Completed');
      expect(result.title).toBe('Reviewed docs');
    });

    it('supports retrieving decision from request.access[module] as fallback', () => {
      reflector.getAllAndOverride.mockImplementation((key: string) => {
        if (key === ACCESS_REQUIREMENT_KEY) {
          return { module: 'tasks', action: 'update' } as AccessRequirement;
        }
        return undefined;
      });

      const decision: Decision = {
        allow: true,
        scope: 'own',
        readableFields: ['status'],
        updatableFields: ['status'],
        hiddenFields: [],
      };

      const req = {
        method: 'PATCH',
        body: { priority: 'Urgent' },
        user: { id: 'u1' },
        // accessDecision omitted, but attached on access[module]
        access: { tasks: decision },
      };

      const context = createMockExecutionContext(req);
      const next = createCallHandler({});

      expect(() => interceptor.intercept(context, next)).toThrow(ForbiddenException);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // System Admin Break-Glass Bypass
  // ───────────────────────────────────────────────────────────────────────────

  describe('System Admin Break-Glass Bypass (§5.1 & §7.2)', () => {
    it('bypasses inbound write protection for system administrators', async () => {
      reflector.getAllAndOverride.mockImplementation((key: string) => {
        if (key === ACCESS_REQUIREMENT_KEY) {
          return { module: 'tasks', action: 'update' } as AccessRequirement;
        }
        return undefined;
      });

      const req = {
        method: 'PATCH',
        body: { anyField: 'anyValue', priority: 'High' },
        user: { id: 'admin-id', is_system_admin: true },
      };

      const context = createMockExecutionContext(req);
      const next = createCallHandler({ success: true });

      const result$ = interceptor.intercept(context, next);
      const result = await lastValueFrom(result$);

      expect(result.success).toBe(true);
      expect(next.handle).toHaveBeenCalled();
    });

    it('bypasses outbound read redaction for system administrators', async () => {
      reflector.getAllAndOverride.mockImplementation((key: string) => {
        if (key === ACCESS_REQUIREMENT_KEY) {
          return { module: 'employees', action: 'read' } as AccessRequirement;
        }
        return undefined;
      });

      const rawEmployee = {
        _id: 'emp-1',
        fullName: { firstName: 'Alice' },
        baseSalary: 150000,
        bankAccountNumber: '12345678',
        taxId: 'TAX-007',
      };

      const req = {
        method: 'GET',
        user: { id: 'admin-id', is_system_admin: true },
      };

      const context = createMockExecutionContext(req);
      const next = createCallHandler(rawEmployee);

      const result$ = interceptor.intercept(context, next);
      const result = await lastValueFrom(result$);

      // System Admin sees all sensitive fields unmodified
      expect(result.baseSalary).toBe(150000);
      expect(result.bankAccountNumber).toBe('12345678');
      expect(result.taxId).toBe('TAX-007');
    });
  });
});
