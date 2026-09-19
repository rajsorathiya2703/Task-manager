import { SetMetadata } from '@nestjs/common';

export const IS_AUTHENTICATED_KEY = 'isAuthenticated';

/**
 * @Authenticated() — marks an endpoint as requiring authentication (JWT)
 * but NOT any specific module-level permission.
 *
 * Use for endpoints that any logged-in user should access:
 *   - GET /auth/me
 *   - GET /user-groups/my-permissions
 *   - GET /permissions/catalog
 *   - GET /notifications
 */
export const Authenticated = () => SetMetadata(IS_AUTHENTICATED_KEY, true);
