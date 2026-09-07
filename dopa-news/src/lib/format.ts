export function relativeTime(iso: string, now: number = Date.now()): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const diff = Math.max(0, now - then);
  const min = Math.floor(diff / 60000);
  if (min < 1) return "たった今";
  if (min < 60) return `${min}分前`;
  const hours = Math.floor(min / 60);
  if (hours < 24) return `${hours}時間前`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}日前`;
  return new Date(then).toLocaleDateString("ja-JP", { month: "numeric", day: "numeric" });
}

export function clockTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" });
}

export function dateLabel(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function dayKey(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("ja-JP", { month: "long", day: "numeric", weekday: "short" });
}

/**
 * Map posts fade as they age so stale reports are visually de-emphasised,
 * then disappear entirely once expired.
 */
export function freshnessOpacity(createdAt: string, expiresAt: string, now = Date.now()): number {
  const start = new Date(createdAt).getTime();
  const end = new Date(expiresAt).getTime();
  if (Number.isNaN(start) || Number.isNaN(end) || end <= start) return 1;
  const ratio = (now - start) / (end - start);
  if (ratio <= 0.25) return 1;
  if (ratio >= 1) return 0;
  return Math.max(0.28, 1 - (ratio - 0.25) * 0.95);
}

export function percent(value: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((value / total) * 100);
}

export function compactNumber(value: number): string {
  if (value < 1000) return String(value);
  if (value < 10000) return `${(value / 1000).toFixed(1)}k`;
  return `${Math.round(value / 1000)}k`;
}
