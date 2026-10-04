import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';

export const UNAMBIGUOUS_ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
const SALT_ROUNDS = 10;

/**
 * Normalises a secret code by trimming, uppercasing, and removing whitespace.
 */
export function normalizeSecretCode(code: string): string {
  if (!code) return '';
  return code.trim().toUpperCase().replace(/\s+/g, '');
}

/**
 * Generates a 12-character random secret code formatted as XXXX-XXXX-XXXX
 * using an unambiguous alphabet (excluding 0, O, 1, I, L) and crypto.randomInt.
 */
export function generateSecretCode(): string {
  const chars: string[] = [];
  for (let i = 0; i < 12; i++) {
    const index = crypto.randomInt(0, UNAMBIGUOUS_ALPHABET.length);
    chars.push(UNAMBIGUOUS_ALPHABET[index]);
  }
  return `${chars.slice(0, 4).join('')}-${chars.slice(4, 8).join('')}-${chars.slice(8, 12).join('')}`;
}

/**
 * Normalises and hashes the secret code using bcrypt.
 */
export async function hashSecretCode(code: string): Promise<string> {
  const normalized = normalizeSecretCode(code);
  return bcrypt.hash(normalized, SALT_ROUNDS);
}

/**
 * Normalises the secret code and verifies it against the bcrypt hash in constant time.
 */
export async function verifySecretCode(code: string, hash: string): Promise<boolean> {
  if (!code || !hash) {
    return false;
  }
  try {
    const normalized = normalizeSecretCode(code);
    return await bcrypt.compare(normalized, hash);
  } catch {
    return false;
  }
}
