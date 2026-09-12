import { AsyncLocalStorage } from 'async_hooks';
import type { AuthContext } from '../auth/types';

export const requestContext = new AsyncLocalStorage<AuthContext>();
