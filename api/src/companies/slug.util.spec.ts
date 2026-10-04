import {
  slugify,
  isValidSlug,
  isReservedSlug,
  RESERVED_SLUGS,
} from './slug.util';

describe('slug.util', () => {
  describe('slugify', () => {
    it('should convert "Acme Corp!!" to "acme-corp"', () => {
      expect(slugify('Acme Corp!!')).toBe('acme-corp');
    });

    it('should collapse multiple dashes and trim leading and trailing dashes', () => {
      expect(slugify('---Hello---World---')).toBe('hello-world');
      expect(slugify('Special @#$ Characters & More')).toBe('special-characters-more');
    });

    it('should cap slug length to at most 40 characters and remove trailing dash if sliced', () => {
      const longName = 'A'.repeat(30) + ' ' + 'B'.repeat(30);
      const slug = slugify(longName);
      expect(slug.length).toBeLessThanOrEqual(40);
      expect(slug).not.toMatch(/-$/);
      expect(slug).not.toMatch(/^-/);
    });

    it('should handle empty or whitespace input', () => {
      expect(slugify('')).toBe('');
      expect(slugify('   ')).toBe('');
      expect(slugify(null as any)).toBe('');
    });
  });

  describe('isValidSlug', () => {
    it('should return true for valid slugs of length 3-40', () => {
      expect(isValidSlug('acme-corp')).toBe(true);
      expect(isValidSlug('abc')).toBe(true);
      expect(isValidSlug('a'.repeat(40))).toBe(true);
      expect(isValidSlug('company-123-test')).toBe(true);
    });

    it('should reject slugs that are too short (< 3 chars)', () => {
      expect(isValidSlug('ab')).toBe(false);
      expect(isValidSlug('a')).toBe(false);
      expect(isValidSlug('')).toBe(false);
    });

    it('should reject slugs that are too long (> 40 chars)', () => {
      expect(isValidSlug('a'.repeat(41))).toBe(false);
    });

    it('should reject slugs with leading, trailing, or consecutive dashes', () => {
      expect(isValidSlug('-acme-corp')).toBe(false);
      expect(isValidSlug('acme-corp-')).toBe(false);
      expect(isValidSlug('acme--corp')).toBe(false);
    });

    it('should reject slugs with uppercase, spaces, or special characters', () => {
      expect(isValidSlug('Acme-Corp')).toBe(false);
      expect(isValidSlug('acme corp')).toBe(false);
      expect(isValidSlug('acme_corp')).toBe(false);
      expect(isValidSlug('acme.corp')).toBe(false);
    });
  });

  describe('isReservedSlug', () => {
    it('should return true for all defined reserved slugs', () => {
      for (const reserved of RESERVED_SLUGS) {
        expect(isReservedSlug(reserved)).toBe(true);
        expect(isReservedSlug(reserved.toUpperCase())).toBe(true);
      }
    });

    it('should return false for unreserved slugs', () => {
      expect(isReservedSlug('acme-corp')).toBe(false);
      expect(isReservedSlug('globex')).toBe(false);
      expect(isReservedSlug('my-task-app')).toBe(false);
    });
  });
});
