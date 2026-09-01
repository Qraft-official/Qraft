import { userFromRequest, clip } from "@/lib/api-auth";
import { adminSupabase } from "@/lib/admin-supabase";
import { answersMatch, asProblemMode } from "@/lib/challenge";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const user = await userFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "ログインしてください" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "不正なリクエストです" }, { status: 400 });
  }

  const problemId = clip(body.problemId, 80);
  const answer = clip(body.answer, 500);
  if (!problemId) {
    return NextResponse.json({ error: "問題が指定されていません" }, { status: 400 });
  }
  if (!answer.trim()) {
    return NextResponse.json({ error: "答えを入力してください" }, { status: 400 });
  }

  const admin = adminSupabase();
  if (!admin) {
    return NextResponse.json({ error: "採点サーバーを利用できません" }, { status: 500 });
  }

  const { data, error } = await admin
    .from("problems")
    .select("mode, correct_answer")
    .eq("id", problemId)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "問題が見つかりません" }, { status: 404 });
  }
  if (asProblemMode(data.mode) !== "challenge") {
    return NextResponse.json({ graded: false, correct: null });
  }

  return NextResponse.json({
    graded: true,
    correct: answersMatch(data.correct_answer, answer),
  });
}
