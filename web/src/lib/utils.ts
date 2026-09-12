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
