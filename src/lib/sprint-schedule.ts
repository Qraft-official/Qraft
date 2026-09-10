/** JST calendar helpers for PULSE (21:00 Asia/Tokyo). Japan has no DST. */

export const PULSE_TZ = "Asia/Tokyo";
export const PULSE_HOUR = 21;
export const PULSE_LIMIT_MS = 10 * 60 * 1000;

export function jstYmd(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: PULSE_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const y = parts.find((p) => p.type === "year")?.value;
  const m = parts.find((p) => p.type === "month")?.value;
  const d = parts.find((p) => p.type === "day")?.value;
  return `${y}-${m}-${d}`;
}

export function isJstDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

/** Instant the given JST calendar day becomes public. */
export function sprintOpensAt(day: string): Date {
  return new Date(`${day}T21:00:00+09:00`);
}

export function sprintClosesAt(day: string): Date {
  return new Date(sprintOpensAt(day).getTime() + PULSE_LIMIT_MS);
}

export function pulsePhase(day: string, now = new Date()): "scheduled" | "live" | "closed" {
  const t = now.getTime();
  const open = sprintOpensAt(day).getTime();
  const close = open + PULSE_LIMIT_MS;
  if (t < open) return "scheduled";
  if (t <= close) return "live";
  return "closed";
}

export function remainingTo(target: Date | string, now = new Date()): number {
  const ms = (typeof target === "string" ? new Date(target) : target).getTime() - now.getTime();
  return Math.max(0, ms);
}
