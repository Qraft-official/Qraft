import { ADSENSE_FRAME_ANCESTORS_CSP, isAdsenseCrawler } from "@/lib/adsense";
import { defaultReleaseSchedule } from "@/lib/release-config";
import { isPublicReleasePath, releasePhaseAt } from "@/lib/release-gate";
import { createSupabaseMiddlewareClient } from "@/lib/supabase-middleware";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

function withCsp(res: NextResponse, request: NextRequest) {
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

function copyCookies(from: NextResponse, to: NextResponse) {
  from.cookies.getAll().forEach((cookie) => {
    to.cookies.set(cookie);
  });
  return to;
}

export async function middleware(request: NextRequest) {
  let response = withCsp(NextResponse.next({ request }), request);
  const crawler = isAdsenseCrawler(request.headers.get("user-agent"));
  const pathname = request.nextUrl.pathname;
  const phase = releasePhaseAt(Date.now(), defaultReleaseSchedule());

  const { supabase, getResponse } = createSupabaseMiddlewareClient(request, response);
  response = withCsp(getResponse(), request);

  if (crawler || isPublicReleasePath(pathname) || phase === "public") {
    if (supabase) {
      await supabase.auth.getUser();
    }
    return withCsp(getResponse(), request);
  }

  if (!supabase) {
    const url = request.nextUrl.clone();
    url.pathname = "/early-access";
    return copyCookies(getResponse(), withCsp(NextResponse.rewrite(url, { request }), request));
  }

  const { data, error: userError } = await supabase.auth.getUser();
  response = withCsp(getResponse(), request);
  if (userError || !data.user) {
    const url = request.nextUrl.clone();
    url.pathname = "/early-access";
    return copyCookies(response, withCsp(NextResponse.rewrite(url, { request }), request));
  }

  const { data: allowed, error } = await supabase.rpc("can_use_app");
  response = withCsp(getResponse(), request);
  if (error || allowed !== true) {
    const url = request.nextUrl.clone();
    url.pathname = "/early-access";
    return copyCookies(response, withCsp(NextResponse.rewrite(url, { request }), request));
  }

  return withCsp(getResponse(), request);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
