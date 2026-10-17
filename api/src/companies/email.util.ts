export function normalizeEmail(email: string): string {
  if (!email || typeof email !== 'string') {
    return '';
  }

  const trimmed = email.trim().toLowerCase();
  const atIndex = trimmed.lastIndexOf('@');

  if (atIndex === -1) {
    return trimmed;
  }

  let local = trimmed.slice(0, atIndex);
  let domain = trimmed.slice(atIndex + 1);

  if (domain === 'googlemail.com') {
    domain = 'gmail.com';
  }

  if (domain === 'gmail.com') {
    // Remove dots in local part
    local = local.replace(/\./g, '');
    // Drop anything after '+'
    const plusIndex = local.indexOf('+');
    if (plusIndex !== -1) {
      local = local.slice(0, plusIndex);
    }
  } else {
    // For other domains only drop '+tag'
    const plusIndex = local.indexOf('+');
    if (plusIndex !== -1) {
      local = local.slice(0, plusIndex);
    }
  }

  return `${local}@${domain}`;
}
