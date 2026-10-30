/**
 * storage.ts — Multi-tier browser storage abstraction.
 * Provides SSR-safe, quota-guarded, typed storage for Cookies,
 * SessionStorage, and LocalStorage with optional TTL and key namespacing.
 */

const PREFIX = 'tm:';

interface StoragePayload<T> {
  value: T;
  expiresAt?: number;
  tags?: string[];
  version?: number;
}

const isBrowser = typeof window !== 'undefined';

// ─── Cookie Utilities ─────────────────────────────────────────────────────────

export const cookieStore = {
  get(name: string): string | null {
    if (!isBrowser) return null;
    try {
      const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${encodeURIComponent(name)}=([^;]*)`));
      return match ? decodeURIComponent(match[1]) : null;
    } catch {
      return null;
    }
  },

  set(
    name: string,
    value: string,
    options: { maxAgeDays?: number; path?: string; sameSite?: 'Lax' | 'Strict' | 'None'; secure?: boolean } = {},
  ): void {
    if (!isBrowser) return;
    try {
      const { maxAgeDays = 30, path = '/', sameSite = 'Lax', secure = false } = options;
      const maxAge = maxAgeDays * 24 * 60 * 60;
      let cookieStr = `${encodeURIComponent(name)}=${encodeURIComponent(value)}; path=${path}; max-age=${maxAge}; SameSite=${sameSite}`;
      if (secure) cookieStr += '; Secure';
      document.cookie = cookieStr;
    } catch (err) {
      console.warn(`[cookieStore] Failed to set cookie "${name}":`, err);
    }
  },

  remove(name: string, path = '/'): void {
    if (!isBrowser) return;
    try {
      document.cookie = `${encodeURIComponent(name)}=; path=${path}; max-age=0; SameSite=Lax`;
    } catch (err) {
      console.warn(`[cookieStore] Failed to remove cookie "${name}":`, err);
    }
  },
};

// ─── Base Storage Wrapper ───────────────────────────────────────────────────

function createStorageWrapper(getStorage: () => Storage | null, storageName: string) {
  return {
    get<T>(key: string, defaultValue: T | null = null): T | null {
      if (!isBrowser) return defaultValue;
      try {
        const storage = getStorage();
        if (!storage) return defaultValue;

        const raw = storage.getItem(key.startsWith(PREFIX) ? key : `${PREFIX}${key}`);
        if (!raw) return defaultValue;

        const parsed = JSON.parse(raw) as StoragePayload<T>;
        
        // Check for TTL expiration if expiresAt is set
        if (parsed && typeof parsed === 'object' && typeof parsed.expiresAt === 'number') {
          if (Date.now() > parsed.expiresAt) {
            storage.removeItem(key.startsWith(PREFIX) ? key : `${PREFIX}${key}`);
            return defaultValue;
          }
          return parsed.value;
        }

        // Return direct value if it was saved without payload wrapper
        return (parsed as any)?.value !== undefined ? parsed.value : (parsed as unknown as T);
      } catch (err) {
        console.warn(`[${storageName}] Failed to read key "${key}":`, err);
        return defaultValue;
      }
    },

    set<T>(key: string, value: T, options?: { ttlMs?: number; tags?: string[]; version?: number }): boolean {
      if (!isBrowser) return false;
      try {
        const storage = getStorage();
        if (!storage) return false;

        const fullKey = key.startsWith(PREFIX) ? key : `${PREFIX}${key}`;
        const payload: StoragePayload<T> = {
          value,
          expiresAt: options?.ttlMs ? Date.now() + options.ttlMs : undefined,
          tags: options?.tags,
          version: options?.version,
        };

        storage.setItem(fullKey, JSON.stringify(payload));
        return true;
      } catch (err: any) {
        // QuotaExceededError handling: attempt prune
        if (err?.name === 'QuotaExceededError' || err?.code === 22) {
          console.warn(`[${storageName}] Quota exceeded, pruning expired items...`);
          this.pruneExpired();
          try {
            const storage = getStorage();
            const fullKey = key.startsWith(PREFIX) ? key : `${PREFIX}${key}`;
            storage?.setItem(fullKey, JSON.stringify({ value, expiresAt: options?.ttlMs ? Date.now() + options.ttlMs : undefined }));
            return true;
          } catch {
            return false;
          }
        }
        console.warn(`[${storageName}] Failed to write key "${key}":`, err);
        return false;
      }
    },

    remove(key: string): void {
      if (!isBrowser) return;
      try {
        const storage = getStorage();
        const fullKey = key.startsWith(PREFIX) ? key : `${PREFIX}${key}`;
        storage?.removeItem(fullKey);
      } catch (err) {
        console.warn(`[${storageName}] Failed to remove key "${key}":`, err);
      }
    },

    clearNamespace(predicate?: (key: string) => boolean): void {
      if (!isBrowser) return;
      try {
        const storage = getStorage();
        if (!storage) return;

        const keysToRemove: string[] = [];
        for (let i = 0; i < storage.length; i++) {
          const k = storage.key(i);
          if (k && k.startsWith(PREFIX)) {
            const logicalKey = k.slice(PREFIX.length);
            if (!predicate || predicate(logicalKey)) {
              keysToRemove.push(k);
            }
          }
        }

        keysToRemove.forEach((k) => storage.removeItem(k));
      } catch (err) {
        console.warn(`[${storageName}] Failed to clear namespace:`, err);
      }
    },

    pruneExpired(): void {
      if (!isBrowser) return;
      try {
        const storage = getStorage();
        if (!storage) return;

        const now = Date.now();
        const toDelete: string[] = [];

        for (let i = 0; i < storage.length; i++) {
          const k = storage.key(i);
          if (k && k.startsWith(PREFIX)) {
            try {
              const item = storage.getItem(k);
              if (item) {
                const parsed = JSON.parse(item);
                if (parsed?.expiresAt && now > parsed.expiresAt) {
                  toDelete.push(k);
                }
              }
            } catch {
              // Ignore parse errors
            }
          }
        }

        toDelete.forEach((k) => storage.removeItem(k));
      } catch (err) {
        console.warn(`[${storageName}] Failed to prune expired:`, err);
      }
    },

    invalidateTags(tags: string[]): void {
      if (!isBrowser || !tags || tags.length === 0) return;
      try {
        const storage = getStorage();
        if (!storage) return;

        const toDelete: string[] = [];
        for (let i = 0; i < storage.length; i++) {
          const k = storage.key(i);
          if (k && k.startsWith(PREFIX)) {
            try {
              const item = storage.getItem(k);
              if (item) {
                const parsed = JSON.parse(item);
                if (Array.isArray(parsed?.tags) && parsed.tags.some((t: string) => tags.includes(t))) {
                  toDelete.push(k);
                }
              }
            } catch {
              // Ignore
            }
          }
        }

        toDelete.forEach((k) => storage.removeItem(k));
      } catch (err) {
        console.warn(`[${storageName}] Failed to invalidate tags:`, err);
      }
    },
  };
}

export const sessionStore = createStorageWrapper(
  () => (isBrowser ? window.sessionStorage : null),
  'sessionStore',
);

export const localStore = createStorageWrapper(
  () => (isBrowser ? window.localStorage : null),
  'localStore',
);

// ─── Key Helpers ─────────────────────────────────────────────────────────────

export function buildCacheKey(
  companySlug: string | undefined,
  moduleName: string,
  subKey?: string,
  params?: Record<string, any>,
): string {
  const comp = (companySlug || '_global').trim().toLowerCase();
  const mod = moduleName.trim().toLowerCase();
  const sub = subKey ? `:${subKey.trim().toLowerCase()}` : '';
  let paramPart = '';
  if (params && Object.keys(params).length > 0) {
    const sortedKeys = Object.keys(params).sort();
    const str = sortedKeys
      .filter((k) => params[k] !== undefined && params[k] !== null && params[k] !== '')
      .map((k) => `${k}=${encodeURIComponent(String(params[k]))}`)
      .join('&');
    if (str) paramPart = `:${str}`;
  }
  return `${comp}:${mod}${sub}${paramPart}`;
}
