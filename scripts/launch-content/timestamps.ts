export const LAUNCH_DATE = "2026-09-12";
const START = Date.parse(`${LAUNCH_DATE}T08:12:00+09:00`);
const END = Date.parse(`${LAUNCH_DATE}T20:42:00+09:00`);

export function tokyoYmd(now = new Date()) {
  return now.toLocaleDateString("en-CA", { timeZone: "Asia/Tokyo" });
}

export function launchWindowStart() {
  return START;
}

export function launchWindowEnd() {
  return END;
}

export function writeBlockedReason(now = new Date()) {
  const t = now.getTime();
  if (t < START) {
    return `Refusing writes: now is before the launch window (${LAUNCH_DATE} 08:12 JST). Future created_at is not allowed.`;
  }
  return null;
}

function hashString(value: string) {
  let h = 0;
  for (let i = 0; i < value.length; i++) h = (h * 31 + value.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/** Planned stamps on 2026-09-12 08:12–20:42 JST, unique to the second. */
export function plannedCreatedAt(seedKey: string, index: number, total: number, now = new Date()) {
  const n = Math.max(total, 1);
  const span = END - START;
  const base = START + Math.round((index * span) / Math.max(n - 1, 1));
  const jitter = hashString(seedKey) % 47_000;
  let t = base + jitter;
  const cap = Math.min(END, Math.max(START, now.getTime()));
  const writeBlock = writeBlockedReason(now);
  if (!writeBlock && t > cap) t = cap - ((hashString(seedKey) % 600_000) + 1_000);
  if (t < START) t = START + (index * 73_000);
  if (t > END) t = END - ((n - index) * 11_000);
  return new Date(t).toISOString();
}

export function uniqueIsoTimes(seedKeys: string[], now = new Date()) {
  const used = new Set<number>();
  return seedKeys.map((key, index) => {
    let t = Date.parse(plannedCreatedAt(key, index, seedKeys.length, now));
    while (used.has(t)) t += 1000;
    used.add(t);
    return new Date(t).toISOString();
  });
}
