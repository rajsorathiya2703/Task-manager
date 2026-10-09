import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../auth/decorators/public.decorator';
import {
  ACCESS_REQUIREMENT_KEY,
  AccessRequirement,
} from './decorators/require-access.decorator';
import { PolicyCompilerService } from './policy-compiler.service';
import { PolicyEngineService } from './policy-engine.service';
import { Subject, Decision, ActionType } from './policy.engine';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Role, RoleDocument } from './schemas/role.schema';

/**
 * AccessGuard (Phase 1 — P1-02)
 *
 * Global guard registered as the second APP_GUARD (after JwtAuthGuard).
 * Reads @RequireAccess metadata via Reflector to enforce module-level policy
 * checks at the controller layer.
 *
 * Behavior:
 *   1. @Public() routes → pass through (no user to check).
 *   2. Routes WITHOUT @RequireAccess → pass through (incremental rollout).
 *   3. Routes WITH @RequireAccess → evaluate PolicyEngine.can() and
 *      throw ForbiddenException if denied.
 *   4. Attaches the Decision to req.accessDecision for downstream
 *      interceptors/controllers.
 *
 * Matches §9.1 of ACCESS_CONTROL_IMPLEMENTATION_PLAN.md.
 */
@Injectable()
export class AccessGuard implements CanActivate {
  private readonly logger = new Logger(AccessGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly policyCompilerService: PolicyCompilerService,
    private readonly policyEngineService: PolicyEngineService,
    @InjectModel(Role.name)
    private readonly roleModel: Model<RoleDocument>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // ─── Step 1: Skip @Public() routes (no user, no check) ────────────
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    // ─── Step 2: Skip routes without @RequireAccess (incremental rollout)
    const requirement =
      this.reflector.getAllAndOverride<AccessRequirement>(
        ACCESS_REQUIREMENT_KEY,
        [context.getHandler(), context.getClass()],
      );
    if (!requirement) {
      return true;
    }

    // ─── Step 3: Extract authenticated user ───────────────────────────
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    if (!user) {
      // Should never happen after JwtAuthGuard, but defensive
      throw new ForbiddenException({
        statusCode: 403,
        error: 'Forbidden',
        message: 'Access denied: no authenticated user',
        module: requirement.module,
        action: requirement.action,
      });
    }

    // ─── Step 4: Load latest compiled policy (company-scoped) ────────
    const companyId =
      request.company?._id ||
      request.membership?.companyId ||
      request.companyId;

    const policyDoc =
      await this.policyCompilerService.getLatestPolicyDocument(companyId);
    if (!policyDoc) {
      this.logger.warn(
        'No compiled policy document found — denying access by default',
      );
      throw new ForbiddenException({
        statusCode: 403,
        error: 'Forbidden',
        message: 'Access denied: no access policy configured',
        module: requirement.module,
        action: requirement.action,
      });
    }

    // ─── Step 5: Build Subject from req.user + role membership ────────
    const userId = (user._id?.toString?.() ?? user.id) as string;
    const compObjectId = companyId && Types.ObjectId.isValid(companyId)
      ? new Types.ObjectId(companyId)
      : undefined;

    // Look up roles for this user inside the current company
    const roleQuery: any = { members: userId, isActive: true };
    if (compObjectId) {
      roleQuery.companyId = compObjectId;
    }

    let userRoles = await this.roleModel
      .find(roleQuery)
      .select('_id slug')
      .lean()
      .exec();

    // If no roles matched directly by members array, check membership.roleIds
    if (userRoles.length === 0 && request.membership?.roleIds?.length > 0) {
      const membershipRoleObjectIds = request.membership.roleIds
        .filter((r: any) => Types.ObjectId.isValid(r))
        .map((r: any) => new Types.ObjectId(r));

      userRoles = await this.roleModel
        .find({ _id: { $in: membershipRoleObjectIds }, isActive: true })
        .select('_id slug')
        .lean()
        .exec();
    }

    const isCompanyAdmin =
      user.is_system_admin === true ||
      request.membership?.isCompanyOwner === true ||
      request.membership?.isSystemAdmin === true;

    // Default Role Fallback: If user has no roles and is not System Admin, assign 'employee' role
    if (userRoles.length === 0 && !isCompanyAdmin && typeof this.roleModel.findOne === 'function') {
      const fallbackQuery: any = { slug: 'employee', isActive: true };
      if (compObjectId) {
        fallbackQuery.companyId = compObjectId;
      }
      const defaultRole = await this.roleModel
        .findOne(fallbackQuery)
        .select('_id slug')
        .lean()
        .exec();
      if (defaultRole) {
        userRoles = [defaultRole];
        const userObjId = Types.ObjectId.isValid(userId) ? new Types.ObjectId(userId) : userId;
        this.roleModel.updateOne(
          { _id: defaultRole._id },
          { $addToSet: { members: userObjId } }
        ).exec().catch(() => {});
      }
    }

    const subject: Subject = {
      userId,
      email: user.email,
      roleIds: userRoles.map((r) => r._id.toString()),
      roles: userRoles.map((r) => r.slug),
      isSystemAdmin: isCompanyAdmin,
      // teamIds and leadingTeamIds will be resolved in P1-05/06
      // for record-level scope checks
    };

    // ─── Step 6: Evaluate the policy decision ─────────────────────────
    const plainPolicy =
      typeof (policyDoc as any).toObject === 'function'
        ? (policyDoc as any).toObject()
        : policyDoc;

    const decision: Decision = this.policyEngineService.can(
      subject,
      requirement.action as ActionType,
      requirement.module,
      undefined, // no resource context for module-level check
      plainPolicy,
    );

    // ─── Step 7: Deny if not allowed ──────────────────────────────────
    if (!decision.allow) {
      this.logger.debug(
        `Access denied: user=${userId} module=${requirement.module} action=${requirement.action} reason=${decision.reason}`,
      );
      throw new ForbiddenException({
        statusCode: 403,
        error: 'Forbidden',
        message:
          decision.reason ??
          `Access denied: insufficient permissions for ${requirement.action} on ${requirement.module}`,
        module: requirement.module,
        action: requirement.action,
      });
    }

    // ─── Step 8: Attach decision for downstream use ───────────────────
    request.accessDecision = decision;
    request.access = request.access || {};
    request.access[requirement.module] = decision;

    this.logger.debug(
      `Access granted: user=${userId} module=${requirement.module} action=${requirement.action} scope=${decision.scope}`,
    );

    return true;
  }
}
