import { STORAGE_KEYS } from "./constants";

export const AD_ACCOUNT_HANDLE = "advertisement";
export const AD_ACCOUNT_NAME = "広告";
/** Insert an in-feed ad after every N timeline posts (6th, 12th, 18th, …). */
export const AD_FEED_INTERVAL = 6;

export type InFeedAd = {
  id: string;
  body: string;
  image?: string;
  href: string;
  cta: string;
};

export const IN_FEED_ADS: InFeedAd[] = [
  {
    id: "ad-premium",
    body: "Qraft Premium で広告なしタイムラインと Lounge。数式に集中する時間を、もっと静かに。",
    href: "internal:premium",
    cta: "詳細を見る",
  },
  {
    id: "ad-pulse",
    body: "毎日21時、全国一斉の10分一本勝負。PULSE で今日の一問に挑戦しよう。",
    href: "/sprint",
    cta: "詳細を見る",
  },
];

export function adForSlot(slotIndex: number, hiddenIds: Iterable<string> = []): InFeedAd | null {
  const hidden = new Set(hiddenIds);
  const pool = IN_FEED_ADS.filter((ad) => !hidden.has(ad.id));
  if (!pool.length) return null;
  return pool[Math.abs(slotIndex) % pool.length] ?? pool[0];
}

export function loadHiddenAdIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.hiddenAds);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : [];
  } catch {
    return [];
  }
}

export function persistHiddenAdId(id: string) {
  if (typeof window === "undefined") return;
  const next = Array.from(new Set([...loadHiddenAdIds(), id]));
  try {
    localStorage.setItem(STORAGE_KEYS.hiddenAds, JSON.stringify(next));
  } catch {
    /* ignore */
  }
}
