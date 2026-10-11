import { escapeRegExp } from './escape-regexp';

describe('escapeRegExp (BUG-08)', () => {
  it('escapes regex special characters properly', () => {
    const raw = 'test+user.name?*^$()[]{}|\\';
    const escaped = escapeRegExp(raw);
    expect(escaped).toBe('test\\+user\\.name\\?\\*\\^\\$\\(\\)\\[\\]\\{\\}\\|\\\\');
  });

  it('ensures "a+b@x.com" and "a.b@x.com" do not match each other', () => {
    const emailWithPlus = 'a+b@x.com';
    const emailWithDot = 'a.b@x.com';
    const emailSimple = 'ab@x.com';

    const regexPlus = new RegExp(`^${escapeRegExp(emailWithPlus)}$`, 'i');
    const regexDot = new RegExp(`^${escapeRegExp(emailWithDot)}$`, 'i');

    expect(regexPlus.test('a+b@x.com')).toBe(true);
    expect(regexPlus.test('A+B@X.COM')).toBe(true);
    expect(regexPlus.test('a.b@x.com')).toBe(false);
    expect(regexPlus.test('ab@x.com')).toBe(false);

    expect(regexDot.test('a.b@x.com')).toBe(true);
    expect(regexDot.test('a+b@x.com')).toBe(false);
    expect(regexDot.test('axb@x.com')).toBe(false);
  });

  it('handles empty or non-string inputs safely', () => {
    expect(escapeRegExp('')).toBe('');
    expect(escapeRegExp(undefined as any)).toBe('');
    expect(escapeRegExp(null as any)).toBe('');
  });
});
