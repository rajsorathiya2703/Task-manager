export const escapeRegExp = (s: string): string => {
  if (!s || typeof s !== 'string') return '';
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};
