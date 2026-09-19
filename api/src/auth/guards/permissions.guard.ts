import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { REQUIRE_PERMISSION_KEY, PermissionRequirement } from '../decorators/permissions.decorator';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { ALLOW_AUTHENTICATED_KEY } from '../decorators/allow-authenticated.decorator';
import { UserGroupsService } from '../../user-groups/user-groups.service';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private userGroupsService: UserGroupsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // 1. If endpoint is marked @Public(), allow access
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const req = context.switchToHttp().getRequest();
    const user = req.user;
    const userId = user?.id || user?._id;

    // 2. Unauthenticated requests are denied
    if (!userId) {
      throw new ForbiddenException('Access Denied: Authentication required.');
    }

    // 3. Check @AllowAuthenticated() for routes that only require valid authentication
    const isAllowAuthenticated = this.reflector.getAllAndOverride<boolean>(
      ALLOW_AUTHENTICATED_KEY,
      [context.getHandler(), context.getClass()],
    );

    const userPerms = await this.userGroupsService.getUserPermissions(userId.toString());

    // 4. Full access comes ONLY from an "Administrators" group
    const isAdministrator = userPerms.groups?.some(
      (groupName) => groupName.trim().toLowerCase() === 'administrators',
    );
    if (isAdministrator) {
      return true;
    }

    if (isAllowAuthenticated) {
      return true;
    }

    // 5. Check @RequirePermission() requirement
    const requirement = this.reflector.getAllAndOverride<PermissionRequirement>(
      REQUIRE_PERMISSION_KEY,
      [context.getHandler(), context.getClass()],
    );

    // Deny by default: If no permission requirement is set on endpoint, reject!
    if (!requirement) {
      throw new ForbiddenException(
        'Access Denied: Endpoint is protected and requires explicit permissions (deny by default).',
      );
    }

    // 6. Deny by default: If user is not assigned to any user groups, deny access
    if (!userPerms.groups || userPerms.groups.length === 0) {
      throw new ForbiddenException(
        `Access Denied: You do not belong to any user group with access to ${requirement.module}.`,
      );
    }

    const { module: modKey, action, model: modelKey = requirement.module, operation: opKey } = requirement;

    // 7. ── Check Operation-Level CRUD Permission (if specified) ──
    if (opKey) {
      const opActionKey = action === 'create' ? 'write' : action;
      const opPerm = (userPerms as any).operationPermissions?.[opKey];
      if (opPerm !== undefined) {
        if (opPerm[opActionKey] === false) {
          throw new ForbiddenException(
            `Access Denied: You do not have permission to ${action} for operation '${opKey}'.`,
          );
        }
      } else {
        // Deny sensitive operations by default if not explicitly granted
        if (
          opKey.startsWith('dayoff.approvals') ||
          opKey.startsWith('dayoff.policies') ||
          opKey.startsWith('settings.')
        ) {
          throw new ForbiddenException(
            `Access Denied: You do not have permission to ${action} for operation '${opKey}'.`,
          );
        }
      }
    }

    // 3. ── Check Module-Level CRUD Permission (Deny by default) ──
    const modPerm = userPerms.modulePermissions?.[modKey];
    const hasModulePermission = modPerm && modPerm[action] === true;

    const hasLegacyManage = userPerms.permissions?.includes(`${modKey}:manage`);
    const hasLegacyAction = userPerms.permissions?.includes(`${modKey}:${action}`);
    const hasLegacyView = action === 'read' && userPerms.permissions?.includes(`${modKey}:view`);
    const hasLegacyPermission = hasLegacyManage || hasLegacyAction || hasLegacyView;

    if (!hasModulePermission && !hasLegacyPermission) {
      throw new ForbiddenException(
        `Access Denied: You do not have permission to ${action} records in ${modKey}.`,
      );
    }

    // 2. ── Check Field-Level CRUD Permissions for Create / Update ──
    if ((action === 'create' || action === 'update') && req.body && typeof req.body === 'object') {
      const modelFields = userPerms.fieldPermissions?.[modelKey];

      if (modelFields) {
        const bodyKeys = Object.keys(req.body).filter(
          (k) => !['_id', 'id', 'createdAt', 'updatedAt', '__v', 'userId'].includes(k),
        );

        for (const key of bodyKeys) {
          const fieldPerm = modelFields[key];
          if (fieldPerm) {
            if (action === 'create' && fieldPerm.write === false) {
              throw new ForbiddenException(
                `Access Denied: You do not have permission to set field '${key}' in ${modelKey}.`,
              );
            }
            if (action === 'update' && fieldPerm.update === false) {
              throw new ForbiddenException(
                `Access Denied: You do not have permission to update field '${key}' in ${modelKey}.`,
              );
            }
          }
        }
      }
    }

    return true;
  }
}
