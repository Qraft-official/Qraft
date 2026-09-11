import { userFromRequest, clip } from "@/lib/api-auth";
import { adminSupabase } from "@/lib/admin-supabase";
import { asSprintAnswerType, gradeSprintAnswer, parseAcceptedAnswers } from "@/lib/sprint-grade";
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
  if (!problemId) return NextResponse.json({ error: "問題が指定されていません" }, { status: 400 });
  if (!answer.trim()) return NextResponse.json({ error: "答えを入力してください" }, { status: 400 });

  const admin = adminSupabase();
  if (!admin) {
    return NextResponse.json({ error: "採点サーバーを利用できません" }, { status: 500 });
  }

  const { data: problem, error: problemError } = await admin
    .from("problems")
    .select("id, is_sprint, publish_at")
    .eq("id", problemId)
    .maybeSingle();
  if (problemError) return NextResponse.json({ error: problemError.message }, { status: 500 });
  if (!problem?.is_sprint) {
    return NextResponse.json({ error: "21時問題ではありません" }, { status: 404 });
  }
  const opens = problem.publish_at ? Date.parse(String(problem.publish_at)) : NaN;
  if (!Number.isFinite(opens) || Date.now() < opens) {
    return NextResponse.json({ error: "公開前の問題は採点できません" }, { status: 403 });
  }

  const { data: secret, error: secretError } = await admin
    .from("sprint_secrets")
    .select("correct_answer, accepted_answers, answer_type")
    .eq("problem_id", problemId)
    .maybeSingle();
  if (secretError) return NextResponse.json({ error: secretError.message }, { status: 500 });
  if (!secret?.correct_answer) {
    return NextResponse.json({ error: "正解が設定されていません" }, { status: 400 });
  }

  const grade = gradeSprintAnswer({
    given: answer,
    canonical: String(secret.correct_answer),
    accepted: parseAcceptedAnswers(secret.accepted_answers),
    answerType: asSprintAnswerType(secret.answer_type),
  });

  await admin.from("sprint_attempts").upsert({
    user_id: user.id,
    problem_id: problemId,
    solver_answer: answer,
    grade,
    submitted_at: new Date().toISOString(),
  });

  return NextResponse.json({ grade });
}
