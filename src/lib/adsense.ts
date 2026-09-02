export const ADSENSE_CLIENT_ID = (
  process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID || "ca-pub-3606701928621609"
).trim();

export function isAdsenseCrawler(userAgent: string | null | undefined) {
  if (!userAgent) return false;
  return /Mediapartners-Google|AdsBot-Google|Google-Adsense|Googlebot/i.test(userAgent);
}

export function adsenseScriptSrc(clientId: string) {
  return `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(clientId)}`;
}
