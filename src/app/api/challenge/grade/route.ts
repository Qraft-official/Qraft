import { userFromRequest, clip } from "@/lib/api-auth";
import { adminSupabase } from "@/lib/admin-supabase";
import { gradeProblemAnswerRecord, type ProblemGradeRecord } from "@/lib/problem-grading";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type GradeRow = ProblemGradeRecord & {
  publish_at: string | null;
  is_sprint: boolean | null;
};

function gradePayload(data: GradeRow, answer: string) {
  const opens = data.publish_at ? Date.parse(String(data.publish_at)) : NaN;
  if (Number.isFinite(opens) && Date.now() < opens) {
    return NextResponse.json({ error: "問題が見つかりません" }, { status: 404 });
  }
  if (data.is_sprint) {
    return NextResponse.json({ graded: false, correct: null });
  }
  return NextResponse.json(gradeProblemAnswerRecord(data, answer));
}

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

  const primary = await admin
    .from("problems")
    .select("mode, correct_answer, accepted_answers, answer_unit, answer_type, answer_options, publish_at, is_sprint")
    .eq("id", problemId)
    .maybeSingle();

  if (primary.error && /answer_unit/i.test(primary.error.message)) {
    const fallback = await admin
      .from("problems")
      .select("mode, correct_answer, publish_at, is_sprint")
      .eq("id", problemId)
      .maybeSingle();
    if (fallback.error) {
      return NextResponse.json({ error: fallback.error.message }, { status: 500 });
    }
    if (!fallback.data) {
      return NextResponse.json({ error: "問題が見つかりません" }, { status: 404 });
    }
    return gradePayload(fallback.data as GradeRow, answer);
  }

  if (primary.error) {
    return NextResponse.json({ error: primary.error.message }, { status: 500 });
  }
  if (!primary.data) {
    return NextResponse.json({ error: "問題が見つかりません" }, { status: 404 });
  }
  return gradePayload(primary.data as GradeRow, answer);
}
