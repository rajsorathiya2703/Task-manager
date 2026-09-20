import { Reflector } from '@nestjs/core';
import { REQUIRE_PERMISSION_KEY, PermissionRequirement } from '../auth/decorators/permissions.decorator';
import {
  CATALOG_MODULES,
  CATALOG_OPERATIONS,
  PERMISSION_CATALOG,
} from './permissions.catalog';

// Import all controllers that have @RequirePermission
import { TasksController } from '../tasks/tasks.controller';
import { ProjectsController } from '../projects/projects.controller';
import { TeamsController } from '../teams/teams.controller';
import { EmployeesController } from '../employees/employees.controller';
import { UsersController } from '../users/users.controller';
import { UserGroupsController } from '../user-groups/user-groups.controller';
import { DashboardController } from '../dashboard/dashboard.controller';
import { DayOffController } from '../day-off/day-off.controller';
import { PermissionsController } from './permissions.controller';

describe('Catalog Consistency Spec', () => {
  const reflector = new Reflector();

  const controllers = [
    TasksController,
    ProjectsController,
    TeamsController,
    EmployeesController,
    UsersController,
    UserGroupsController,
    DashboardController,
    DayOffController,
    PermissionsController,
  ];

  it('should ensure all @RequirePermission decorators reference valid catalog modules and operations', () => {
    const validModules = new Set<string>(CATALOG_MODULES);
    const validOperations = new Set<string>(CATALOG_OPERATIONS.map((o) => o.operation));

    const usedOperations = new Set<string>();
    const violations: string[] = [];

    for (const controller of controllers) {
      const controllerName = controller.name;
      const prototype = controller.prototype;

      // Check class-level decorator
      const classPerm = reflector.get<PermissionRequirement>(REQUIRE_PERMISSION_KEY, controller);
      if (classPerm) {
        if (!validModules.has(classPerm.module)) {
          violations.push(`Controller ${controllerName} references invalid module "${classPerm.module}"`);
        }
        if (classPerm.operation) {
          if (!validOperations.has(classPerm.operation)) {
            violations.push(`Controller ${controllerName} references invalid operation "${classPerm.operation}"`);
          }
          usedOperations.add(classPerm.operation);
        }
      }

      // Check method-level decorators
      const methodNames = Object.getOwnPropertyNames(prototype).filter(
        (prop) => prop !== 'constructor' && typeof prototype[prop] === 'function',
      );

      for (const methodName of methodNames) {
        const method = prototype[methodName];
        const methodPerm = reflector.get<PermissionRequirement>(REQUIRE_PERMISSION_KEY, method);

        if (methodPerm) {
          if (!validModules.has(methodPerm.module)) {
            violations.push(`${controllerName}.${methodName} references invalid module "${methodPerm.module}"`);
          }

          if (methodPerm.operation) {
            if (!validOperations.has(methodPerm.operation)) {
              violations.push(`${controllerName}.${methodName} references invalid operation "${methodPerm.operation}"`);
            }
            usedOperations.add(methodPerm.operation);
          }
        }
      }
    }

    expect(violations).toEqual([]);

    // Check for catalog operations not used by any endpoint and emit warnings
    const unusedOperations: string[] = [];
    for (const op of validOperations) {
      if (!usedOperations.has(op)) {
        unusedOperations.push(op);
      }
    }

    if (unusedOperations.length > 0) {
      console.warn(
        `[Catalog Consistency] ${unusedOperations.length} catalog operations are defined but not directly bound to @RequirePermission endpoints: ${unusedOperations.join(', ')}`,
      );
    }
  });

  it('should ensure all catalog operations belong to declared modules in PERMISSION_CATALOG', () => {
    const moduleKeys = new Set(PERMISSION_CATALOG.modules.map((m) => m.key));

    for (const op of PERMISSION_CATALOG.operations) {
      expect(moduleKeys.has(op.module)).toBe(true);
    }
  });

  it('should ensure all model fields defined in catalog have required keys and labels', () => {
    for (const [model, def] of Object.entries(PERMISSION_CATALOG.models)) {
      expect(def.label).toBeDefined();
      expect(Array.isArray(def.fields)).toBe(true);
      expect(def.fields.length).toBeGreaterThan(0);

      for (const f of def.fields) {
        expect(f.key).toBeDefined();
        expect(f.label).toBeDefined();
      }
    }
  });
});
