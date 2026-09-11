import { requireAdminUser } from "@/lib/admin-guard";
import { asDifficulty } from "@/lib/difficulty";
import { asSubject } from "@/lib/problems";
import { parseAcceptedAnswers, asSprintAnswerType, type SprintAnswerType } from "@/lib/sprint-grade";
import { rpcErrorMessage, userSupabaseFromRequest } from "@/lib/user-supabase";
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
  author_id?: string;
};

type SecretRow = {
  problem_id: string;
  correct_answer: string | null;
  explanation: string | null;
  hint: string | null;
  answer_type?: string | null;
  accepted_answers?: unknown;
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
    answerType: asSprintAnswerType(secret?.answer_type),
    acceptedAnswers: parseAcceptedAnswers(secret?.accepted_answers),
  };
}

function previewPost(row: SprintRow, item: ReturnType<typeof mapItem>) {
  return {
    id: item.id,
    authorId: row.author_id ?? "",
    kind: "sprint" as const,
    subject: item.subject,
    title: item.title,
    text: item.topic ? `${item.topic}\n\n${item.text}` : item.text,
    createdAt: item.publishAt || row.created_at,
    replyCount: 0,
    repostCount: 0,
    likeCount: 0,
    ahaSum: 0,
    ahaCount: 0,
    eleganceSum: 0,
    eleganceCount: 0,
    sprintDay: item.sprintDay ?? undefined,
    isSprint: true,
    problemMode: "aha" as const,
    difficultyLevel: item.difficultyLevel,
    publishAt: item.publishAt ?? undefined,
    topic: item.topic || undefined,
  };
}

async function loadSecretMap(
  sb: NonNullable<ReturnType<typeof userSupabaseFromRequest>>,
): Promise<Record<string, SecretRow>> {
  const { data, error } = await sb.rpc("admin_sprint_secrets");
  if (error) throw new Error(rpcErrorMessage(error.message));
  const rows = Array.isArray(data) ? (data as SecretRow[]) : [];
  const map: Record<string, SecretRow> = {};
  for (const row of rows) map[row.problem_id] = row;
  return map;
}

export async function GET(request: Request) {
  const gate = await requireAdminUser(request);
  if ("error" in gate) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }
  const sb = userSupabaseFromRequest(request);
  if (!sb) {
    return NextResponse.json({ error: "サーバー設定が不足しています" }, { status: 500 });
  }

  let secrets: Record<string, SecretRow>;
  try {
    secrets = await loadSecretMap(sb);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "読み込みに失敗しました" }, { status: 403 });
  }

  const previewId = new URL(request.url).searchParams.get("preview");
  const { data, error } = await sb
    .from("problems")
    .select(
      "id, title, problem_text, subject, topic, difficulty_level, sprint_day, publish_at, is_sprint, mode, created_at, author_id",
    )
    .eq("is_sprint", true)
    .order("sprint_day", { ascending: false });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  const rows = (data ?? []) as SprintRow[];
  if (previewId) {
    const row = rows.find((r) => r.id === previewId);
    if (!row) return NextResponse.json({ error: "予約が見つかりません" }, { status: 404 });
    const item = mapItem(row, secrets[row.id]);
    return NextResponse.json({ preview: true, item, post: previewPost(row, item) });
  }
  return NextResponse.json({ items: rows.map((row) => mapItem(row, secrets[row.id])) });
}

async function upsert(request: Request, editingId: string | null) {
  const gate = await requireAdminUser(request);
  if ("error" in gate) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }
  const sb = userSupabaseFromRequest(request);
  if (!sb) {
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
  const answerType: SprintAnswerType = asSprintAnswerType(body.answerType);
  const acceptedAnswers = parseAcceptedAnswers(body.acceptedAnswers);

  if (!sprintDay) {
    return NextResponse.json({ error: "公開日を YYYY-MM-DD で指定してください" }, { status: 400 });
  }
  if (!title || !text) {
    return NextResponse.json({ error: "タイトルと問題文は必須です" }, { status: 400 });
  }
  if (!correctAnswer) {
    return NextResponse.json({ error: "正解は必須です" }, { status: 400 });
  }

  const { data, error } = await sb.rpc("admin_upsert_sprint_problem", {
    p_sprint_day: sprintDay,
    p_title: title,
    p_problem_text: text,
    p_subject: subject,
    p_topic: topic,
    p_difficulty: difficultyLevel,
    p_correct_answer: correctAnswer,
    p_hint: hint || null,
    p_explanation: explanation || null,
    p_answer_type: answerType,
    p_accepted_answers: acceptedAnswers,
    p_id: editingId,
  });
  if (error) {
    return NextResponse.json({ error: rpcErrorMessage(error.message) }, { status: 400 });
  }
  return NextResponse.json(data ?? { ok: true });
}

export async function POST(request: Request) {
  return upsert(request, null);
}

export async function PATCH(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.clone().json();
  } catch {
    return NextResponse.json({ error: "不正なリクエストです" }, { status: 400 });
  }
  const id = clip(body.id, 80);
  if (!id) return NextResponse.json({ error: "IDがありません" }, { status: 400 });
  return upsert(request, id);
}

export async function DELETE(request: Request) {
  const gate = await requireAdminUser(request);
  if ("error" in gate) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }
  const sb = userSupabaseFromRequest(request);
  if (!sb) {
    return NextResponse.json({ error: "サーバー設定が不足しています" }, { status: 500 });
  }
  const id = new URL(request.url).searchParams.get("id") ?? "";
  if (!id) return NextResponse.json({ error: "IDがありません" }, { status: 400 });
  const { error } = await sb.rpc("admin_delete_sprint_problem", { p_id: id });
  if (error) {
    return NextResponse.json({ error: rpcErrorMessage(error.message) }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
