export const ADSENSE_CLIENT_ID = (
  process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID || "ca-pub-3606701928621609"
).trim();

/** In-feed display unit from AdSense (do not invent other slot IDs). */
export const ADSENSE_INFEED_SLOT = (
  process.env.NEXT_PUBLIC_ADSENSE_INFEED_SLOT || "6015910248"
).trim();
export const ADSENSE_INFEED_FORMAT = "fluid";
export const ADSENSE_INFEED_LAYOUT_KEY = "-h6-3+1f-3d+2z";
/** Insert one Google in-feed unit after every N posts. Never before the first post. */
export const ADSENSE_INFEED_EVERY = 4;

export function shouldInsertInFeedAd(index: number, totalPosts: number, every = ADSENSE_INFEED_EVERY) {
  if (totalPosts < every || every < 1) return false;
  if (index < 0) return false;
  return (index + 1) % every === 0;
}

export function isGoogleInFeedPath(pathname: string | null | undefined) {
  if (!pathname) return false;
  return pathname === "/" || pathname === "/discover" || pathname.startsWith("/discover?");
}

/** Google AdSense site preview loads the site in an iframe from these origins. */
export const ADSENSE_FRAME_ANCESTORS = [
  "'self'",
  "https://google.com",
  "https://www.google.com",
  "https://*.google.com",
  "https://adsense.google.com",
  "https://*.google.co.jp",
  "https://googleads.g.doubleclick.net",
  "https://*.doubleclick.net",
  "https://*.googlesyndication.com",
  "https://tpc.googlesyndication.com",
  "https://*.googleadservices.com",
  "https://partner.googleadservices.com",
].join(" ");

export const ADSENSE_FRAME_ANCESTORS_CSP = `frame-ancestors ${ADSENSE_FRAME_ANCESTORS}`;

export function isAdsenseCrawler(userAgent: string | null | undefined) {
  if (!userAgent) return false;
  return /Mediapartners-Google|AdsBot-Google|Google-Adsense|Googlebot|APIs-Google|FeedFetcher-Google/i.test(
    userAgent,
  );
}

export function adsenseScriptSrc(clientId: string) {
  return `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(clientId)}`;
}

