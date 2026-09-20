import { SetMetadata } from '@nestjs/common';

export const REQUIRE_SYSTEM_ADMIN_KEY = 'require_system_admin';

/**
 * Decorator to restrict endpoint access strictly to System Administrators.
 */
export const RequireSystemAdmin = () => SetMetadata(REQUIRE_SYSTEM_ADMIN_KEY, true);
