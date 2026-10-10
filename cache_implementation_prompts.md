# Frontend Data Caching — Prompt-by-Prompt Implementation Guide

> **Project:** Task-manager · Next.js `web/` + NestJS `api/`  
> **Scope:** `web/` only — the API is never touched.  
> **Rule:** Every prompt = **exactly one file** changed.  
> **Kill switch:** set `NEXT_PUBLIC_API_CACHE=off` in `.env.local` to bypass everything.

---

## Phase A — Infrastructure (no reads cached yet)

---

### P01 · Create `web/src/lib/cache.ts` — the cache engine

**File:** `web/src/lib/cache.ts` *(new file)*

This is the heart of the system. Nothing reads from it yet — it just needs to exist and be correct.

```typescript
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
  expiresAt: number;         // Date.now() + ttl
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
```

**Commit message:** `feat(cache): add in-memory cache engine (cache.ts) — P01`

---

### P02 · Create `web/src/lib/cache-rules.ts` — invalidation map

**File:** `web/src/lib/cache-rules.ts` *(new file)*

Maps HTTP method + URL pattern → tags to invalidate. The axios interceptor (P03) will call this. No code reads from this yet.

```typescript
/**
 * cache-rules.ts
 *
 * Maps (method, URL substring) → cache tags to invalidate.
 * Called by the api.ts response interceptor on every successful non-GET response.
 *
 * To add a new rule: append a row to RULES.
 * Tags must match what cached() calls in api.ts use.
 */

export type CacheTag =
  | 'me'
  | 'employees'
  | 'teams'
  | 'projects'
  | 'tasks'
  | 'dayoff'
  | 'dashboard';

interface InvalidationRule {
  /** HTTP method (upper-case) or '*' for any mutating method */
  method: string;
  /** URL substring to match (case-insensitive) */
  urlContains: string;
  /** Tags to bust */
  tags: CacheTag[];
}

const RULES: InvalidationRule[] = [
  // ── Auth ──────────────────────────────────────────────────────────────────
  { method: 'PATCH', urlContains: '/auth/me',         tags: ['me'] },

  // ── Employees ─────────────────────────────────────────────────────────────
  { method: '*',     urlContains: '/employees',        tags: ['employees', 'teams', 'tasks', 'dashboard', 'me'] },

  // ── Users (company members) ───────────────────────────────────────────────
  { method: '*',     urlContains: '/users',            tags: ['me', 'employees', 'teams', 'tasks', 'dashboard'] },

  // ── Teams ─────────────────────────────────────────────────────────────────
  { method: '*',     urlContains: '/teams',            tags: ['teams', 'tasks', 'dashboard'] },

  // ── Projects ──────────────────────────────────────────────────────────────
  { method: '*',     urlContains: '/projects',         tags: ['projects', 'tasks', 'dashboard'] },

  // ── Tasks ─────────────────────────────────────────────────────────────────
  { method: '*',     urlContains: '/tasks',            tags: ['tasks', 'dashboard'] },

  // ── Day-off ───────────────────────────────────────────────────────────────
  { method: '*',     urlContains: '/day-off',          tags: ['dayoff'] },
  { method: '*',     urlContains: '/day-off/applications', tags: ['dayoff', 'dashboard'] },

  // ── Roles ─────────────────────────────────────────────────────────────────
  { method: '*',     urlContains: '/roles',            tags: ['me', 'employees', 'teams'] },

  // ── Companies ─────────────────────────────────────────────────────────────
  { method: 'PATCH', urlContains: '/companies',        tags: ['me'] },
];

/**
 * Given a mutating HTTP method and a URL, return the tags that should be invalidated.
 * Returns an empty array if no rule matches (i.e. no cache to bust).
 */
export function getInvalidationTags(method: string, url: string): CacheTag[] {
  const m = method.toUpperCase();
  const u = url.toLowerCase();
  const tagSet = new Set<CacheTag>();

  for (const rule of RULES) {
    const methodMatch = rule.method === '*' || rule.method === m;
    const urlMatch = u.includes(rule.urlContains.toLowerCase());
    if (methodMatch && urlMatch) {
      rule.tags.forEach((t) => tagSet.add(t));
    }
  }

  return [...tagSet];
}
```

**Commit message:** `feat(cache): add invalidation rules table (cache-rules.ts) — P02`

---

### P03 · Edit `web/src/lib/api.ts` — wire up the response interceptor + auth clear

**File:** `web/src/lib/api.ts` *(edit existing)*

Add two things:
1. A **second** response interceptor (success side) that calls `invalidateTags` / `clearCache` after every successful non-GET request.
2. Clear the cache on the **terminal 401** path (refresh failed → `processQueue(refreshErr)`).

> **Important:** Do NOT change any fetch functions yet — those come in P05–P10.

**Changes to make (shown as diff):**

```diff
 import axios from 'axios';
+import { clearCache, invalidateTags } from './cache';
+import { getInvalidationTags } from './cache-rules';

 // ... (existing code unchanged until the interceptors section)

-api.interceptors.response.use(
-  (response) => response,
-  async (error) => {
+// ── Mutation invalidation interceptor (runs BEFORE the error interceptor) ────
+api.interceptors.response.use(
+  (response) => {
+    // Only act on state-changing methods
+    const method = response.config?.method?.toUpperCase() ?? '';
+    if (method !== 'GET') {
+      const url = response.config?.url ?? '';
+      const tags = getInvalidationTags(method, url);
+      if (tags.length > 0) {
+        invalidateTags(tags);
+      }
+    }
+    return response;
+  },
+  (error) => Promise.reject(error),   // pass errors through to the next interceptor
+);
+
+// ── Auth / 401 / 403 interceptor (existing logic, unchanged except cache clear) ─
+api.interceptors.response.use(
+  (response) => response,
+  async (error) => {
     // ... existing 401 refresh logic ...

     // In the catch block where refresh fails:
-        processQueue(refreshErr);
-        return Promise.reject(refreshErr);
+        processQueue(refreshErr);
+        clearCache();           // ← add this line only
+        return Promise.reject(refreshErr);
```

**Full replacement block for the interceptors section** (lines 40–135 of the current file):

Replace the existing single `api.interceptors.response.use(...)` call with two interceptors:

```typescript
// ─── Mutation-invalidation interceptor ───────────────────────────────────────
// Runs on every successful response. For non-GET requests it invalidates
// the relevant cache tags so subsequent reads see fresh data.
api.interceptors.response.use(
  (response) => {
    const method = (response.config?.method ?? '').toUpperCase();
    if (method !== 'GET') {
      const url = response.config?.url ?? '';
      const tags = getInvalidationTags(method, url);
      if (tags.length > 0) {
        invalidateTags(tags);
      }
    }
    return response;
  },
  (err) => Promise.reject(err),
);

// ─── Auth / error interceptor (existing behaviour preserved) ─────────────────
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const isAuthRequest =
      originalRequest?.url?.includes('/auth/refresh') ||
      originalRequest?.url?.includes('/auth/guest') ||
      originalRequest?.url?.includes('/auth/google') ||
      originalRequest?.url?.includes('/auth/logout');

    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !isAuthRequest
    ) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(() => api(originalRequest))
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        await axios.post(`${API_URL}/auth/refresh`, {}, { withCredentials: true });
        processQueue();
        return api(originalRequest);
      } catch (refreshErr) {
        processQueue(refreshErr);
        clearCache(); // terminal 401: wipe the cache so stale /auth/me can't mask the expired session
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }

    // ─── 403 Forbidden (existing code — unchanged) ────────────────────────
    if (error.response?.status === 403) {
      const data = error.response.data;
      const message =
        typeof data?.message === 'string'
          ? data.message
          : Array.isArray(data?.message)
          ? data.message.join(', ')
          : data?.error || 'Access Denied: You do not have permission to perform this action.';

      if (
        message.includes('You are not a member of this company') &&
        typeof window !== 'undefined'
      ) {
        const slug = currentCompanySlug;
        if (slug) {
          window.location.href = `/${slug}/join`;
          return Promise.reject(error);
        }
      }

      const detail = {
        id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        message,
        module: data?.module,
        action: data?.action,
        code: data?.code,
        fields: data?.fields,
        url: originalRequest?.url,
        method: originalRequest?.method?.toUpperCase(),
        timestamp: Date.now(),
      };

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('app:access-denied', { detail }));
      }
    }

    return Promise.reject(error);
  },
);
```

**Also add** these three auth helper exports **at the bottom** of the file (before `chatbotEndpoint`):

```typescript
// ─── Cache lifecycle helpers (called by auth flows) ──────────────────────────
/**
 * Called by login / guest-login pages after a successful auth response.
 * Clears any stale data from a previous session.
 */
export const onLoginSuccess = (): void => {
  clearCache();
};

/**
 * Called by the logout flow before redirecting to /login.
 */
export const onLogout = (): void => {
  clearCache();
};
```

**Commit message:** `feat(cache): wire mutation-invalidation interceptor + auth clear hooks (api.ts) — P03`

---

## Phase B — Safety Hooks

---

### P04 · Edit `web/src/components/chatbot/ChatbotContext.tsx` — clear cache after every chatbot reply

**File:** `web/src/components/chatbot/ChatbotContext.tsx` *(edit existing)*

The chatbot calls the API via `fetch` (not axios), so it bypasses our interceptor. After each successful reply we must clear the whole cache.

**Diff:**

```diff
-import { getCompanySlug, API_URL } from "@/src/lib/api";
+import { getCompanySlug, API_URL } from "@/src/lib/api";
+import { clearCache } from "@/src/lib/cache";
```

Inside `sendMessage`, after `setMessages((prev) => [...prev, aiResponse]);` add:

```diff
       setMessages((prev) => [...prev, aiResponse]);
+      // The chatbot may have mutated server data via its own HTTP calls.
+      // Wipe the in-memory cache so the next component read fetches fresh data.
+      clearCache();
```

**Commit message:** `feat(cache): clear cache after every chatbot reply (ChatbotContext.tsx) — P04`

> After P04 the infrastructure is complete. No user-visible change yet.

---

## Phase C — Enable Reads, One Data Type at a Time

---

### P05 · Edit `web/src/lib/api.ts` — cache `fetchMe`

**File:** `web/src/lib/api.ts` *(edit)*

**TTL:** 2 minutes | **Tag:** `me`

The key includes the company slug so that switching companies returns a fresh entry.

Replace `fetchMe`:

```typescript
// Before (existing):
export const fetchMe = async (companySlug?: string) => {
  const targetCompany = companySlug || currentCompanySlug;
  const url = targetCompany
    ? `${authEndpoints.me}?company=${encodeURIComponent(targetCompany)}`
    : authEndpoints.me;
  const res = await api.get(url);
  return res.data;
};

// After (cached):
export const fetchMe = async (
  companySlug?: string,
  opts?: { fresh?: boolean },
): Promise<any> => {
  const targetCompany = companySlug || currentCompanySlug;
  const url = targetCompany
    ? `${authEndpoints.me}?company=${encodeURIComponent(targetCompany)}`
    : authEndpoints.me;
  const key = `me:${targetCompany || '_global'}`;

  return cached(key, () => api.get(url).then((r) => r.data), {
    ttl: 2 * 60 * 1000,   // 2 min
    tags: ['me'],
    fresh: opts?.fresh,
  });
};
```

Also add the import at the top of the file:

```diff
 import axios from 'axios';
+import { cached } from './cache';
 import { clearCache, invalidateTags } from './cache';
 import { getInvalidationTags } from './cache-rules';
```

> The dashboard's "Check Again" flow (`fetchMe` with `fresh: true`) is handled in P10.

**Commit message:** `feat(cache): cache fetchMe — 2-min TTL, tag:me (api.ts) — P05`

---

### P06 · Edit `web/src/lib/api.ts` — cache `fetchEmployees`

**File:** `web/src/lib/api.ts` *(edit)*

**TTL:** 2 minutes | **Tag:** `employees`

The key includes the company slug so multi-company tabs stay isolated.

Replace `fetchEmployees`:

```typescript
export const fetchEmployees = async (opts?: { fresh?: boolean }): Promise<any[]> => {
  const slug = currentCompanySlug;
  const key = `employees:${slug}`;

  return cached(key, () => api.get(employeeEndpoints.getAll).then((r) => r.data), {
    ttl: 2 * 60 * 1000,   // 2 min
    tags: ['employees'],
    fresh: opts?.fresh,
  });
};
```

**Commit message:** `feat(cache): cache fetchEmployees — 2-min TTL, tag:employees (api.ts) — P06`

---

### P07 · Edit `web/src/lib/api.ts` — cache `fetchTeams` and `fetchTeamById`

**File:** `web/src/lib/api.ts` *(edit)*

**TTL:** 1 minute | **Tag:** `teams`

Replace `fetchTeams` and `fetchTeamById`:

```typescript
export const fetchTeams = async (opts?: { fresh?: boolean }): Promise<any[]> => {
  const slug = currentCompanySlug;
  const key = `teams:${slug}`;

  return cached(key, () => api.get(teamEndpoints.getAll).then((r) => r.data), {
    ttl: 60 * 1000,        // 1 min
    tags: ['teams'],
    fresh: opts?.fresh,
  });
};

export const fetchTeamById = async (id: string, opts?: { fresh?: boolean }): Promise<any> => {
  const slug = currentCompanySlug;
  const key = `team:${slug}:${id}`;

  return cached(key, () => api.get(teamEndpoints.getOne(id)).then((r) => r.data), {
    ttl: 60 * 1000,        // 1 min
    tags: ['teams'],
    fresh: opts?.fresh,
  });
};
```

**Commit message:** `feat(cache): cache fetchTeams + fetchTeamById — 1-min TTL, tag:teams (api.ts) — P07`

---

### P08 · Edit `web/src/lib/api.ts` — cache `fetchProjects` and `fetchProjectById`

**File:** `web/src/lib/api.ts` *(edit)*

**TTL:** 1 minute | **Tag:** `projects`

Replace `fetchProjects` and `fetchProjectById`:

```typescript
export const fetchProjects = async (opts?: { fresh?: boolean }): Promise<any[]> => {
  const slug = currentCompanySlug;
  const key = `projects:${slug}`;

  return cached(key, () => api.get(projectEndpoints.getAll).then((r) => r.data), {
    ttl: 60 * 1000,        // 1 min
    tags: ['projects'],
    fresh: opts?.fresh,
  });
};

export const fetchProjectById = async (id: string, opts?: { fresh?: boolean }): Promise<any> => {
  const slug = currentCompanySlug;
  const key = `project:${slug}:${id}`;

  return cached(key, () => api.get(projectEndpoints.getOne(id)).then((r) => r.data), {
    ttl: 60 * 1000,        // 1 min
    tags: ['projects'],
    fresh: opts?.fresh,
  });
};
```

**Commit message:** `feat(cache): cache fetchProjects + fetchProjectById — 1-min TTL, tag:projects (api.ts) — P08`

---

### P09 · Edit `web/src/lib/api.ts` — cache `fetchTasks`

**File:** `web/src/lib/api.ts` *(edit)*

**TTL:** 20 seconds | **Tag:** `tasks`

The key encodes the optional `projectId` so per-project and all-tasks lists are cached independently.

Replace `fetchTasks`:

```typescript
export const fetchTasks = async (
  projectId?: any,
  opts?: { fresh?: boolean },
): Promise<any[]> => {
  const slug = currentCompanySlug;
  const pid = projectId
    ? typeof projectId === 'object'
      ? projectId._id || projectId.id || ''
      : String(projectId)
    : '';
  const key = `tasks:${slug}:${pid || '_all'}`;

  return cached(
    key,
    () => api.get(taskEndpoints.getAll(projectId)).then((r) => r.data),
    {
      ttl: 20 * 1000,      // 20 s — tasks change often
      tags: ['tasks'],
      fresh: opts?.fresh,
    },
  );
};
```

> The `NotificationDropdown` 10-second poll must bypass the cache so it still detects new comments exactly as today.  
> Update that one call site now:

**File:** `web/src/components/common/NotificationDropdown.tsx` *(edit — only the polling call)*

In the `syncNotifications` function (around line 87), change:

```diff
-        const [tasks, teams] = await Promise.all([
-          fetchTasks().catch(() => []),
-          fetchTeams().catch(() => []),
-        ]);
+        // Use { fresh: true } so the 10-second poll always hits the network
+        // and detects new comments exactly as before the cache was introduced.
+        const [tasks, teams] = await Promise.all([
+          fetchTasks(undefined, { fresh: true }).catch(() => []),
+          fetchTeams({ fresh: true }).catch(() => []),
+        ]);
```

> ⚠️ This prompt touches **two files** only because the `fresh: true` bypass on `NotificationDropdown` is the only call-site adjustment required for `fetchTasks`. All other callers automatically get the 20-second cache. Keeping it in P09 avoids a trivially small P09.5 commit.

**Commit message:** `feat(cache): cache fetchTasks — 20-s TTL, tag:tasks; NotificationDropdown uses fresh:true (api.ts + NotificationDropdown.tsx) — P09`

---

### P10 · Edit `web/src/lib/api.ts` — cache leave-type / balance / applications + `fetchEmployeeActivity`

**File:** `web/src/lib/api.ts` *(edit)*

Four functions get caching. Two call sites in the dashboard get `fresh: true`.

#### 10-a · `fetchLeaveTypes` — TTL 5 min, tag `dayoff`

```typescript
export const fetchLeaveTypes = async (
  activeOnly?: boolean,
  opts?: { fresh?: boolean },
): Promise<any[]> => {
  const slug = currentCompanySlug;
  const key = `leaveTypes:${slug}:${activeOnly ? 'active' : 'all'}`;

  return cached(
    key,
    () => api.get(dayOffEndpoints.leaveTypes(activeOnly)).then((r) => r.data),
    {
      ttl: 5 * 60 * 1000,  // 5 min — leave types rarely change
      tags: ['dayoff'],
      fresh: opts?.fresh,
    },
  );
};
```

#### 10-b · `fetchMyLeaveBalances` — TTL 1 min, tag `dayoff`

```typescript
export const fetchMyLeaveBalances = async (
  year?: number,
  opts?: { fresh?: boolean },
): Promise<any> => {
  const slug = currentCompanySlug;
  const key = `leaveBalances:${slug}:${year ?? 'cur'}`;

  return cached(
    key,
    () => api.get(dayOffEndpoints.balances(year)).then((r) => r.data),
    {
      ttl: 60 * 1000,      // 1 min
      tags: ['dayoff'],
      fresh: opts?.fresh,
    },
  );
};
```

#### 10-c · `fetchMyLeaveApplications` — TTL 30 s, tag `dayoff`

```typescript
export const fetchMyLeaveApplications = async (
  year?: number,
  opts?: { fresh?: boolean },
): Promise<any[]> => {
  const slug = currentCompanySlug;
  const key = `myLeaveApps:${slug}:${year ?? 'cur'}`;

  return cached(
    key,
    () => api.get(dayOffEndpoints.myApplications(year)).then((r) => r.data),
    {
      ttl: 30 * 1000,      // 30 s
      tags: ['dayoff'],
      fresh: opts?.fresh,
    },
  );
};
```

#### 10-d · `fetchEmployeeActivity` — TTL 30 s, tag `dashboard`

The key encodes all four params so toggling Weekly ↔ Monthly keeps each in its own slot.

```typescript
export const fetchEmployeeActivity = async (
  range?: string,
  startDate?: string,
  endDate?: string,
  employeeId?: string,
  opts?: { fresh?: boolean },
): Promise<any> => {
  const slug = currentCompanySlug;
  const key = `dashboard:${slug}:${range ?? 'weekly'}:${startDate ?? ''}:${endDate ?? ''}:${employeeId ?? ''}`;

  const loader = () => {
    const params = new URLSearchParams();
    if (range) params.append('range', range);
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    if (employeeId) params.append('employeeId', employeeId);
    const qs = params.toString();
    const path = qs
      ? `/dashboard/employee-activity?${qs}`
      : '/dashboard/employee-activity';
    return api.get(cp(path)).then((r) => r.data);
  };

  return cached(key, loader, {
    ttl: 30 * 1000,        // 30 s
    tags: ['dashboard'],
    fresh: opts?.fresh,
  });
};
```

#### Dashboard "Refresh" and "Check Again" must use `fresh: true`

**File:** `web/app/[companyId]/(main)/dashboard/page.tsx` *(edit — two lines)*

Inside `loadDashboard`, change the two calls to pass `fresh: true` when the user manually refreshes:

```diff
-      const me = await fetchMe();
+      // When the user presses "Refresh" or "Check Again" we skip the cache.
+      const me = await fetchMe(undefined, { fresh: !showSpinner ? true : undefined });
       setCurrentUser(me);

       // ...

-      const res = await fetchEmployeeActivity(range);
+      const res = await fetchEmployeeActivity(range, undefined, undefined, undefined, { fresh: !showSpinner ? true : undefined });
       setData(res);
```

> `showSpinner = false` means the user clicked the manual refresh button, so we force a network call.

> ⚠️ This prompt touches **two files** (api.ts + dashboard/page.tsx). The dashboard change is a mandatory call-site companion to 10-d; it would be meaningless without it.

**Commit message:** `feat(cache): cache leave+balance+applications+dashboard activity; dashboard refresh uses fresh:true (api.ts + dashboard/page.tsx) — P10`

---

## Phase D — Verification

---

### P11 · Verification checklist (no code change)

**File:** none — this is a manual verification step.

Open the browser's **Network** tab and walk through each scenario. Compare request counts with `NEXT_PUBLIC_API_CACHE=off` (baseline) vs. `NEXT_PUBLIC_API_CACHE` unset (cache on).

#### Network request reduction targets

| Scenario | Before | After |
|---|---|---|
| Open any task detail page | ~5 × `/auth/me` | 1 × `/auth/me` (TTL 2 min) |
| Click project/team in TaskDetailsPanel | `fetchProjectById` + `fetchTeamById` on every open | 0 on repeat within 1 min |
| Navigate Tasks → Projects → Teams → Tasks | `fetchTasks`, `fetchProjects`, `fetchTeams` each time | Only fires on first visit; repeat within TTL served from memory |
| NotificationDropdown (idle, 10-second poll) | `fetchTasks` + `fetchTeams` every 10 s | Unchanged — uses `fresh: true` (expected, by design) |
| Toggle dashboard Weekly → Monthly → Weekly | 3 × `fetchEmployeeActivity` | 2 × network (Weekly hit from cache 3rd time) |
| Open `ApplyLeaveDialog` multiple times | `fetchLeaveTypes` + `fetchMyLeaveBalances` each open | 0 on repeat within TTL |
| Click Refresh on dashboard | Forces network (`fresh: true`) | 1 × `/auth/me` + 1 × `/dashboard/employee-activity` |

#### Regression checklist

Walk through every feature listed below and confirm **no functional difference** vs. the baseline:

- [ ] **Login / Guest login** — redirect to company, data loads correctly, cache empty at start.
- [ ] **Logout** — redirected to `/login`; if you log back in you see fresh data (not stale cached data from the previous session).
- [ ] **Create task** — new task appears immediately in the task board (invalidation fired `tasks` tag).
- [ ] **Edit task title/status** — change persists immediately; board re-renders with correct data.
- [ ] **Delete task** — task disappears from board immediately.
- [ ] **Add comment** — comment appears immediately; `NotificationDropdown` picks it up within 10 s.
- [ ] **Create project** — projects list updated immediately.
- [ ] **Create team / add member** — teams list and task assignments updated immediately.
- [ ] **Start/stop timer** — timer state is live (never cached); `GlobalTimerDisplay` updates in real time.
- [ ] **Apply for day off** — application appears in "My Applications" immediately (balance invalidated).
- [ ] **Approve/reject leave (admin)** — approval queue reflects change immediately (`fetchAllLeaveApplications` is never cached).
- [ ] **Dashboard "Check Again" (non-employee)** — triggers fresh `fetchMe`; employee status updated correctly.
- [ ] **Chatbot sends a task mutation** — after reply, next navigation reloads data from network.
- [ ] **Set `NEXT_PUBLIC_API_CACHE=off`** — behaviour identical to original codebase; no console errors.
- [ ] **Open two browser tabs** — each tab has its own memory cache; no cross-tab data leakage.

---

## Summary of File Changes

| Prompt | File | Type | Phase |
|---|---|---|---|
| P01 | `web/src/lib/cache.ts` | **New** | A |
| P02 | `web/src/lib/cache-rules.ts` | **New** | A |
| P03 | `web/src/lib/api.ts` | Edit | A |
| P04 | `web/src/components/chatbot/ChatbotContext.tsx` | Edit | B |
| P05 | `web/src/lib/api.ts` | Edit | C |
| P06 | `web/src/lib/api.ts` | Edit | C |
| P07 | `web/src/lib/api.ts` | Edit | C |
| P08 | `web/src/lib/api.ts` | Edit | C |
| P09 | `web/src/lib/api.ts` + `NotificationDropdown.tsx` | Edit×2 | C |
| P10 | `web/src/lib/api.ts` + `dashboard/page.tsx` | Edit×2 | C |
| P11 | *(none)* | Verify | D |

> P05–P08 all touch `api.ts`. In practice you may apply them as one PR with four commits, or merge into a single commit if your team prefers. The prompts are split conceptually so each data type can be rolled back in isolation.

---

## Environment Variable Reference

```bash
# .env.local (web/)

# To disable ALL caching (emergency kill switch):
NEXT_PUBLIC_API_CACHE=off

# To enable (default — just omit the variable or set to anything else):
# NEXT_PUBLIC_API_CACHE=on
```

---

## Quick Rollback

If any cached function misbehaves:

1. **Per data type:** Remove or comment out the `cached(...)` wrapper in `api.ts` for that function and restore the original `api.get(...).then(r => r.data)`.
2. **Everything at once:** Set `NEXT_PUBLIC_API_CACHE=off` in `.env.local` and restart the dev server.
3. **Nuclear option:** `git revert` the relevant commit(s) listed above.
