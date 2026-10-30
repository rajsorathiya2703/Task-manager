/**
 * cache.ts — Multi-tier, browser-safe request cache.
 *
 * Rules:
 *  - Disabled on the server (typeof window === 'undefined').
 *  - Disabled when NEXT_PUBLIC_API_CACHE=off.
 *  - Max 100 entries in heap memory (oldest evicted first).
 *  - Automatically cascades across In-Memory -> SessionStorage -> LocalStorage.
 *  - Synchronous cache inspection via peekCache() for instant 0ms component hydration.
 *  - Supports direct updates via writeCache() for WebSockets and optimistic mutations.
 */

import { sessionStore, localStore } from './storage';

const CACHE_ENABLED =
  typeof window !== 'undefined' &&
  process.env.NEXT_PUBLIC_API_CACHE !== 'off';

const MAX_ENTRIES = 100;

export type StorageTier = 'memory' | 'session' | 'local' | 'any';

interface CacheEntry<T> {
  value: T;
  expiresAt: number; // Date.now() + ttl
  tags: string[];
  key: string;
}

// In-memory heap store: key → entry
const store = new Map<string, CacheEntry<unknown>>();

// Keys that were invalidated while a fetch was in-flight
const invalidatedDuringFlight = new Set<string>();

// In-flight promise map: key → Promise
const inFlight = new Map<string, Promise<unknown>>();

// ─── Internal helpers ─────────────────────────────────────────────────────────

function deepCopy<T>(value: T): T {
  if (value === null || typeof value !== 'object') return value;
  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return value;
  }
}

function evictOldest() {
  if (store.size < MAX_ENTRIES) return;
  const firstKey = store.keys().next().value;
  if (firstKey) store.delete(firstKey);
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Synchronous inspection of cache across tiers.
 * Used by React components for instant 0ms initial render without spinners.
 */
export function peekCache<T>(key: string, tier: StorageTier = 'any'): T | null {
  if (!CACHE_ENABLED) return null;

  // 1. Check in-memory store
  const memoryEntry = store.get(key);
  if (memoryEntry && Date.now() < memoryEntry.expiresAt) {
    return deepCopy(memoryEntry.value) as T;
  }

  // 2. Check SessionStorage (survives route changes and tab navigation)
  if (tier === 'session' || tier === 'any') {
    const sessionVal = sessionStore.get<T>(key);
    if (sessionVal !== null && sessionVal !== undefined) {
      // Rehydrate in-memory store
      store.set(key, {
        value: sessionVal,
        expiresAt: Date.now() + 60 * 1000,
        tags: [],
        key,
      });
      return deepCopy(sessionVal);
    }
  }

  // 3. Check LocalStorage (cross-session persistent)
  if (tier === 'local' || tier === 'any') {
    const localVal = localStore.get<T>(key);
    if (localVal !== null && localVal !== undefined) {
      store.set(key, {
        value: localVal,
        expiresAt: Date.now() + 60 * 1000,
        tags: [],
        key,
      });
      return deepCopy(localVal);
    }
  }

  return null;
}

/**
 * Directly writes a value into the cache tiers.
 * Useful for WebSocket event listeners and optimistic mutation updates.
 */
export function writeCache<T>(
  key: string,
  value: T,
  opts?: { ttl?: number; tags?: string[]; tier?: StorageTier },
): void {
  if (!CACHE_ENABLED) return;

  const ttl = opts?.ttl ?? 5 * 60 * 1000;
  const tags = opts?.tags ?? [];
  const tier = opts?.tier ?? 'session';

  // 1. Heap memory
  evictOldest();
  store.set(key, {
    value,
    expiresAt: Date.now() + ttl,
    tags,
    key,
  });

  // 2. SessionStorage
  if (tier === 'session' || tier === 'any') {
    sessionStore.set(key, value, { ttlMs: ttl, tags });
  }

  // 3. LocalStorage
  if (tier === 'local') {
    localStore.set(key, value, { ttlMs: ttl, tags });
  }
}

/**
 * Fetch `key` from cache or execute `loader()`.
 * Follows waterfall: In-Memory -> SessionStorage -> LocalStorage -> Network.
 */
export async function cached<T>(
  key: string,
  loader: () => Promise<T>,
  opts: { ttl: number; tags: string[]; fresh?: boolean; tier?: StorageTier },
): Promise<T> {
  if (!CACHE_ENABLED) return loader();

  const { ttl, tags, fresh = false, tier = 'session' } = opts;

  // Cache hit check (if fresh=false)
  if (!fresh) {
    const hit = peekCache<T>(key, tier);
    if (hit !== null && hit !== undefined) {
      return hit;
    }
  }

  // Deduplicate concurrent in-flight requests for the exact same key
  const existing = inFlight.get(key);
  if (existing && !fresh) {
    return existing as Promise<T>;
  }

  // Cache miss or fresh refresh requested
  const promise = (async () => {
    invalidatedDuringFlight.delete(key);

    const value = await loader();

    // Do not store if invalidated while the network request was in-flight
    if (!invalidatedDuringFlight.has(key)) {
      writeCache(key, value, { ttl, tags, tier });
    }

    invalidatedDuringFlight.delete(key);
    inFlight.delete(key);

    return value;
  })();

  inFlight.set(key, promise);

  promise.catch(() => {
    inFlight.delete(key);
  });

  return promise as Promise<T>;
}

/**
 * Invalidate all cache entries that match at least one tag.
 * Cascades across In-Memory, SessionStorage, and LocalStorage.
 */
export function invalidateTags(tags: string[]): void {
  if (!CACHE_ENABLED || !tags || tags.length === 0) return;

  // 1. In-memory
  for (const [key, entry] of store.entries()) {
    if (entry.tags.some((t) => tags.includes(t))) {
      store.delete(key);
      invalidatedDuringFlight.add(key);
    }
  }

  // 2. SessionStorage
  sessionStore.invalidateTags(tags);

  // 3. LocalStorage
  localStore.invalidateTags(tags);

  // Dispatch custom event so active UI components can reactively update
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('app:cache-invalidated', { detail: { tags } }));
  }
}

/**
 * Wipe every entry from cache tiers (on logout or company switch).
 */
export function clearCache(): void {
  if (!CACHE_ENABLED) return;

  for (const key of store.keys()) {
    invalidatedDuringFlight.add(key);
  }
  store.clear();

  sessionStore.clearNamespace();
  localStore.clearNamespace((k) => !k.startsWith('theme'));

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('app:cache-cleared'));
  }
}

/**
 * Return cache statistics (for dev tools and diagnostics).
 */
export function cacheStats(): { size: number; keys: string[] } {
  return { size: store.size, keys: [...store.keys()] };
}
