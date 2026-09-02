export const ADSENSE_CLIENT_ID = (
  process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID || "ca-pub-3606701928621609"
).trim();

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
].join(" ");

export const ADSENSE_FRAME_ANCESTORS_CSP = `frame-ancestors ${ADSENSE_FRAME_ANCESTORS}`;

export function isAdsenseCrawler(userAgent: string | null | undefined) {
  if (!userAgent) return false;
  return /Mediapartners-Google|AdsBot-Google|Google-Adsense|Googlebot/i.test(userAgent);
}

export function adsenseScriptSrc(clientId: string) {
  return `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(clientId)}`;
}

