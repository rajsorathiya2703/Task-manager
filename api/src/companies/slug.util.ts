export const RESERVED_SLUGS: readonly string[] = [
  'login',
  'register-company',
  'join',
  'api',
  'auth',
  'companies',
  'settings',
  'dashboard',
  'tasks',
  'projects',
  'timeline',
  'dayoff',
  'configuration',
  'admin',
  'static',
  '_next',
  'public',
  'favicon.ico',
  'robots.txt',
  'health',
];

const RESERVED_SLUGS_SET = new Set<string>(
  RESERVED_SLUGS.map((slug) => slug.toLowerCase()),
);

/**
 * Converts a company name into a URL-friendly slug:
 * - Lowercase
 * - Replaces non-alphanumeric characters with '-'
 * - Collapses consecutive dashes
 * - Trims leading and trailing dashes
 * - Limits length to at most 40 characters
 */
export function slugify(name: string): string {
  if (!name || typeof name !== 'string') return '';
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
    .replace(/-+$/, '');
}

/**
 * Validates if a slug complies with requirements:
 * - Only lowercase alphanumeric characters and hyphens
 * - No consecutive hyphens, cannot start or end with a hyphen
 * - Length between 3 and 40 characters
 */
export function isValidSlug(slug: string): boolean {
  if (!slug || typeof slug !== 'string') return false;
  if (slug.length < 3 || slug.length > 40) return false;
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug);
}

/**
 * Checks whether a slug is in the list of reserved route keywords.
 */
export function isReservedSlug(slug: string): boolean {
  if (!slug || typeof slug !== 'string') return false;
  return RESERVED_SLUGS_SET.has(slug.trim().toLowerCase());
}
