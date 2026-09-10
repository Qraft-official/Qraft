import { clip, requireAdminFromRequest } from "@/lib/api-auth";
import { adminSupabase } from "@/lib/admin-supabase";
import { asDifficulty } from "@/lib/difficulty";
import { isJstDate } from "@/lib/sprint-schedule";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

function asSubject(value: string) {
  return value === "physics" || value === "chemistry" ? value : "math";
}

export async function GET(request: Request) {
  const auth = await requireAdminFromRequest(request);
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const admin = adminSupabase();
  if (!admin) return NextResponse.json({ error: "管理サーバーを利用できません" }, { status: 500 });

  const { data: rows, error } = await admin
    .from("problems")
    .select("id, title, problem_text, subject, topic, difficulty_level, sprint_day, publish_at, created_at")
    .eq("is_sprint", true)
    .order("sprint_day", { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const ids = (rows ?? []).map((r) => String((r as { id: string }).id));
  const secretsById: Record<string, { correct_answer?: string | null; explanation?: string | null; hint?: string | null }> = {};
  if (ids.length) {
    const { data: secrets } = await admin
      .from("sprint_secrets")
      .select("problem_id, correct_answer, explanation, hint")
      .in("problem_id", ids);
    for (const s of secrets ?? []) {
      const row = s as {
        problem_id: string;
        correct_answer?: string | null;
        explanation?: string | null;
        hint?: string | null;
      };
      secretsById[row.problem_id] = row;
    }
  }

  const items = (rows ?? []).map((raw) => {
    const r = raw as {
      id: string;
      title: string;
      problem_text: string;
      subject: string;
      topic?: string | null;
      difficulty_level?: number | null;
      sprint_day: string;
      publish_at: string;
    };
    const sec = secretsById[r.id] ?? {};
    return {
      id: r.id,
      sprintDay: r.sprint_day,
      publishAt: r.publish_at,
      title: r.title,
      text: r.problem_text,
      subject: r.subject,
      topic: r.topic ?? "",
      difficultyLevel: asDifficulty(r.difficulty_level),
      correctAnswer: sec.correct_answer ?? "",
      explanation: sec.explanation ?? "",
      hint: sec.hint ?? "",
    };
  });

  return NextResponse.json({ items });
}

export async function POST(request: Request) {
  const auth = await requireAdminFromRequest(request);
  if (auth.error || !auth.user) {
    return NextResponse.json({ error: auth.error || "ログインしてください" }, { status: auth.status });
  }
  const admin = adminSupabase();
  if (!admin) return NextResponse.json({ error: "管理サーバーを利用できません" }, { status: 500 });

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "不正なリクエストです" }, { status: 400 });
  }

  const sprintDay = clip(body.sprintDay, 16);
  const text = clip(body.text, 20000);
  if (!isJstDate(sprintDay)) {
    return NextResponse.json({ error: "公開日は YYYY-MM-DD（JST）で指定してください" }, { status: 400 });
  }
  if (!text.trim()) {
    return NextResponse.json({ error: "問題文を入力してください" }, { status: 400 });
  }

  const { data, error } = await admin
    .from("problems")
    .insert({
      author_id: auth.user.id,
      title: clip(body.title, 200),
      problem_text: text,
      subject: asSubject(clip(body.subject, 40)),
      topic: clip(body.topic, 80) || null,
      difficulty_level: asDifficulty(body.difficultyLevel),
      is_sprint: true,
      sprint_day: sprintDay,
      mode: "aha",
      solution: null,
      correct_answer: null,
    })
    .select("id, sprint_day, publish_at")
    .single();

  if (error) {
    if (/problems_sprint_day_unique|duplicate key|23505/i.test(error.message)) {
      return NextResponse.json({ error: "その日の21時問題はすでに予約されています" }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const id = String((data as { id: string }).id);
  const { error: secretError } = await admin.from("sprint_secrets").upsert({
    problem_id: id,
    correct_answer: clip(body.correctAnswer, 2000) || null,
    explanation: clip(body.explanation, 20000) || null,
    hint: clip(body.hint, 4000) || null,
    updated_at: new Date().toISOString(),
  });
  if (secretError) {
    await admin.from("problems").delete().eq("id", id);
    return NextResponse.json({ error: secretError.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, id, sprintDay: (data as { sprint_day: string }).sprint_day });
}
