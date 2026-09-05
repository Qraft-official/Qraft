import { clip, userFromRequest } from "@/lib/api-auth";
import { recordInviteOpen, recordXCampaignTap } from "@/lib/campaign-server";
import { getReferralMe } from "@/lib/referral-server";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    type?: string;
    code?: string;
    deviceId?: string;
  };
  const type = body.type;
  const deviceId = clip(body.deviceId, 128);
  const user = await userFromRequest(request);

  if (type === "invite_open") {
    const result = await recordInviteOpen({
      code: clip(body.code, 40),
      deviceId,
      userId: user?.id,
    });
    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    const me = user ? await getReferralMe(user.id) : null;
    return NextResponse.json(me ?? { ok: true });
  }

  if (type !== "x_follow" && type !== "x_post") {
    return NextResponse.json({ error: "不正なイベントです。" }, { status: 400 });
  }
  if (!user) {
    return NextResponse.json({ error: "ログインしてください。" }, { status: 401 });
  }
  const { requireAppAccess } = await import("@/lib/release-server");
  const gate = await requireAppAccess(request);
  if (gate.error) return NextResponse.json({ error: gate.error }, { status: 403 });
  const result = await recordXCampaignTap(user.id, type, deviceId);
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  const me = await getReferralMe(user.id);
  return NextResponse.json(me ?? {});
}
