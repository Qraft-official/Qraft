import { clip, requireAdminFromRequest } from "@/lib/api-auth";
import { adminSupabase } from "@/lib/admin-supabase";
import { asDifficulty } from "@/lib/difficulty";
import { isJstDate } from "@/lib/sprint-schedule";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

function asSubject(value: string) {
  return value === "physics" || value === "chemistry" ? value : "math";
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdminFromRequest(request);
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const admin = adminSupabase();
  if (!admin) return NextResponse.json({ error: "管理サーバーを利用できません" }, { status: 500 });
  const { id } = await context.params;

  const { data: existing, error: loadError } = await admin
    .from("problems")
    .select("id, is_sprint, publish_at")
    .eq("id", id)
    .maybeSingle();
  if (loadError) return NextResponse.json({ error: loadError.message }, { status: 500 });
  if (!existing || !(existing as { is_sprint?: boolean }).is_sprint) {
    return NextResponse.json({ error: "予約が見つかりません" }, { status: 404 });
  }
  const publishAt = new Date(String((existing as { publish_at: string }).publish_at)).getTime();
  if (Date.now() >= publishAt) {
    return NextResponse.json({ error: "公開後の問題は編集できません" }, { status: 400 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "不正なリクエストです" }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};
  if (typeof body.title === "string") updates.title = clip(body.title, 200);
  if (typeof body.text === "string") updates.problem_text = clip(body.text, 20000);
  if (typeof body.subject === "string") updates.subject = asSubject(clip(body.subject, 40));
  if (typeof body.topic === "string") updates.topic = clip(body.topic, 80) || null;
  if (body.difficultyLevel != null) updates.difficulty_level = asDifficulty(body.difficultyLevel);
  if (typeof body.sprintDay === "string") {
    if (!isJstDate(body.sprintDay)) {
      return NextResponse.json({ error: "公開日は YYYY-MM-DD（JST）で指定してください" }, { status: 400 });
    }
    updates.sprint_day = body.sprintDay;
  }

  if (Object.keys(updates).length) {
    const { error } = await admin.from("problems").update(updates).eq("id", id);
    if (error) {
      if (/problems_sprint_day_unique|duplicate key|23505/i.test(error.message)) {
        return NextResponse.json({ error: "その日の21時問題はすでに予約されています" }, { status: 409 });
      }
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
  }

  const secretPatch: Record<string, unknown> = { problem_id: id, updated_at: new Date().toISOString() };
  if (typeof body.correctAnswer === "string") secretPatch.correct_answer = clip(body.correctAnswer, 2000) || null;
  if (typeof body.explanation === "string") secretPatch.explanation = clip(body.explanation, 20000) || null;
  if (typeof body.hint === "string") secretPatch.hint = clip(body.hint, 4000) || null;
  if (Object.keys(secretPatch).length > 2) {
    const { error } = await admin.from("sprint_secrets").upsert(secretPatch);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdminFromRequest(request);
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const admin = adminSupabase();
  if (!admin) return NextResponse.json({ error: "管理サーバーを利用できません" }, { status: 500 });
  const { id } = await context.params;

  const { data: existing } = await admin
    .from("problems")
    .select("id, is_sprint, publish_at")
    .eq("id", id)
    .maybeSingle();
  if (!existing || !(existing as { is_sprint?: boolean }).is_sprint) {
    return NextResponse.json({ error: "予約が見つかりません" }, { status: 404 });
  }
  const publishAt = new Date(String((existing as { publish_at: string }).publish_at)).getTime();
  if (Date.now() >= publishAt) {
    return NextResponse.json({ error: "公開後の問題は削除できません" }, { status: 400 });
  }

  const { error } = await admin.from("problems").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
