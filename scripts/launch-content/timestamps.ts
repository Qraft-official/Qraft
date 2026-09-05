export const LAUNCH_DATE = "2026-09-12";
export const LAUNCH_PUBLISH_START_ISO = `${LAUNCH_DATE}T00:00:00+09:00`;
export const LAUNCH_PUBLISH_END_ISO = `${LAUNCH_DATE}T08:00:00+09:00`;

const START = Date.parse(LAUNCH_PUBLISH_START_ISO);
const END = Date.parse(LAUNCH_PUBLISH_END_ISO);

export function tokyoYmd(now = new Date()) {
  return now.toLocaleDateString("en-CA", { timeZone: "Asia/Tokyo" });
}

export function launchPublishStart() {
  return START;
}

export function launchPublishEnd() {
  return END;
}

function hashString(value: string) {
  let h = 0;
  for (let i = 0; i < value.length; i++) h = (h * 31 + value.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function clamp(t: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, t));
}

/** Irregular stamps in 2026-09-12 00:00–08:00 JST (last strictly before 08:00). */
export function irregularWindowTimes(seedKeys: string[]) {
  const n = seedKeys.length;
  if (n === 0) return [] as number[];
  const first = START + 7 * 60_000;
  const last = END - 9 * 60_000;
  if (n === 1) return [first];

  const weights = seedKeys.map((key) => 7 + (hashString(key) % 11));
  const sum = weights.reduce((a, b) => a + b, 0);
  let acc = 0;
  const raw = seedKeys.map((key, i) => {
    const jitter = (hashString(`${key}:jitter`) % 150_000) - 60_000;
    const t = first + Math.round((acc / sum) * (last - first)) + jitter;
    acc += weights[i];
    return clamp(t, first, last);
  });
  raw.sort((a, b) => a - b);
  raw[0] = first;
  raw[n - 1] = last;

  const used = new Set<number>();
  return raw.map((value, i) => {
    let t = Math.round(value / 1000) * 1000;
    t = clamp(t, first, last);
    while (used.has(t)) t += 1000;
    if (t > last) {
      t = last - (n - 1 - i) * 1000;
      while (used.has(t)) t -= 1000;
    }
    used.add(t);
    return t;
  });
}

const AUTHOR_MIN_GAP_MS = 13 * 60_000;

export function staggeredPublishTimes(items: { seedKey: string; authorKey: string }[]) {
  const buckets = new Map<string, { seedKey: string; authorKey: string }[]>();
  for (const item of items) {
    const list = buckets.get(item.authorKey) ?? [];
    list.push(item);
    buckets.set(item.authorKey, list);
  }
  for (const list of buckets.values()) {
    list.sort((a, b) => a.seedKey.localeCompare(b.seedKey));
  }

  const interleaved: { seedKey: string; authorKey: string }[] = [];
  const authors = [...buckets.keys()].sort();
  let remaining = items.length;
  while (remaining > 0) {
    for (const author of authors) {
      const list = buckets.get(author);
      const next = list?.shift();
      if (!next) continue;
      interleaved.push(next);
      remaining -= 1;
    }
  }

  const times = irregularWindowTimes(interleaved.map((row) => row.seedKey));
  const lastByAuthor = new Map<string, number>();
  const adjusted: number[] = [];
  for (let i = 0; i < interleaved.length; i++) {
    const author = interleaved[i].authorKey;
    let t = times[i];
    const prev = lastByAuthor.get(author);
    if (prev !== undefined && t < prev + AUTHOR_MIN_GAP_MS) {
      t = prev + AUTHOR_MIN_GAP_MS + (hashString(interleaved[i].seedKey) % 180_000);
    }
    if (t >= END) t = END - 60_000 - ((interleaved.length - i) * 13_000);
    if (t < START) t = START + 7 * 60_000 + i * 1000;
    while (adjusted.includes(t)) t += 1000;
    adjusted.push(t);
    lastByAuthor.set(author, t);
  }

  const byKey = new Map<string, string>();
  interleaved.forEach((row, i) => {
    byKey.set(row.seedKey, new Date(adjusted[i]).toISOString());
  });
  return items.map((item) => byKey.get(item.seedKey)!);
}

/** Past offsets for X promo posts; never later than `nowMs`. */
export const X_PROMO_OFFSET_MINUTES: number[] = [110, 94, 77, 61, 43, 27, 14, 3];

export function pastPromoTimes(count: number, nowMs: number) {
  const offsets = [...X_PROMO_OFFSET_MINUTES];
  while (offsets.length < count) {
    offsets.push(3 + offsets.length);
  }
  const used = new Set<number>();
  return offsets.map((minutes, i) => {
    let t = nowMs - minutes * 60_000 - ((i * 17_000) % 50_000);
    if (t > nowMs) t = nowMs - 30_000 - i * 1000;
    t = Math.round(t / 1000) * 1000;
    while (used.has(t) || t > nowMs) t -= 1000;
    used.add(t);
    return new Date(t).toISOString();
  });
}
