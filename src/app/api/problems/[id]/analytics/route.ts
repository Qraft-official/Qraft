import { userFromRequest } from "@/lib/api-auth";
import { adminSupabase } from "@/lib/admin-supabase";
import { resolvePremiumForRequest } from "@/lib/premium-server";
import { isProblemUuid } from "@/lib/difficulty";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const user = await userFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "ログインしてください" }, { status: 401 });
  }
  const { payload, userId } = await resolvePremiumForRequest(request);
  if (!payload.premium || !userId) {
    return NextResponse.json({ error: "Premium 限定です" }, { status: 403 });
  }

  const { id } = await context.params;
  if (!isProblemUuid(id)) {
    return NextResponse.json({ error: "問題が見つかりません" }, { status: 404 });
  }

  const admin = adminSupabase();
  if (!admin) {
    return NextResponse.json({ error: "分析サーバーを利用できません" }, { status: 500 });
  }

  const { data, error } = await admin.rpc("problem_analytics_detail", {
    p_id: id,
    p_viewer: userId,
  });
  if (error) {
    const msg = error.message || "";
    if (/NOT_FOUND/i.test(msg)) {
      return NextResponse.json({ error: "問題が見つかりません" }, { status: 404 });
    }
    if (/NOT_REGULAR/i.test(msg)) {
      return NextResponse.json({ error: "通常問題のみ分析できます" }, { status: 400 });
    }
    if (/NOT_AUTH/i.test(msg)) {
      return NextResponse.json({ error: "ログインしてください" }, { status: 401 });
    }
    return NextResponse.json({ error: "分析を取得できません" }, { status: 500 });
  }
  return NextResponse.json({ analytics: data });
}
