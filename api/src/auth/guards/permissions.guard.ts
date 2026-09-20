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
import { REQUIRE_SYSTEM_ADMIN_KEY } from '../decorators/system-admin.decorator';
import { UserGroupsService } from '../../user-groups/user-groups.service';
import { canAny, isUnrestricted } from '../../permissions/permission-resolver';

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

    const rawGroups = this.userGroupsService.getEffectiveGroups
      ? await this.userGroupsService.getEffectiveGroups(userId.toString())
      : [];

    const userPerms = await this.userGroupsService.getUserPermissions(userId.toString());

    // Reconstruct groups if rawGroups is empty (e.g. in legacy unit tests mocking only getUserPermissions)
    const effectiveGroups = rawGroups && rawGroups.length > 0
      ? rawGroups
      : (userPerms?.groups || []).map((name) => ({
          name,
          modulePermissions: Object.entries(userPerms?.modulePermissions || {}).map(([mod, p]: any) => ({
            module: mod,
            ...p,
          })),
          operationPermissions: Object.entries(userPerms?.operationPermissions || {}).map(([op, p]: any) => ({
            operation: op,
            ...p,
          })),
          fieldPermissions: Object.entries(userPerms?.fieldPermissions || {}).flatMap(([model, fields]: any) =>
            Object.entries(fields || {}).map(([field, p]: any) => ({
              model,
              field,
              ...p,
            })),
          ),
          permissions: userPerms?.permissions || [],
        }));

    // Cache on request for downstream handlers and interceptors
    req.userGroups = effectiveGroups;
    req.userPerms = userPerms;

    const isSystemAdmin = Boolean(
      user?.is_system_admin === true ||
      effectiveGroups.some((g) => (typeof g === 'string' ? g : g?.name)?.trim().toLowerCase() === 'administrators') ||
      userPerms?.groups?.some((g) => g.trim().toLowerCase() === 'administrators'),
    );
    req.isSystemAdmin = isSystemAdmin;

    // Check @RequireSystemAdmin() requirement
    const requireSystemAdmin = this.reflector.getAllAndOverride<boolean>(
      REQUIRE_SYSTEM_ADMIN_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (requireSystemAdmin && !isSystemAdmin) {
      throw new ForbiddenException(
        'Access Denied: Only system administrators are allowed to perform this action.',
      );
    }

    if (isSystemAdmin) {
      req.permissionScope = 'all';
      return true;
    }

    if (isAllowAuthenticated) {
      req.permissionScope = 'all';
      return true;
    }

    // 5. Check @RequirePermission() requirement
    const requirement = this.reflector.getAllAndOverride<PermissionRequirement>(
      REQUIRE_PERMISSION_KEY,
      [context.getHandler(), context.getClass()],
    );
    req.permissionRequirement = requirement;

    // Deny by default: If no permission requirement is set on endpoint, reject!
    if (!requirement) {
      throw new ForbiddenException(
        'Access Denied: Endpoint is protected and requires explicit permissions (deny by default).',
      );
    }

    // Check if user is unrestricted (e.g. no groups when PERMISSIONS_DENY_WHEN_NO_GROUP is false)
    if (isUnrestricted(user, effectiveGroups)) {
      req.permissionScope = 'all';
      return true;
    }

    // Deny by default: If user is not assigned to any user groups
    if (!userPerms.groups || userPerms.groups.length === 0) {
      throw new ForbiddenException(
        `Access Denied: You do not belong to any user group with access to ${requirement.module}.`,
      );
    }

    const { module: modKey, action, model: modelKey = requirement.module, operation: opKey } = requirement;

    // ── Check Module-Level CRUD Permission via canAny ──
    const moduleCheck = canAny(effectiveGroups, { module: modKey, action });
    if (!moduleCheck.allowed) {
      const reasons = moduleCheck.results.map((r) => r.reason).filter(Boolean).join('; ');
      throw new ForbiddenException(
        reasons || `Access Denied: You do not have permission to ${action} records in ${modKey}.`,
      );
    }
    req.permissionScope = moduleCheck.scope;

    // ── Check Operation-Level CRUD Permission via canAny ──
    if (opKey) {
      const opCheck = canAny(effectiveGroups, {
        module: modKey,
        action,
        operation: opKey,
      });
      if (!opCheck.allowed) {
        const reasons = opCheck.results.map((r) => r.reason).filter(Boolean).join('; ');
        throw new ForbiddenException(
          reasons || `Access Denied: You do not have permission to ${action} for operation '${opKey}'.`,
        );
      }
    }

    // ── Check Field-Level CRUD Permissions via canAny ──
    if ((action === 'create' || action === 'update') && req.body && typeof req.body === 'object') {
      const bodyKeys = Object.keys(req.body).filter(
        (k) => !['_id', 'id', 'createdAt', 'updatedAt', '__v', 'userId'].includes(k),
      );

      for (const key of bodyKeys) {
        const val = req.body[key];
        const isDeletingValue = action === 'update' && (val === null || val === '' || val === undefined);

        const fieldCheck = canAny(effectiveGroups, {
          module: modKey,
          action,
          model: modelKey,
          field: key,
          isDeletingValue,
        });

        if (!fieldCheck.allowed) {
          const reasons = fieldCheck.results.map((r) => r.reason).filter(Boolean).join('; ');
          const showDetails = isSystemAdmin || process.env.NODE_ENV !== 'production';
          let msg: string;
          if (modelKey === 'employees' && ['baseSalary', 'currency', 'payFrequency', 'bankAccountNumber', 'bankRoutingNumber', 'taxId'].includes(key) && reasons.includes('employees.compensation')) {
            msg = `Access Denied: You do not have permission to ${action === 'create' ? 'set' : 'update'} employee compensation field '${key}'.`;
          } else if (isDeletingValue) {
            msg = `Access Denied: You do not have permission to delete field '${key}' in ${modelKey}.`;
          } else if (action === 'create') {
            msg = `Access Denied: You do not have permission to set field '${key}' in ${modelKey}.`;
          } else {
            msg = `Access Denied: You do not have permission to update field '${key}' in ${modelKey}.`;
          }
          throw new ForbiddenException(showDetails ? `${msg} ${reasons}` : msg);
        }
      }
    }

    if (action === 'delete') {
      if (requirement.field) {
        const fieldCheck = canAny(effectiveGroups, {
          module: modKey,
          action: 'delete',
          model: modelKey,
          field: requirement.field,
        });
        if (!fieldCheck.allowed) {
          const reasons = fieldCheck.results.map((r) => r.reason).filter(Boolean).join('; ');
          const showDetails = isSystemAdmin || process.env.NODE_ENV !== 'production';
          const msg = `Access Denied: You do not have permission to delete field '${requirement.field}' in ${modelKey}.`;
          throw new ForbiddenException(showDetails ? `${msg} ${reasons}` : msg);
        }
      }

      if (req.body && typeof req.body === 'object') {
        const targetFields: string[] = [];
        if (typeof req.body.field === 'string') targetFields.push(req.body.field);
        if (Array.isArray(req.body.fields)) targetFields.push(...req.body.fields);

        for (const field of targetFields) {
          const fieldCheck = canAny(effectiveGroups, {
            module: modKey,
            action: 'delete',
            model: modelKey,
            field,
          });
          if (!fieldCheck.allowed) {
            const reasons = fieldCheck.results.map((r) => r.reason).filter(Boolean).join('; ');
            const showDetails = isSystemAdmin || process.env.NODE_ENV !== 'production';
            const msg = `Access Denied: You do not have permission to delete field '${field}' in ${modelKey}.`;
            throw new ForbiddenException(showDetails ? `${msg} ${reasons}` : msg);
          }
        }
      }
    }

    return true;
  }
}
