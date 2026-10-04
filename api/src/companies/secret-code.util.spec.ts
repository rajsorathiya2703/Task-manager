import {
  generateSecretCode,
  hashSecretCode,
  verifySecretCode,
  UNAMBIGUOUS_ALPHABET,
} from './secret-code.util';

describe('secret-code.util', () => {
  describe('generateSecretCode', () => {
    it('should generate a code matching the format XXXX-XXXX-XXXX and using only the unambiguous alphabet', () => {
      const code = generateSecretCode();
      const formatRegex = /^[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{4}-[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{4}-[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{4}$/;
      expect(code).toMatch(formatRegex);

      // Verify no ambiguous characters (0, O, 1, I, L)
      expect(code).not.toMatch(/[0O1IL]/);

      // Verify all characters are in UNAMBIGUOUS_ALPHABET (excluding hyphens)
      const rawChars = code.replace(/-/g, '').split('');
      expect(rawChars.length).toBe(12);
      for (const char of rawChars) {
        expect(UNAMBIGUOUS_ALPHABET).toContain(char);
      }
    });

    it('should generate different codes on subsequent calls', () => {
      const code1 = generateSecretCode();
      const code2 = generateSecretCode();
      expect(code1).not.toBe(code2);
    });
  });

  describe('hashSecretCode & verifySecretCode', () => {
    it('should produce a hash that is not equal to the plain code', async () => {
      const code = generateSecretCode();
      const hash = await hashSecretCode(code);

      expect(hash).toBeDefined();
      expect(hash).not.toBe(code);
      expect(hash.startsWith('$2')).toBe(true);
    });

    it('should verify true for the exact matching code', async () => {
      const code = generateSecretCode();
      const hash = await hashSecretCode(code);

      const isValid = await verifySecretCode(code, hash);
      expect(isValid).toBe(true);
    });

    it('should verify true for matching code with lowercase and extra spaces', async () => {
      const code = generateSecretCode();
      const hash = await hashSecretCode(code);

      // Test with lowercase
      const lower = code.toLowerCase();
      expect(await verifySecretCode(lower, hash)).toBe(true);

      // Test with extra leading/trailing and inner spaces
      const spaced = `  ${code.slice(0, 5)}  ${code.slice(5)}  `;
      expect(await verifySecretCode(spaced, hash)).toBe(true);

      // Test with lowercase and extra spaces combined
      const lowerSpaced = `   ${lower}   `;
      expect(await verifySecretCode(lowerSpaced, hash)).toBe(true);
    });

    it('should verify false for incorrect codes', async () => {
      const code = generateSecretCode();
      const hash = await hashSecretCode(code);

      const wrongCode = 'XXXX-YYYY-ZZZZ';
      expect(await verifySecretCode(wrongCode, hash)).toBe(false);
      expect(await verifySecretCode('', hash)).toBe(false);
    });
  });
});
