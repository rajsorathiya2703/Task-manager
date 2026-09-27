import { SetMetadata } from '@nestjs/common';

/**
 * @RequireAccess decorator (Phase 1 — P1-01)
 *
 * Declares the module + action required by a controller method.
 * The AccessGuard (P1-02) reads this metadata via Reflector to call
 * the PDP's can() function before the handler executes.
 *
 * Usage:
 *   @RequireAccess({ module: 'tasks', action: 'read' })
 *   @Get()
 *   findAll() { ... }
 *
 * Matches §9.1 of ACCESS_CONTROL_IMPLEMENTATION_PLAN.md.
 */

/** Shape of the metadata value set by @RequireAccess. */
export interface AccessRequirement {
  /** Module id from the catalog, e.g. 'tasks', 'employees', 'roles'. */
  module: string;
  /** Action: 'create' | 'read' | 'update' | 'delete' | custom operation. */
  action: string;
}

/** Metadata key used by AccessGuard to retrieve the requirement. */
export const ACCESS_REQUIREMENT_KEY = 'access';

/**
 * Decorator that attaches an access requirement to a route handler.
 * Routes without this decorator will not be checked by AccessGuard
 * (they still require JWT auth unless also marked @Public()).
 */
export const RequireAccess = (requirement: AccessRequirement) =>
  SetMetadata(ACCESS_REQUIREMENT_KEY, requirement);
