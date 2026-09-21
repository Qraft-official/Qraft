const JST = "Asia/Tokyo";

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

export function jstParts(now = new Date()) {
  const fmt = new Intl.DateTimeFormat("en-GB", {
    timeZone: JST,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  const bag: Record<string, string> = {};
  for (const part of fmt.formatToParts(now)) {
    if (part.type !== "literal") bag[part.type] = part.value;
  }
  return {
    year: Number(bag.year),
    month: Number(bag.month),
    day: Number(bag.day),
    hour: Number(bag.hour),
    minute: Number(bag.minute),
    second: Number(bag.second),
  };
}

export function jstDateString(now = new Date()) {
  const p = jstParts(now);
  return `${p.year}-${pad2(p.month)}-${pad2(p.day)}`;
}

export function pulseOpensAtMs(day: string) {
  return Date.parse(`${day}T21:00:00+09:00`);
}

export function isPulseOpenAt(day: string, now = new Date()) {
  const at = pulseOpensAtMs(day);
  return Number.isFinite(at) && now.getTime() >= at;
}

export function todayPulseIsLive(now = new Date()) {
  return isPulseOpenAt(jstDateString(now), now);
}

export function getNextPulseRelease(now = new Date()) {
  const today = jstDateString(now);
  const open = pulseOpensAtMs(today);
  if (now.getTime() < open) return new Date(open);
  const [y, m, d] = today.split("-").map(Number);
  const next = new Date(Date.UTC(y, m - 1, d + 1));
  const nextDay = `${next.getUTCFullYear()}-${pad2(next.getUTCMonth() + 1)}-${pad2(next.getUTCDate())}`;
  return new Date(pulseOpensAtMs(nextDay));
}

/** Shift calendar date by whole days in UTC date-parts (JST calendar dates are YYYY-MM-DD). */
export function shiftIsoDate(day: string, deltaDays: number) {
  const [y, m, d] = day.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + deltaDays));
  return `${dt.getUTCFullYear()}-${pad2(dt.getUTCMonth() + 1)}-${pad2(dt.getUTCDate())}`;
}

export function addJstDays(day: string, days: number): string {
  return shiftIsoDate(day, days);
}

/** Display helper: 2026-09-12 → 9/12 */
export function shortMd(day: string): string {
  const [, m, d] = day.split("-");
  return `${Number(m)}/${Number(d)}`;
}

export function jstMonthGrid(year: number, month: number) {
  const first = new Date(Date.UTC(year, month - 1, 1));
  const firstWeekday = first.getUTCDay(); // 0 Sun
  const startOffset = (firstWeekday + 6) % 7; // Monday-first
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const cells: { date: string | null; inMonth: boolean }[] = [];
  for (let i = 0; i < startOffset; i++) cells.push({ date: null, inMonth: false });
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ date: `${year}-${pad2(month)}-${pad2(d)}`, inMonth: true });
  }
  while (cells.length % 7 !== 0) cells.push({ date: null, inMonth: false });
  return cells;
}
