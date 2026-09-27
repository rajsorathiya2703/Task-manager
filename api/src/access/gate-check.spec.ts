jest.mock('uuid', () => ({ v4: () => 'mock-uuid' }));

import { Reflector } from '@nestjs/core';
import { ACCESS_REQUIREMENT_KEY } from './decorators/require-access.decorator';
import { IS_PUBLIC_KEY } from '../auth/decorators/public.decorator';

// Controllers
import { AppController } from '../app.controller';
import { AuthController } from '../auth/auth.controller';
import { ChatbotController } from '../chatbot/chatbot.controller';
import { DashboardController } from '../dashboard/dashboard.controller';
import { DayOffController } from '../day-off/day-off.controller';
import { NotificationController } from '../day-off/notification.controller';
import { EmployeesController } from '../employees/employees.controller';
import { ProjectsController } from '../projects/projects.controller';
import { TasksController } from '../tasks/tasks.controller';
import { TeamsController } from '../teams/teams.controller';
import { UsersController } from '../users/users.controller';

// Access & Policy Engine
import { buildDefaultRoles } from './access.seed';
import { compile } from './policy.compiler';
import { can, Subject } from './policy.engine';
import { MODULE_CATALOG } from './catalog';

describe('Phase 1 Gate Check', () => {
  const reflector = new Reflector();

  describe('1. Controller Route Coverage Audit', () => {
    const controllers = [
      { name: 'AppController', target: AppController },
      { name: 'AuthController', target: AuthController },
      { name: 'ChatbotController', target: ChatbotController },
      { name: 'DashboardController', target: DashboardController },
      { name: 'DayOffController', target: DayOffController },
      { name: 'NotificationController', target: NotificationController },
      { name: 'EmployeesController', target: EmployeesController },
      { name: 'ProjectsController', target: ProjectsController },
      { name: 'TasksController', target: TasksController },
      { name: 'TeamsController', target: TeamsController },
      { name: 'UsersController', target: UsersController },
    ];

    it('should confirm that every operational route is decorated with @RequireAccess or @Public', () => {
      const uncoveredRoutes: string[] = [];

      for (const { name, target } of controllers) {
        const proto = target.prototype;
        const methodNames = Object.getOwnPropertyNames(proto).filter(
          (prop) => prop !== 'constructor' && typeof proto[prop] === 'function',
        );

        for (const methodName of methodNames) {
          const handler = proto[methodName];

          // Ignore non-route helper methods on controller classes
          const isRoute =
            reflector.get('path', handler) !== undefined ||
            reflector.get('method', handler) !== undefined;
          if (!isRoute) {
            continue;
          }

          const hasRequireAccess = reflector.get(ACCESS_REQUIREMENT_KEY, handler);
          const isPublic = reflector.get(IS_PUBLIC_KEY, handler);

          // Allowed exceptions:
          // - AuthController.getMe: Caller's identity & access bootstrap endpoint
          // - NotificationController: User-scoped notifications strictly filtered by req.user.id
          const isAllowedException =
            (name === 'AuthController' && methodName === 'getMe') ||
            name === 'NotificationController';

          if (!hasRequireAccess && !isPublic && !isAllowedException) {
            uncoveredRoutes.push(`${name}.${methodName}`);
          }
        }
      }

      expect(uncoveredRoutes).toEqual([]);
    });

    it('should verify TasksController.viewFile is guarded with tasks:read', () => {
      const handler = TasksController.prototype.viewFile;
      const requirement = reflector.get(ACCESS_REQUIREMENT_KEY, handler);
      expect(requirement).toEqual({ module: 'tasks', action: 'read' });
    });

    it('should verify ChatbotController.chat is guarded with chatbot:use', () => {
      const handler = ChatbotController.prototype.chat;
      const requirement = reflector.get(ACCESS_REQUIREMENT_KEY, handler);
      expect(requirement).toEqual({ module: 'chatbot', action: 'use' });
    });
  });

  describe('2. Employee Role Access & Scoping Verification', () => {
    let policy: any;
    const employeeSubject: Subject = {
      userId: '60c72b2f9b1d8b2bad000001',
      email: 'employee@test.com',
      roles: ['employee'],
      isSystemAdmin: false,
    };

    beforeAll(() => {
      const defaultRoles = buildDefaultRoles();
      policy = compile(defaultRoles);
    });

    it('task list is scoped to "own"', () => {
      const decision = can(employeeSubject, 'read', 'tasks', undefined, policy);
      expect(decision.allow).toBe(true);
      expect(decision.scope).toBe('own');
    });

    it('employees list is scoped to "own" (self)', () => {
      const decision = can(employeeSubject, 'read', 'employees', undefined, policy);
      expect(decision.allow).toBe(true);
      expect(decision.scope).toBe('own');
    });

    it('users module (/configuration/users) is hard-blocked', () => {
      const readDecision = can(employeeSubject, 'read', 'users', undefined, policy);
      expect(readDecision.allow).toBe(false);
      expect(readDecision.scope).toBe('none');

      const updateDecision = can(employeeSubject, 'update', 'users', undefined, policy);
      expect(updateDecision.allow).toBe(false);
    });

    it('teams module (/configuration/team) is hard-blocked', () => {
      const readDecision = can(employeeSubject, 'read', 'teams', undefined, policy);
      expect(readDecision.allow).toBe(false);
      expect(readDecision.scope).toBe('none');

      const createDecision = can(employeeSubject, 'create', 'teams', undefined, policy);
      expect(createDecision.allow).toBe(false);
    });

    it('dayoff.approvals (/dayoff/approvals) is hard-blocked', () => {
      const readDecision = can(employeeSubject, 'read', 'dayoff.approvals', undefined, policy);
      expect(readDecision.allow).toBe(false);
      expect(readDecision.scope).toBe('none');
    });

    it('dayoff module for submitting leaves is granted with scope "own"', () => {
      const readDecision = can(employeeSubject, 'read', 'dayoff', undefined, policy);
      expect(readDecision.allow).toBe(true);
      expect(readDecision.scope).toBe('own');

      const createDecision = can(employeeSubject, 'create', 'dayoff', undefined, policy);
      expect(createDecision.allow).toBe(true);
    });

    it('chatbot module is granted with action "use"', () => {
      const decision = can(employeeSubject, 'use', 'chatbot', undefined, policy);
      expect(decision.allow).toBe(true);
    });
  });

  describe('3. System Admin Full Access Verification', () => {
    let policy: any;
    const adminSubject: Subject = {
      userId: '60c72b2f9b1d8b2bad000099',
      email: 'admin@test.com',
      roles: ['system-admin'],
      isSystemAdmin: true,
    };

    beforeAll(() => {
      const defaultRoles = buildDefaultRoles();
      policy = compile(defaultRoles);
    });

    it('should grant full access with scope "all" across all catalog modules', () => {
      for (const mod of MODULE_CATALOG) {
        for (const action of mod.actions) {
          const decision = can(adminSubject, action as any, mod.id, undefined, policy);
          expect(decision.allow).toBe(true);
          expect(decision.scope).toBe('all');
        }
      }
    });

    it('can access /configuration/users, /configuration/team, /dayoff/approvals with scope "all"', () => {
      expect(can(adminSubject, 'read', 'users', undefined, policy).scope).toBe('all');
      expect(can(adminSubject, 'read', 'teams', undefined, policy).scope).toBe('all');
      expect(can(adminSubject, 'read', 'dayoff.approvals', undefined, policy).scope).toBe('all');
      expect(can(adminSubject, 'read', 'tasks', undefined, policy).scope).toBe('all');
      expect(can(adminSubject, 'read', 'employees', undefined, policy).scope).toBe('all');
    });
  });
});
