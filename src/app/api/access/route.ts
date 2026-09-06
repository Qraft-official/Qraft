import {
  accessCookieHeader,
  clearAccessCookieHeader,
  createAccessCookieValue,
} from "@/lib/access-cookie";
import { userFromRequest } from "@/lib/api-auth";
import { getAccessSnapshot } from "@/lib/release-server";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const access = await getAccessSnapshot(request);
    const headers = new Headers({ "Cache-Control": "no-store" });
    const user = await userFromRequest(request);
    if (access.canAccess && user) {
      const value = createAccessCookieValue(user.id);
      if (value) headers.append("Set-Cookie", accessCookieHeader(value));
    } else {
      headers.append("Set-Cookie", clearAccessCookieHeader());
    }
    return NextResponse.json(access, { headers });
  } catch (err) {
    console.error("[access]", err);
    return NextResponse.json(
      {
        error: "公開状態の確認に失敗しました",
        phase: "prelaunch",
        canAccess: false,
        isAdmin: false,
        isMember: false,
        signupOpen: false,
        joinOpen: false,
        cap: 30,
        memberCount: 30,
        remaining: 0,
        earlyAccessStart: "2026-09-12T00:00:00+09:00",
        publicReleaseAt: "2026-09-19T00:00:00+09:00",
      },
      { status: 500, headers: { "Cache-Control": "no-store", "Set-Cookie": clearAccessCookieHeader() } },
    );
  }
}

export async function DELETE() {
  return NextResponse.json(
    { ok: true },
    { headers: { "Cache-Control": "no-store", "Set-Cookie": clearAccessCookieHeader() } },
  );
}
