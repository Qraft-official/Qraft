import {
  bearerTokenFromRequest,
  clip,
  cookieHasReferralApplied,
  deviceIdFromRequest,
  userFromRequest,
} from "@/lib/api-auth";
import { DEVICE_ID_COOKIE, REFERRAL_APPLIED_COOKIE } from "@/lib/device-id";
import { clientIpFromRequest, hashNetworkKey, referralFraudSecret } from "@/lib/referral-fraud";
import { applyReferralCode, getReferralMe, getReferralMeWithToken } from "@/lib/referral-server";
import { requireAppAccess } from "@/lib/release-server";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const user = await userFromRequest(request);
  if (!user) return NextResponse.json({ error: "ログインしてください。" }, { status: 401 });
  const gate = await requireAppAccess(request);
  if (gate.error) return NextResponse.json({ error: gate.error }, { status: 403 });
  try {
    const token = bearerTokenFromRequest(request);
    const me = (await getReferralMeWithToken(user.id, token)) ?? (await getReferralMe(user.id));
    if (!me) return NextResponse.json({ error: "紹介情報を取得できません。" }, { status: 500 });
    if (!me.accountCreatedAt && user.created_at) {
      me.accountCreatedAt = user.created_at;
    }
    return NextResponse.json(me);
  } catch (err) {
    console.warn("GET /api/referral failed:", err);
    return NextResponse.json({ error: "紹介情報を取得できません。" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const user = await userFromRequest(request);
  if (!user) return NextResponse.json({ error: "ログインしてください。" }, { status: 401 });
  const gate = await requireAppAccess(request);
  if (gate.error) return NextResponse.json({ error: gate.error }, { status: 403 });
  const body = (await request.json().catch(() => ({}))) as {
    code?: string;
    deviceId?: string;
    deviceFingerprint?: string;
  };
  const deviceId = deviceIdFromRequest(request, body.deviceId);
  const networkHash = hashNetworkKey(clientIpFromRequest(request), referralFraudSecret());
  const result = await applyReferralCode({
    refereeId: user.id,
    code: body.code ?? "",
    deviceId,
    deviceFingerprint: clip(body.deviceFingerprint, 128),
    cookieApplied: cookieHasReferralApplied(request),
    networkHash,
  });
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  const res = NextResponse.json(result.me);
  const cookieBase = {
    path: "/",
    maxAge: 60 * 60 * 24 * 365 * 5,
    sameSite: "lax" as const,
  };
  res.cookies.set(REFERRAL_APPLIED_COOKIE, "1", cookieBase);
  if (deviceId) {
    res.cookies.set(DEVICE_ID_COOKIE, deviceId, cookieBase);
  }
  return res;
}
