import { ADSENSE_FRAME_ANCESTORS_CSP, isAdsenseCrawler } from "@/lib/adsense";
import { hasValidAccessCookie } from "@/lib/access-cookie";
import { isPublicApiPath, isPublicReleasePath } from "@/lib/auth-entry";
import { defaultReleaseSchedule } from "@/lib/release-config";
import { releasePhaseAt } from "@/lib/release-gate";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

function applySecurityHeaders(res: NextResponse, request: NextRequest) {
  res.headers.delete("X-Frame-Options");
  res.headers.delete("x-frame-options");
  res.headers.set("Content-Security-Policy", ADSENSE_FRAME_ANCESTORS_CSP);
  const phase = releasePhaseAt(Date.now(), defaultReleaseSchedule());
  res.headers.set("x-qraft-release-phase", phase);
  if (isAdsenseCrawler(request.headers.get("user-agent"))) {
    res.headers.set("X-Robots-Tag", "all");
    res.headers.set("Cache-Control", "no-store");
  }
  return res;
}

export function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const phase = releasePhaseAt(Date.now(), defaultReleaseSchedule());

  if (phase === "public" || isPublicReleasePath(path) || isPublicApiPath(path)) {
    return applySecurityHeaders(NextResponse.next(), request);
  }

  if (path.startsWith("/api/")) {
    return applySecurityHeaders(NextResponse.next(), request);
  }

  if (hasValidAccessCookie(request)) {
    return applySecurityHeaders(NextResponse.next(), request);
  }

  const dest = request.nextUrl.clone();
  dest.pathname = "/early-access";
  dest.search = "";
  return applySecurityHeaders(NextResponse.redirect(dest), request);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|webmanifest)$).*)"],
};
