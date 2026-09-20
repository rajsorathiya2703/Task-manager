import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { REQUIRE_PERMISSION_KEY, PermissionRequirement } from '../decorators/permissions.decorator';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { UserGroupsService } from '../../user-groups/user-groups.service';
import { CATALOG_MODELS_AND_FIELDS } from '../../permissions/permissions.catalog';

export const PAYROLL_FIELDS = [
  'baseSalary',
  'currency',
  'payFrequency',
  'bankAccountNumber',
  'bankRoutingNumber',
  'taxId',
];

@Injectable()
export class FieldPermissionsInterceptor implements NestInterceptor {
  constructor(
    private reflector: Reflector,
    private userGroupsService: UserGroupsService,
  ) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    // 1. If endpoint is marked @Public(), allow unmodified response
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return next.handle();
    }

    const req = context.switchToHttp().getRequest();
    const user = req.user;
    const userId = user?.id || user?._id;

    if (!userId) {
      return next.handle();
    }

    // 2. Resolve user permissions (utilize cached req.userPerms if already populated by PermissionsGuard)
    let userPerms = req.userPerms;
    let isSystemAdmin = req.isSystemAdmin;

    if (!userPerms) {
      userPerms = await this.userGroupsService.getUserPermissions(userId.toString());
      const isAdministrator = userPerms.groups?.some(
        (groupName) => groupName.trim().toLowerCase() === 'administrators',
      );
      isSystemAdmin = Boolean(isAdministrator || user?.is_system_admin === true);
    }

    // Administrators and system admins bypass all field restrictions (full access)
    if (isSystemAdmin) {
      return next.handle();
    }

    // 3. Identify active requirement and target model
    const requirement =
      req.permissionRequirement ||
      this.reflector.getAllAndOverride<PermissionRequirement>(
        REQUIRE_PERMISSION_KEY,
        [context.getHandler(), context.getClass()],
      );

    const modelKey = requirement?.model || requirement?.module;

    // 4. Determine forbidden fields for this model
    const forbiddenFields = new Set<string>();

    if (modelKey && userPerms.fieldPermissions?.[modelKey]) {
      const modelFieldPerms = userPerms.fieldPermissions[modelKey];
      for (const [field, perms] of Object.entries(modelFieldPerms)) {
        if (perms && (perms as any).read === false) {
          forbiddenFields.add(field);
        }
      }
    }

    // Operation-level compensation check: if employees compensation read is explicitly denied
    const compPerm = userPerms.operationPermissions?.['employees.compensation'];
    const compensationDenied = compPerm && compPerm.read === false;
    if (modelKey === 'employees' && compensationDenied) {
      PAYROLL_FIELDS.forEach((f) => forbiddenFields.add(f));
    }

    return next.handle().pipe(
      map((data) => {
        if (!data) return data;
        return this.sanitizePayload(data, modelKey, forbiddenFields, userPerms, compensationDenied);
      }),
    );
  }

  private sanitizePayload(
    data: any,
    modelKey: string | undefined,
    forbiddenFields: Set<string>,
    userPerms: any,
    compensationDenied?: boolean,
  ): any {
    if (data === null || data === undefined) {
      return data;
    }

    if (Array.isArray(data)) {
      return data.map((item) =>
        this.sanitizePayload(item, modelKey, forbiddenFields, userPerms, compensationDenied),
      );
    }

    if (typeof data !== 'object') {
      return data;
    }

    // Preserve special types like Date, ObjectId, Buffers
    if (
      data instanceof Date ||
      (data as any)._bsontype === 'ObjectID' ||
      Buffer.isBuffer(data)
    ) {
      return data;
    }

    // Handle common response wrapper objects (e.g. pagination)
    if (data.data && Array.isArray(data.data)) {
      return {
        ...data,
        data: data.data.map((item: any) =>
          this.sanitizePayload(item, modelKey, forbiddenFields, userPerms, compensationDenied),
        ),
      };
    }
    if (data.items && Array.isArray(data.items)) {
      return {
        ...data,
        items: data.items.map((item: any) =>
          this.sanitizePayload(item, modelKey, forbiddenFields, userPerms, compensationDenied),
        ),
      };
    }

    // Convert Mongoose document to plain object or clone shallowly
    let plainObj: any;
    if (typeof data.toObject === 'function') {
      plainObj = data.toObject();
    } else {
      plainObj = { ...data };
    }

    // Strip forbidden fields for the matching model
    for (const field of forbiddenFields) {
      delete plainObj[field];
    }

    // Universal guard for compensation fields if user is denied compensation read access
    if (
      compensationDenied ||
      userPerms?.operationPermissions?.['employees.compensation']?.read === false ||
      userPerms?.fieldPermissions?.['employees']?.['baseSalary']?.read === false
    ) {
      for (const pf of PAYROLL_FIELDS) {
        if (pf in plainObj) {
          delete plainObj[pf];
        }
      }
    }

    return plainObj;
  }
}
