import { ADSENSE_FRAME_ANCESTORS_CSP, isAdsenseCrawler } from "@/lib/adsense";
import { isNoIndexPath } from "@/lib/public-routes";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const res = NextResponse.next();
  res.headers.delete("X-Frame-Options");
  res.headers.delete("x-frame-options");
  res.headers.set("Content-Security-Policy", ADSENSE_FRAME_ANCESTORS_CSP);
  const path = request.nextUrl.pathname;
  if (isNoIndexPath(path)) {
    res.headers.set("X-Robots-Tag", "noindex, nofollow");
  } else if (isAdsenseCrawler(request.headers.get("user-agent"))) {
    res.headers.set("X-Robots-Tag", "all");
    res.headers.set("Cache-Control", "no-store");
  }
  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
