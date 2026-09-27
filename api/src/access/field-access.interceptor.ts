import {
  CallHandler,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { IS_PUBLIC_KEY } from '../auth/decorators/public.decorator';
import {
  ACCESS_REQUIREMENT_KEY,
  AccessRequirement,
} from './decorators/require-access.decorator';
import { Decision } from './policy.engine';

/**
 * FieldAccessInterceptor (Phase 2 — P2-01)
 *
 * Enforces field-level access control at the HTTP controller boundary:
 *   1. Inbound (PATCH / PUT): Rejects any request body containing keys not in
 *      decision.updatableFields, throwing a 403 Forbidden with code 'FIELD_FORBIDDEN'
 *      per §9.2 & §9.5 of ACCESS_CONTROL_IMPLEMENTATION_PLAN.md (rejects, never silently strips).
 *   2. Outbound (JSON responses): Strips keys listed in decision.hiddenFields from
 *      the response payload (single records, arrays, and paginated response wrappers)
 *      per §9.3 & §15 of ACCESS_CONTROL_IMPLEMENTATION_PLAN.md.
 *
 * Pre-conditions:
 *   - AccessGuard runs prior to this interceptor and attaches `req.accessDecision`
 *     and `req.access[module]`.
 *   - System administrators (req.user.is_system_admin === true) bypass field restrictions.
 *   - @Public() routes and routes without @RequireAccess pass through uninhibited.
 */
@Injectable()
export class FieldAccessInterceptor implements NestInterceptor {
  private readonly logger = new Logger(FieldAccessInterceptor.name);

  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    // ─── Step 1: Skip @Public() routes ───────────────────────────────
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // ─── Step 2: System admin break-glass bypass ─────────────────────
    if (user?.is_system_admin === true) {
      return next.handle();
    }

    // ─── Step 3: Retrieve @RequireAccess metadata ────────────────────
    const requirement =
      this.reflector.getAllAndOverride<AccessRequirement>(
        ACCESS_REQUIREMENT_KEY,
        [context.getHandler(), context.getClass()],
      );

    if (!requirement) {
      return next.handle();
    }

    // ─── Step 4: Retrieve decision attached by AccessGuard ────────────
    const decision: Decision | undefined =
      request.accessDecision ||
      (requirement ? request.access?.[requirement.module] : undefined);

    if (!decision) {
      return next.handle();
    }

    // ─── Step 5: Inbound validation for PATCH / PUT bodies ───────────
    const method = request.method?.toUpperCase();
    if (method === 'PATCH' || method === 'PUT') {
      this.validateInboundBody(request.body, requirement, decision);
    }

    // ─── Step 6: Outbound sanitization of response JSON ──────────────
    const hiddenFields = new Set<string>(decision.hiddenFields || []);
    if (hiddenFields.size === 0) {
      return next.handle();
    }

    return next.handle().pipe(
      map((data) => this.sanitizePayload(data, hiddenFields)),
    );
  }

  /**
   * Rejects any PATCH/PUT request containing fields the caller cannot update.
   * Throws 403 Forbidden with code 'FIELD_FORBIDDEN' matching plan §9.5.
   */
  private validateInboundBody(
    body: any,
    requirement: AccessRequirement,
    decision: Decision,
  ): void {
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return;
    }

    const bodyKeys = Object.keys(body);
    if (bodyKeys.length === 0) {
      return;
    }

    const updatableSet = new Set<string>(decision.updatableFields || []);
    const forbidden = bodyKeys.filter((key) => !updatableSet.has(key));

    if (forbidden.length > 0) {
      this.logger.warn(
        `Field access rejected on ${requirement.module}.${requirement.action}: forbiddenFields=[${forbidden.join(
          ', ',
        )}]`,
      );

      throw new ForbiddenException({
        statusCode: 403,
        error: 'Forbidden',
        code: 'FIELD_FORBIDDEN',
        module: requirement.module,
        action: requirement.action,
        fields: forbidden,
        message:
          forbidden.length === 1
            ? `You do not have permission to update field '${forbidden[0]}' on ${requirement.module}.`
            : `You do not have permission to update fields ${forbidden
                .map((f) => `'${f}'`)
                .join(', ')} on ${requirement.module}.`,
      });
    }
  }

  /**
   * Recursively traverses and sanitizes outbound payloads to delete any
   * keys present in hiddenFields.
   */
  private sanitizePayload(
    data: any,
    hiddenFields: Set<string>,
    seen = new WeakSet(),
  ): any {
    if (data === null || data === undefined) {
      return data;
    }

    if (typeof data !== 'object') {
      return data;
    }

    // Preserve special non-plain objects (Dates, Buffers, BSON ObjectIds)
    if (
      data instanceof Date ||
      Buffer.isBuffer(data) ||
      (data as any)._bsontype === 'ObjectID' ||
      typeof (data as any).toHexString === 'function'
    ) {
      return data;
    }

    // Guard against circular structures
    if (seen.has(data)) {
      return data;
    }
    seen.add(data);

    // Arrays: map elements recursively
    if (Array.isArray(data)) {
      return data.map((item) =>
        this.sanitizePayload(item, hiddenFields, seen),
      );
    }

    // Common response wrappers (pagination and envelopes)
    if (data.data && Array.isArray(data.data)) {
      return {
        ...data,
        data: data.data.map((item: any) =>
          this.sanitizePayload(item, hiddenFields, seen),
        ),
      };
    }

    if (data.items && Array.isArray(data.items)) {
      return {
        ...data,
        items: data.items.map((item: any) =>
          this.sanitizePayload(item, hiddenFields, seen),
        ),
      };
    }

    if (data.docs && Array.isArray(data.docs)) {
      return {
        ...data,
        docs: data.docs.map((item: any) =>
          this.sanitizePayload(item, hiddenFields, seen),
        ),
      };
    }

    if (data.results && Array.isArray(data.results)) {
      return {
        ...data,
        results: data.results.map((item: any) =>
          this.sanitizePayload(item, hiddenFields, seen),
        ),
      };
    }

    // Convert Mongoose documents to plain objects or clone shallowly
    let plainObj: any;
    if (typeof data.toObject === 'function') {
      plainObj = data.toObject();
    } else {
      plainObj = { ...data };
    }

    // Strip hidden fields for this module
    for (const field of hiddenFields) {
      if (field in plainObj) {
        delete plainObj[field];
      }
    }

    // Recursively sanitize any nested records/sub-objects
    for (const key of Object.keys(plainObj)) {
      const val = plainObj[key];
      if (
        val &&
        typeof val === 'object' &&
        !(val instanceof Date) &&
        !Buffer.isBuffer(val) &&
        (val as any)._bsontype !== 'ObjectID' &&
        typeof (val as any).toHexString !== 'function'
      ) {
        plainObj[key] = this.sanitizePayload(val, hiddenFields, seen);
      }
    }

    return plainObj;
  }
}
