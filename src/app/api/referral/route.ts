import { bearerTokenFromRequest, userFromRequest } from "@/lib/api-auth";
import { applyReferralCode, getReferralMe, getReferralMeWithToken } from "@/lib/referral-server";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const user = await userFromRequest(request);
  if (!user) return NextResponse.json({ error: "ログインしてください。" }, { status: 401 });
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
  const body = (await request.json().catch(() => ({}))) as { code?: string; deviceId?: string };
  const result = await applyReferralCode({
    refereeId: user.id,
    code: body.code ?? "",
    deviceId: body.deviceId ?? "",
  });
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json(result.me);
}
