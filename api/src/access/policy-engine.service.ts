import { Injectable } from '@nestjs/common';
import {
  can,
  Decision,
  Subject,
  ResourceContext,
  ActionType,
  isResourceInScope,
  ScopeType,
} from './policy.engine';
import { CompiledPolicyDocument } from './policy.compiler';

/**
 * PolicyEngineService (Phase 0 — P0-06)
 *
 * Injectable NestJS service wrapping the pure can() function and
 * relationship-based scope matching.
 */
@Injectable()
export class PolicyEngineService {
  /**
   * Pure decision point evaluating subject access on module/resource.
   */
  can(
    subject: Subject,
    action: ActionType,
    module: string,
    resource?: ResourceContext,
    policy?: CompiledPolicyDocument,
  ): Decision {
    return can(subject, action, module, resource, policy);
  }

  /**
   * Evaluates whether a given resource falls within the granted scope.
   */
  isResourceInScope(
    scope: ScopeType,
    subject: Subject,
    resource: ResourceContext,
  ): boolean {
    return isResourceInScope(scope, subject, resource);
  }
}
