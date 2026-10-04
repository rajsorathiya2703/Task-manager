import {
  applyDecorators,
  createParamDecorator,
  ExecutionContext,
  SetMetadata,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { Types } from 'mongoose';
import { TenantGuard, NO_TENANT_KEY } from './tenant.guard';
import { TenantInterceptor } from './tenant.interceptor';

export { NO_TENANT_KEY };

/**
 * Decorator to bypass TenantGuard on specific routes or controllers.
 */
export const NoTenant = () => SetMetadata(NO_TENANT_KEY, true);

/**
 * Parameter decorator that extracts the active company ID (as Types.ObjectId) from the request.
 */
export const CurrentCompany = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): Types.ObjectId => {
    const request = ctx.switchToHttp().getRequest();
    return request.company?._id;
  },
);

/**
 * Parameter decorator that extracts the caller's active Membership document from the request.
 */
export const CurrentMembership = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.membership;
  },
);

/**
 * Composite decorator applying both TenantGuard and TenantInterceptor to a controller or route.
 */
export function TenantScoped() {
  return applyDecorators(
    UseGuards(TenantGuard),
    UseInterceptors(TenantInterceptor),
  );
}
