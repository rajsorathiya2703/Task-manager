/**
 * cache.ts — In-memory, browser-only request cache.
 *
 * Rules:
 *  - Disabled on the server (typeof window === 'undefined').
 *  - Disabled when NEXT_PUBLIC_API_CACHE=off.
 *  - Max 100 entries (oldest evicted first).
 *  - Each caller gets a deep copy of the cached value.
 *  - If an invalidation fires while a request is in flight,
 *    the response is returned to the caller but NOT stored.
 */

const CACHE_ENABLED =
  typeof window !== 'undefined' &&
  process.env.NEXT_PUBLIC_API_CACHE !== 'off';

const MAX_ENTRIES = 100;

interface CacheEntry<T> {
  value: T;
  expiresAt: number; // Date.now() + ttl
  tags: string[];
  key: string;
}

// The store: key → entry
const store = new Map<string, CacheEntry<unknown>>();

// Keys that were invalidated while a fetch was in-flight.
// Any response that lands after its key was invalidated is NOT stored.
const invalidatedDuringFlight = new Set<string>();

// In-flight promise map: key → Promise
// Prevents duplicate parallel requests for the same key.
const inFlight = new Map<string, Promise<unknown>>();

// ─── Internal helpers ─────────────────────────────────────────────────────────

function deepCopy<T>(value: T): T {
  // Fast path for primitives and null
  if (value === null || typeof value !== 'object') return value;
  return JSON.parse(JSON.stringify(value));
}

function evictOldest() {
  if (store.size < MAX_ENTRIES) return;
  // Delete the first (oldest-inserted) key
  const firstKey = store.keys().next().value;
  if (firstKey) store.delete(firstKey);
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Fetch `key` from cache or run `loader()`.
 *
 * @param key    Unique string cache key.
 * @param loader Async function that fetches fresh data.
 * @param opts
 *   ttl   Time-to-live in milliseconds.
 *   tags  Cache tags for grouped invalidation.
 *   fresh If true, skip the cache read and refresh the entry.
 */
export async function cached<T>(
  key: string,
  loader: () => Promise<T>,
  opts: { ttl: number; tags: string[]; fresh?: boolean },
): Promise<T> {
  if (!CACHE_ENABLED) return loader();

  const { ttl, tags, fresh = false } = opts;

  // Cache hit (and not requesting fresh data)
  if (!fresh) {
    const entry = store.get(key);
    if (entry && Date.now() < entry.expiresAt) {
      return deepCopy(entry.value) as T;
    }
  }

  // Deduplicate in-flight requests for the same key
  const existing = inFlight.get(key);
  if (existing && !fresh) {
    return existing as Promise<T>;
  }

  // Miss — fetch fresh data
  const promise = (async () => {
    // Clear any stale invalidation marker for this key
    invalidatedDuringFlight.delete(key);

    const value = await loader();

    // Only store if the key was not invalidated during the fetch
    if (!invalidatedDuringFlight.has(key)) {
      evictOldest();
      store.set(key, {
        value,
        expiresAt: Date.now() + ttl,
        tags,
        key,
      });
    }
    invalidatedDuringFlight.delete(key);
    inFlight.delete(key);

    return value;
  })();

  inFlight.set(key, promise);

  // On error, clean up
  promise.catch(() => {
    inFlight.delete(key);
  });

  return promise as Promise<T>;
}

/**
 * Invalidate all cache entries that have at least one matching tag.
 * Also marks any in-flight keys with those tags so their responses are discarded.
 */
export function invalidateTags(tags: string[]): void {
  if (!CACHE_ENABLED) return;
  for (const [key, entry] of store.entries()) {
    if (entry.tags.some((t) => tags.includes(t))) {
      store.delete(key);
      invalidatedDuringFlight.add(key);
    }
  }
}

/**
 * Wipe every entry from the cache (used on logout, auth changes, chatbot replies).
 */
export function clearCache(): void {
  if (!CACHE_ENABLED) return;
  for (const key of store.keys()) {
    invalidatedDuringFlight.add(key);
  }
  store.clear();
}

/**
 * Return cache statistics (useful during development / P11 verification).
 */
export function cacheStats(): { size: number; keys: string[] } {
  return { size: store.size, keys: [...store.keys()] };
}
