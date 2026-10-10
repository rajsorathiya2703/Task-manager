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
  { method: 'PATCH', urlContains: '/auth/me', tags: ['me'] },

  // ── Employees ─────────────────────────────────────────────────────────────
  { method: '*', urlContains: '/employees', tags: ['employees', 'teams', 'tasks', 'dashboard', 'me'] },

  // ── Users (company members) ───────────────────────────────────────────────
  { method: '*', urlContains: '/users', tags: ['me', 'employees', 'teams', 'tasks', 'dashboard'] },

  // ── Teams ─────────────────────────────────────────────────────────────────
  { method: '*', urlContains: '/teams', tags: ['teams', 'tasks', 'dashboard'] },

  // ── Projects ──────────────────────────────────────────────────────────────
  { method: '*', urlContains: '/projects', tags: ['projects', 'tasks', 'dashboard'] },

  // ── Tasks ─────────────────────────────────────────────────────────────────
  { method: '*', urlContains: '/tasks', tags: ['tasks', 'dashboard'] },

  // ── Day-off ───────────────────────────────────────────────────────────────
  { method: '*', urlContains: '/day-off', tags: ['dayoff'] },
  { method: '*', urlContains: '/day-off/applications', tags: ['dayoff', 'dashboard'] },

  // ── Roles ─────────────────────────────────────────────────────────────────
  { method: '*', urlContains: '/roles', tags: ['me', 'employees', 'teams'] },

  // ── Companies ─────────────────────────────────────────────────────────────
  { method: 'PATCH', urlContains: '/companies', tags: ['me'] },
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
