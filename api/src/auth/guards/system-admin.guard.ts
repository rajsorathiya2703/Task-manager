import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';

/**
 * SystemAdminGuard — allows only users with is_system_admin === true.
 *
 * Use on sensitive endpoints:
 *   - Creating / updating / deleting user groups
 *   - Any future admin-only operation
 *
 * Must be applied AFTER JwtAuthGuard (so req.user is populated).
 */
@Injectable()
export class SystemAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const user = req.user;

    if (!user) {
      throw new ForbiddenException('Authentication required.');
    }

    if (user.is_system_admin !== true) {
      throw new ForbiddenException(
        'Access Denied: This action requires system administrator privileges.',
      );
    }

    return true;
  }
}
