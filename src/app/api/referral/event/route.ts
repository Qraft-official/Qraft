import { userFromRequest } from "@/lib/api-auth";
import { clientIpFromRequest, hashNetworkKey, referralFraudSecret } from "@/lib/referral-fraud";
import { recordReferralEvent } from "@/lib/referral-server";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const user = await userFromRequest(request);
  if (!user) return NextResponse.json({ error: "ログインしてください。" }, { status: 401 });
  const body = (await request.json().catch(() => ({}))) as { type?: string };
  const type = body.type;
  if (type !== "login" && type !== "solve" && type !== "post") {
    return NextResponse.json({ error: "不正なイベントです。" }, { status: 400 });
  }
  const networkHash = hashNetworkKey(clientIpFromRequest(request), referralFraudSecret());
  const result = await recordReferralEvent(user.id, type, networkHash);
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json(result.me ?? {});
}
