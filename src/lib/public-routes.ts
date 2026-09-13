/** Paths guests and crawlers may read without an account. */
export function isIndexablePublicPath(pathname: string | null | undefined) {
  if (!pathname) return false;
  if (pathname === "/" || pathname === "/discover") return true;
  if (pathname === "/terms" || pathname === "/privacy") return true;
  if (/^\/p\/[^/]+$/.test(pathname)) return true;
  return false;
}

/** Guest chrome (logo + Discover + login) without the logged-in app shell. */
export function isPublicBrowsePath(pathname: string | null | undefined) {
  return isIndexablePublicPath(pathname);
}

/** In-content Google ads may render only on these routes, and only with enough content. */
export function isAdsenseContentPath(pathname: string | null | undefined) {
  if (!pathname) return false;
  if (pathname === "/" || pathname === "/discover") return true;
  return /^\/p\/[^/]+$/.test(pathname);
}

export function isNoIndexPath(pathname: string | null | undefined) {
  if (!pathname) return true;
  if (pathname === "/ads.txt" || pathname === "/robots.txt" || pathname === "/sitemap.xml") {
    return false;
  }
  if (isIndexablePublicPath(pathname)) return false;
  return true;
}
