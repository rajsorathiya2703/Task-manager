import type { AuthContext } from '../auth/types';
import { requestContext } from '../client/requestContext';

export { requestContext };

/**
 * Builds an AuthContext carrying the user's JWT so the apiClient forwards it.
 */
export function buildAuthContextFromToken(userId: string, accessToken: string): AuthContext {
  return { userId, email: '', accessToken };
}

/**
 * withAuthContext — runs an async function inside the request-scoped
 * AsyncLocalStorage so apiClient can pick up the JWT Bearer token automatically.
 */
export async function withAuthContext<T>(ctx: AuthContext, fn: () => Promise<T>): Promise<T> {
  return requestContext.run(ctx, fn);
}
