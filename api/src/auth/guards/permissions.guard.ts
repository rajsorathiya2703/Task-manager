import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { REQUIRE_PERMISSION_KEY, PermissionRequirement } from '../decorators/permissions.decorator';
import { UserGroupsService } from '../../user-groups/user-groups.service';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private userGroupsService: UserGroupsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requirement = this.reflector.getAllAndOverride<PermissionRequirement>(
      REQUIRE_PERMISSION_KEY,
      [context.getHandler(), context.getClass()],
    );

    // If no permission requirement is set on endpoint, allow access
    if (!requirement) {
      return true;
    }

    const req = context.switchToHttp().getRequest();
    const user = req.user;
    const userId = user?.id || user?._id;

    if (!userId) {
      // Unauthenticated requests are handled by JwtAuthGuard
      return true;
    }

    const userPerms = await this.userGroupsService.getUserPermissions(userId.toString());

    // If user is not assigned to any user groups, grant full operational access
    if (!userPerms.groups || userPerms.groups.length === 0) {
      return true;
    }

    const { module: modKey, action, model: modelKey = requirement.module, operation: opKey } = requirement;

    // 0. ── Check Operation-Level CRUD Permission (if specified) ──
    if (opKey) {
      const opActionKey = action === 'create' ? 'write' : action;
      const opPerm = (userPerms as any).operationPermissions?.[opKey];
      if (opPerm !== undefined) {
        if (opPerm[opActionKey] === false) {
          throw new ForbiddenException(
            `Access Denied: You do not have permission to ${action} for operation '${opKey}'.`,
          );
        }
      }
    }

    // 1. ── Check Module-Level CRUD Permission ──
    const modPerm = userPerms.modulePermissions?.[modKey];
    if (modPerm !== undefined) {
      if (modPerm[action] === false) {
        throw new ForbiddenException(
          `Access Denied: You do not have permission to ${action} records in ${modKey}.`,
        );
      }
    } else {
      // Check legacy permission string fallback
      const hasLegacyManage = userPerms.permissions?.includes(`${modKey}:manage`);
      const hasLegacyAction = userPerms.permissions?.includes(`${modKey}:${action}`);
      const hasLegacyView = action === 'read' && userPerms.permissions?.includes(`${modKey}:view`);

      if (!hasLegacyManage && !hasLegacyAction && !hasLegacyView) {
        // If user group has explicit permissions configured for other things but not this
        if (Object.keys(userPerms.modulePermissions || {}).length > 0 || (userPerms.permissions && userPerms.permissions.length > 0)) {
          throw new ForbiddenException(
            `Access Denied: You do not have permission to ${action} records in ${modKey}.`,
          );
        }
      }
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
