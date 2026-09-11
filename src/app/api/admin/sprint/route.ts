import { adminSupabase } from "@/lib/admin-supabase";
import { requireAdminUser } from "@/lib/admin-guard";
import { asDifficulty } from "@/lib/difficulty";
import { asSubject } from "@/lib/problems";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type SprintRow = {
  id: string;
  title: string | null;
  problem_text: string | null;
  subject: string | null;
  topic: string | null;
  difficulty_level: number | null;
  sprint_day: string | null;
  publish_at: string | null;
  is_sprint: boolean;
  mode: string | null;
  created_at: string;
};

type SecretRow = {
  problem_id: string;
  correct_answer: string | null;
  explanation: string | null;
  hint: string | null;
};

function asDay(value: unknown): string | null {
  const raw = String(value ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null;
  return raw;
}

function isFuture(publishAt: string | null, now = Date.now()) {
  if (!publishAt) return false;
  const t = Date.parse(publishAt);
  return Number.isFinite(t) && t > now;
}

function clip(value: unknown, max: number) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, max);
}

function mapItem(row: SprintRow, secret?: SecretRow | null) {
  const publishAt = row.publish_at;
  const future = isFuture(publishAt);
  return {
    id: row.id,
    title: row.title ?? "",
    text: row.problem_text ?? "",
    subject: asSubject(row.subject ?? "math"),
    topic: row.topic ?? "",
    difficultyLevel: asDifficulty(row.difficulty_level),
    sprintDay: row.sprint_day,
    publishAt,
    mode: row.mode === "aha" ? "aha" : row.mode,
    status: future ? "予約済み" : "公開済み",
    editable: future,
    correctAnswer: secret?.correct_answer ?? "",
    hint: secret?.hint ?? "",
    explanation: secret?.explanation ?? "",
  };
}

async function loadSecrets(
  admin: NonNullable<ReturnType<typeof adminSupabase>>,
  ids: string[],
) {
  const map: Record<string, SecretRow> = {};
  if (!ids.length) return map;
  const { data } = await admin.from("sprint_secrets").select("*").in("problem_id", ids);
  for (const row of (data ?? []) as SecretRow[]) {
    map[row.problem_id] = row;
  }
  return map;
}

export async function GET(request: Request) {
  const gate = await requireAdminUser(request);
  if ("error" in gate) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }
  const admin = adminSupabase();
  if (!admin) {
    return NextResponse.json({ error: "サーバー設定が不足しています" }, { status: 500 });
  }

  const previewId = new URL(request.url).searchParams.get("preview");
  if (previewId) {
    const { data, error } = await admin
      .from("problems")
      .select(
        "id, title, problem_text, subject, topic, difficulty_level, sprint_day, publish_at, is_sprint, mode, created_at, author_id",
      )
      .eq("id", previewId)
      .eq("is_sprint", true)
      .maybeSingle();
    if (error || !data) {
      return NextResponse.json({ error: "予約が見つかりません" }, { status: 404 });
    }
    const secrets = await loadSecrets(admin, [data.id]);
    const item = mapItem(data as SprintRow, secrets[data.id]);
    return NextResponse.json({
      preview: true,
      item,
      post: {
        id: item.id,
        authorId: (data as { author_id: string }).author_id,
        kind: "sprint",
        subject: item.subject,
        title: item.title,
        text: item.topic ? `${item.topic}\n\n${item.text}` : item.text,
        createdAt: item.publishAt || (data as SprintRow).created_at,
        replyCount: 0,
        repostCount: 0,
        likeCount: 0,
        ahaSum: 0,
        ahaCount: 0,
        eleganceSum: 0,
        eleganceCount: 0,
        sprintDay: item.sprintDay ?? undefined,
        isSprint: true,
        problemMode: "aha",
        difficultyLevel: item.difficultyLevel,
        publishAt: item.publishAt ?? undefined,
        topic: item.topic || undefined,
        correctAnswer: undefined,
        hints: [],
        solution: undefined,
      },
    });
  }

  const { data, error } = await admin
    .from("problems")
    .select(
      "id, title, problem_text, subject, topic, difficulty_level, sprint_day, publish_at, is_sprint, mode, created_at",
    )
    .eq("is_sprint", true)
    .order("sprint_day", { ascending: false });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  const rows = (data ?? []) as SprintRow[];
  const secrets = await loadSecrets(
    admin,
    rows.map((r) => r.id),
  );
  return NextResponse.json({ items: rows.map((row) => mapItem(row, secrets[row.id])) });
}

export async function POST(request: Request) {
  const gate = await requireAdminUser(request);
  if ("error" in gate) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }
  const admin = adminSupabase();
  if (!admin) {
    return NextResponse.json({ error: "サーバー設定が不足しています" }, { status: 500 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "不正なリクエストです" }, { status: 400 });
  }

  const sprintDay = asDay(body.sprintDay);
  const title = clip(body.title, 200);
  const text = clip(body.text, 20000);
  const topic = clip(body.topic, 80);
  const subject = asSubject(String(body.subject ?? "math"));
  const difficultyLevel = asDifficulty(body.difficultyLevel);
  const correctAnswer = clip(body.correctAnswer, 500);
  const hint = clip(body.hint, 500);
  const explanation = clip(body.explanation, 8000);

  if (!sprintDay) {
    return NextResponse.json({ error: "公開日を YYYY-MM-DD で指定してください" }, { status: 400 });
  }
  if (!title || !text) {
    return NextResponse.json({ error: "タイトルと問題文は必須です" }, { status: 400 });
  }
  if (!correctAnswer) {
    return NextResponse.json({ error: "正解は必須です" }, { status: 400 });
  }

  const row = {
    author_id: gate.user.id,
    title,
    problem_text: text,
    subject,
    topic: topic || null,
    difficulty_level: difficultyLevel,
    is_sprint: true,
    sprint_day: sprintDay,
    mode: "aha",
    solution: null,
    correct_answer: null,
    hints: [],
  };

  const { data, error } = await admin.from("problems").insert(row).select("id, sprint_day, publish_at").single();
  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "その日の21時問題はすでに予約されています" }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const { error: secretError } = await admin.from("sprint_secrets").upsert({
    problem_id: data.id,
    correct_answer: correctAnswer,
    hint: hint || null,
    explanation: explanation || null,
    updated_at: new Date().toISOString(),
  });
  if (secretError) {
    await admin.from("problems").delete().eq("id", data.id);
    return NextResponse.json({ error: secretError.message }, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    id: data.id,
    sprintDay: data.sprint_day,
    publishAt: data.publish_at,
  });
}

export async function PATCH(request: Request) {
  const gate = await requireAdminUser(request);
  if ("error" in gate) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }
  const admin = adminSupabase();
  if (!admin) {
    return NextResponse.json({ error: "サーバー設定が不足しています" }, { status: 500 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "不正なリクエストです" }, { status: 400 });
  }

  const id = clip(body.id, 80);
  if (!id) return NextResponse.json({ error: "IDがありません" }, { status: 400 });

  const { data: existing, error: readError } = await admin
    .from("problems")
    .select("id, publish_at, is_sprint")
    .eq("id", id)
    .eq("is_sprint", true)
    .maybeSingle();
  if (readError || !existing) {
    return NextResponse.json({ error: "予約が見つかりません" }, { status: 404 });
  }
  if (!isFuture((existing as { publish_at: string | null }).publish_at)) {
    return NextResponse.json({ error: "公開済みの21時問題は編集できません" }, { status: 400 });
  }

  const sprintDay = body.sprintDay !== undefined ? asDay(body.sprintDay) : undefined;
  if (body.sprintDay !== undefined && !sprintDay) {
    return NextResponse.json({ error: "公開日を YYYY-MM-DD で指定してください" }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};
  if (typeof body.title === "string") updates.title = clip(body.title, 200);
  if (typeof body.text === "string") updates.problem_text = clip(body.text, 20000);
  if (typeof body.topic === "string") updates.topic = clip(body.topic, 80) || null;
  if (body.subject !== undefined) updates.subject = asSubject(String(body.subject));
  if (body.difficultyLevel !== undefined) updates.difficulty_level = asDifficulty(body.difficultyLevel);
  if (sprintDay) updates.sprint_day = sprintDay;

  if (Object.keys(updates).length) {
    const { error } = await admin.from("problems").update(updates).eq("id", id);
    if (error) {
      if (error.code === "23505") {
        return NextResponse.json({ error: "その日の21時問題はすでに予約されています" }, { status: 409 });
      }
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
  }

  const secretPatch: Record<string, unknown> = { problem_id: id, updated_at: new Date().toISOString() };
  let touchSecret = false;
  if (typeof body.correctAnswer === "string") {
    const ans = clip(body.correctAnswer, 500);
    if (!ans) return NextResponse.json({ error: "正解は必須です" }, { status: 400 });
    secretPatch.correct_answer = ans;
    touchSecret = true;
  }
  if (typeof body.hint === "string") {
    secretPatch.hint = clip(body.hint, 500) || null;
    touchSecret = true;
  }
  if (typeof body.explanation === "string") {
    secretPatch.explanation = clip(body.explanation, 8000) || null;
    touchSecret = true;
  }
  if (touchSecret) {
    const { error } = await admin.from("sprint_secrets").upsert(secretPatch);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, id });
}

export async function DELETE(request: Request) {
  const gate = await requireAdminUser(request);
  if ("error" in gate) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }
  const admin = adminSupabase();
  if (!admin) {
    return NextResponse.json({ error: "サーバー設定が不足しています" }, { status: 500 });
  }
  const id = new URL(request.url).searchParams.get("id") ?? "";
  if (!id) return NextResponse.json({ error: "IDがありません" }, { status: 400 });

  const { data: existing } = await admin
    .from("problems")
    .select("id, publish_at, is_sprint")
    .eq("id", id)
    .eq("is_sprint", true)
    .maybeSingle();
  if (!existing) {
    return NextResponse.json({ error: "予約が見つかりません" }, { status: 404 });
  }
  if (!isFuture((existing as { publish_at: string | null }).publish_at)) {
    return NextResponse.json({ error: "公開済みの21時問題は削除できません" }, { status: 400 });
  }
  const { error } = await admin.from("problems").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
