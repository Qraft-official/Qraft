export const AD_ACCOUNT_HANDLE = "advertisement";
export const AD_ACCOUNT_NAME = "広告";
/** Insert an in-feed ad after every N timeline posts (within the 5–10 range). */
export const AD_FEED_INTERVAL = 7;

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

export function adForSlot(slotIndex: number): InFeedAd {
  return IN_FEED_ADS[Math.abs(slotIndex) % IN_FEED_ADS.length] ?? IN_FEED_ADS[0];
}
