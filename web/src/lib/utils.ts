export function formatDisplayDate(dateStr?: string | null, endDateStr?: string | null): string {
  if (!dateStr && !endDateStr) return "";

  if (dateStr && endDateStr && dateStr !== endDateStr) {
    try {
      const s = new Date(dateStr);
      const e = new Date(endDateStr);
      if (!isNaN(s.getTime()) && !isNaN(e.getTime())) {
        const sFormatted = s.toLocaleDateString("en-US", { month: "short", day: "numeric" });
        const eFormatted = e.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
        return `${sFormatted} - ${eFormatted}`;
      }
    } catch {}
  }

  const target = dateStr || endDateStr;
  try {
    const d = new Date(target!);
    if (isNaN(d.getTime())) return target!;
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return target!;
  }
}

/**
 * Normalizes a URL by ensuring external schemes exist.
 * Preserves links with existing schemes (http, https, mailto, tel) and internal relative paths.
 * Prepends https:// to scheme-less inputs (e.g. "google.com" -> "https://google.com").
 */
export function normalizeUrl(url?: string): string {
  if (!url || typeof url !== 'string') return '';
  const trimmed = url.trim();
  if (!trimmed) return '';

  if (
    /^(https?:\/\/|mailto:|tel:)/i.test(trimmed) ||
    (trimmed.startsWith('/') && !trimmed.startsWith('//')) ||
    trimmed.startsWith('#')
  ) {
    return trimmed;
  }

  if (trimmed.startsWith('//')) {
    return `https:${trimmed}`;
  }

  return `https://${trimmed}`;
}
