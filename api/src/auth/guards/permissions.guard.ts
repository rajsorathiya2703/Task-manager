import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { REQUIRE_PERMISSION_KEY, PermissionRequirement } from '../decorators/permissions.decorator';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { IS_AUTHENTICATED_KEY } from '../decorators/authenticated.decorator';
import { UserGroupsService } from '../../user-groups/user-groups.service';
import { resolvePermission } from '../../permissions/permission-resolver';

@Injectable()
export class PermissionsGuard implements CanActivate {
  private readonly logger = new Logger(PermissionsGuard.name);

  constructor(
    private reflector: Reflector,
    private userGroupsService: UserGroupsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // 1. @Public() — skip everything (already handled by JwtAuthGuard, but be safe)
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    // 2. @Authenticated() — user just needs to be logged in, no module check
    const isAuthenticatedOnly = this.reflector.getAllAndOverride<boolean>(IS_AUTHENTICATED_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isAuthenticatedOnly) {
      return true; // JwtAuthGuard already verified authentication
    }

    // 3. Check for @RequirePermission decorator
    const requirement = this.reflector.getAllAndOverride<PermissionRequirement>(
      REQUIRE_PERMISSION_KEY,
      [context.getHandler(), context.getClass()],
    );

    // If no permission requirement is set, deny by default.
    // Every endpoint MUST declare its intent via @Public(), @Authenticated(), or @RequirePermission().
    if (!requirement) {
      this.logger.warn(
        `Endpoint ${context.getClass().name}.${context.getHandler().name} has no permission decorator. Denying access.`,
      );
      throw new ForbiddenException('Endpoint has no permission rule configured.');
    }

    const req = context.switchToHttp().getRequest();
    const user = req.user;
    const userId = user?.id || user?._id;

    if (!userId) {
      // Should not happen (JwtAuthGuard handles auth), but be safe
      return true;
    }

    // 4. System admins bypass all permission checks
    if (user.is_system_admin === true) {
      req.permissionScope = 'all';
      return true;
    }

    // 5. Fetch user's groups
    const groups = await this.userGroupsService.findGroupsForUser(userId.toString());

    // 6. User with no groups — currently allow (will be flipped to deny in Step 6)
    // TODO: Step 6 migration — change this to deny
    if (!groups || groups.length === 0) {
      return true;
    }

    // Attach groups to request for downstream use (interceptors, services)
    req.userGroups = groups;

    const { module: modKey, action, model: modelKey, operation: opKey } = requirement;

    // 7. Run the resolver for module + operation level check
    const result = resolvePermission(groups as any, {
      module: modKey,
      action,
      operation: opKey,
    });

    if (!result.allowed) {
      throw new ForbiddenException(
        `Access Denied: You do not have permission to ${action} in ${modKey}.`,
      );
    }

    // Attach the widest scope to the request for service-level filtering
    req.permissionScope = result.scope;

    // 8. Field-level CRUD checks for create/update (on request body)
    if ((action === 'create' || action === 'update') && req.body && typeof req.body === 'object') {
      const effectiveModel = modelKey || modKey;
      const bodyKeys = Object.keys(req.body).filter(
        (k) => !['_id', 'id', 'createdAt', 'updatedAt', '__v', 'userId'].includes(k),
      );

      for (const key of bodyKeys) {
        const fieldResult = resolvePermission(groups as any, {
          module: modKey,
          action,
          model: effectiveModel,
          field: key,
        });

        if (!fieldResult.allowed) {
          // Check if ANY group has a field rule for this field.
          // If no group mentions this field, allow it (not configured = allowed).
          const anyGroupHasFieldRule = groups.some((g) =>
            g.fieldPermissions?.some(
              (fp) => fp.model === effectiveModel && fp.field === key,
            ),
          );

          if (anyGroupHasFieldRule) {
            throw new ForbiddenException(
              `Access Denied: You do not have permission to ${action} field '${key}' in ${effectiveModel}.`,
            );
          }
        }
      }
    }

    return true;
  }
}
