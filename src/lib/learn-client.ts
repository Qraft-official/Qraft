import { isProblemUuid } from "./difficulty";
import {
  asFeltVote,
  asSaveCategory,
  sanitizeHints,
  type AttemptGrade,
  type AttemptSummary,
  type FeltVote,
  type HistoryAttempt,
  type LearningBootstrap,
  type LearningCardState,
  type ProblemSeries,
  type ProblemSpoiler,
  type RevengeItem,
  type SaveCategory,
} from "./learn";
import { supabase } from "./supabase";

function asGrade(value: unknown): AttemptGrade | null {
  if (value === "correct" || value === "incorrect" || value === "ungraded") return value;
  return null;
}

export async function fetchLearningCardState(
  ids: string[],
): Promise<LearningCardState | null> {
  const uuids = ids.filter(isProblemUuid);
  const empty: LearningCardState = { saved: {}, votes: {}, attempts: {} };
  if (!uuids.length) return empty;
  const { data, error } = await supabase.rpc("learning_card_state", { p_ids: uuids });
  if (error) {
    console.warn("learning_card_state:", error.message);
    return null;
  }
  const raw = (data ?? {}) as Record<string, unknown>;
  const savedRaw = (raw.saved ?? {}) as Record<string, unknown>;
  const votesRaw = (raw.votes ?? {}) as Record<string, unknown>;
  const attemptsRaw = (raw.attempts ?? {}) as Record<string, Record<string, unknown>>;
  const saved: Record<string, SaveCategory> = {};
  const votes: Record<string, FeltVote> = {};
  const attempts: Record<string, AttemptSummary> = {};
  for (const [id, cat] of Object.entries(savedRaw)) saved[id] = asSaveCategory(cat);
  for (const [id, vote] of Object.entries(votesRaw)) {
    const v = asFeltVote(vote);
    if (v) votes[id] = v;
  }
  for (const [id, a] of Object.entries(attemptsRaw)) {
    attempts[id] = {
      grade: asGrade(a.grade),
      durationSeconds: typeof a.durationSeconds === "number" ? a.durationSeconds : null,
      submittedAt: typeof a.submittedAt === "string" ? a.submittedAt : null,
      isRevenge: !!a.isRevenge,
      revengeAvailableAt: typeof a.revengeAvailableAt === "string" ? a.revengeAvailableAt : null,
      revengeCompletedAt: typeof a.revengeCompletedAt === "string" ? a.revengeCompletedAt : null,
      eligibleForMetrics: typeof a.eligibleForMetrics === "boolean" ? a.eligibleForMetrics : null,
    };
  }
  return { saved, votes, attempts };
}

export async function fetchLearningBootstrap(): Promise<LearningBootstrap> {
  const empty: LearningBootstrap = {
    notifyAuthors: [],
    revenge: [],
    calendarDays: [],
    currentStreak: 0,
    longestStreak: 0,
  };
  const { data, error } = await supabase.rpc("learning_bootstrap");
  if (error) {
    console.warn("learning_bootstrap:", error.message);
    return empty;
  }
  const raw = (data ?? {}) as Record<string, unknown>;
  const revenge = Array.isArray(raw.revenge)
    ? (raw.revenge as RevengeItem[]).filter((r) => r && typeof r.problemId === "string")
    : [];
  return {
    notifyAuthors: Array.isArray(raw.notifyAuthors)
      ? (raw.notifyAuthors as unknown[]).map(String)
      : [],
    revenge,
    calendarDays: Array.isArray(raw.calendarDays) ? (raw.calendarDays as unknown[]).map(String) : [],
    currentStreak: Number(raw.currentStreak) || 0,
    longestStreak: Number(raw.longestStreak) || 0,
  };
}

export async function promptDueRevenge() {
  const { error } = await supabase.rpc("prompt_due_revenge");
  if (error) console.warn("prompt_due_revenge:", error.message);
}

export async function toggleSavedProblem(
  problemId: string,
  wantSaved: boolean,
  category: SaveCategory = "later",
): Promise<{ error?: string; saved?: boolean; category?: SaveCategory | null }> {
  if (!isProblemUuid(problemId)) return { error: "この問題は保存できません" };
  const { data, error } = await supabase.rpc("toggle_saved_problem", {
    p_problem_id: problemId,
    p_want_saved: wantSaved,
    p_category: category,
  });
  if (error) {
    console.error("toggle_saved_problem:", error.message, error);
    return fallbackToggleSaved(problemId, wantSaved, category);
  }
  const raw = (data ?? {}) as {
    ok?: boolean;
    saved?: boolean;
    error?: string;
    category?: string | null;
  };
  if (!raw.ok) {
    console.error("toggle_saved_problem:", raw.error ?? raw);
    if (raw.error === "not_authenticated" || raw.error === "invalid_problem") {
      return { error: raw.error || "保存に失敗しました" };
    }
    return fallbackToggleSaved(problemId, wantSaved, category);
  }
  return {
    saved: !!raw.saved,
    category: raw.saved ? asSaveCategory(raw.category) : null,
  };
}

async function fallbackToggleSaved(
  problemId: string,
  wantSaved: boolean,
  category: SaveCategory,
): Promise<{ error?: string; saved?: boolean; category?: SaveCategory | null }> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const uid = session?.user?.id;
  if (!uid) return { error: "ログインしてください" };
  if (!wantSaved) {
    const { error } = await supabase
      .from("saved_problems")
      .delete()
      .eq("user_id", uid)
      .eq("problem_id", problemId);
    if (error) {
      console.error("saved_problems delete:", error.message, error);
      return { error: error.message };
    }
    return { saved: false, category: null };
  }
  const { error } = await supabase.from("saved_problems").upsert(
    { user_id: uid, problem_id: problemId, category },
    { onConflict: "user_id,problem_id" },
  );
  if (error) {
    console.error("saved_problems upsert:", error.message, error);
    return { error: error.message };
  }
  const { data: row, error: selErr } = await supabase
    .from("saved_problems")
    .select("problem_id, category")
    .eq("user_id", uid)
    .eq("problem_id", problemId)
    .maybeSingle();
  if (selErr) {
    console.error("saved_problems verify select:", selErr.message, selErr);
  }
  if (row) {
    return { saved: true, category: asSaveCategory((row as { category: string }).category) };
  }
  // Write reported success; keep saved even if replica/select lags.
  return { saved: true, category };
}

export async function setSavedCategory(problemId: string, category: SaveCategory) {
  if (!isProblemUuid(problemId)) return { error: "この問題は保存できません" };
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const uid = session?.user?.id;
  if (!uid) return { error: "ログインしてください" };
  const { error } = await supabase.from("saved_problems").upsert(
    {
      user_id: uid,
      problem_id: problemId,
      category,
    },
    { onConflict: "user_id,problem_id" },
  );
  return { error: error?.message };
}

export async function fetchMySavedRows() {
  const { data, error } = await supabase
    .from("saved_problems")
    .select("problem_id, category, created_at")
    .order("created_at", { ascending: false });
  if (error) {
    console.warn("saved_problems:", error.message);
    return null;
  }
  return (data ?? []).map((r) => ({
    problemId: String((r as { problem_id: string }).problem_id).toLowerCase(),
    category: asSaveCategory((r as { category: string }).category),
    createdAt: String((r as { created_at: string }).created_at),
  }));
}

export async function fetchMySavedMap(): Promise<Record<string, SaveCategory> | null> {
  const rows = await fetchMySavedRows();
  if (!rows) return null;
  const map: Record<string, SaveCategory> = {};
  for (const row of rows) map[row.problemId] = row.category;
  return map;
}

export async function startProblemAttempt(problemId: string) {
  if (!isProblemUuid(problemId)) return { error: null as string | null, startedAt: new Date().toISOString() };
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const uid = session?.user?.id;
  if (!uid) return { error: "ログインしてください", startedAt: null as string | null };
  const { data: open } = await supabase
    .from("problem_attempts")
    .select("id, started_at")
    .eq("user_id", uid)
    .eq("problem_id", problemId)
    .is("submitted_at", null)
    .maybeSingle();
  if (open?.started_at) {
    return { error: null, startedAt: String(open.started_at) };
  }
  const { data: inserted, error } = await supabase
    .from("problem_attempts")
    .insert({
      user_id: uid,
      problem_id: problemId,
    })
    .select("started_at")
    .maybeSingle();
  if (error && !/duplicate|unique/i.test(error.message)) {
    return { error: error.message, startedAt: null };
  }
  return { error: null, startedAt: inserted?.started_at ? String(inserted.started_at) : new Date().toISOString() };
}

export async function submitProblemAttempt(input: {
  problemId: string;
  grade: AttemptGrade | null;
  solverAnswer?: string;
  startedAt?: string | null;
  isRevenge?: boolean;
}) {
  if (!isProblemUuid(input.problemId)) return { error: null as string | null };
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const uid = session?.user?.id;
  if (!uid) return { error: "ログインしてください" };

  const { data: open } = await supabase
    .from("problem_attempts")
    .select("id, started_at")
    .eq("user_id", uid)
    .eq("problem_id", input.problemId)
    .is("submitted_at", null)
    .maybeSingle();

  const payload = {
    submitted_at: new Date().toISOString(),
    grade: input.grade,
    solver_answer: input.solverAnswer?.trim() || null,
    is_revenge: !!input.isRevenge,
  };

  if (open?.id) {
    const { data, error } = await supabase
      .from("problem_attempts")
      .update(payload)
      .eq("id", open.id)
      .eq("user_id", uid)
      .select("eligible_for_metrics")
      .maybeSingle();
    return {
      error: error?.message ?? null,
      eligibleForMetrics: typeof data?.eligible_for_metrics === "boolean" ? data.eligible_for_metrics : null,
    };
  }

  if (!open && input.grade && input.grade !== "ungraded") {
    const { data, error } = await supabase
      .from("problem_attempts")
      .insert({
        user_id: uid,
        problem_id: input.problemId,
        ...payload,
      })
      .select("eligible_for_metrics")
      .maybeSingle();
    return {
      error: error?.message ?? null,
      eligibleForMetrics: typeof data?.eligible_for_metrics === "boolean" ? data.eligible_for_metrics : null,
    };
  }
  return { error: null, eligibleForMetrics: null as boolean | null };
}

export async function recordProblemSpoiler(problemId: string, kind: "answer" | "explanation") {
  if (!isProblemUuid(problemId)) return { error: "問題が指定されていません" as string | null, spoiler: null as ProblemSpoiler | null };
  const { data, error } = await supabase.rpc("record_problem_spoiler", {
    p_problem_id: problemId,
    p_kind: kind,
  });
  if (error) return { error: error.message, spoiler: null };
  const raw = (data ?? {}) as Record<string, unknown>;
  return {
    error: null as string | null,
    spoiler: {
      problemId: String(raw.problemId ?? problemId),
      answerRevealedAt: typeof raw.answerRevealedAt === "string" ? raw.answerRevealedAt : null,
      explanationRevealedAt: typeof raw.explanationRevealedAt === "string" ? raw.explanationRevealedAt : null,
    } satisfies ProblemSpoiler,
  };
}

export async function fetchMyProblemSpoilers(): Promise<Record<string, ProblemSpoiler>> {
  const { data, error } = await supabase
    .from("problem_spoilers")
    .select("problem_id, answer_revealed_at, explanation_revealed_at");
  if (error) {
    console.warn("problem_spoilers:", error.message);
    return {};
  }
  const out: Record<string, ProblemSpoiler> = {};
  for (const row of data ?? []) {
    const r = row as Record<string, unknown>;
    const id = String(r.problem_id);
    out[id] = {
      problemId: id,
      answerRevealedAt: typeof r.answer_revealed_at === "string" ? r.answer_revealed_at : null,
      explanationRevealedAt: typeof r.explanation_revealed_at === "string" ? r.explanation_revealed_at : null,
    };
  }
  return out;
}

export async function fetchMyAttempts(): Promise<HistoryAttempt[]> {
  const { data, error } = await supabase
    .from("problem_attempts")
    .select("id, problem_id, grade, duration_seconds, submitted_at, is_revenge")
    .not("submitted_at", "is", null)
    .order("submitted_at", { ascending: false })
    .limit(100);
  if (error) {
    console.warn("problem_attempts:", error.message);
    return [];
  }
  return (data ?? []).map((r) => {
    const row = r as Record<string, unknown>;
    return {
      id: String(row.id),
      problemId: String(row.problem_id),
      grade: asGrade(row.grade),
      durationSeconds: typeof row.duration_seconds === "number" ? row.duration_seconds : null,
      submittedAt: typeof row.submitted_at === "string" ? row.submitted_at : null,
      isRevenge: !!row.is_revenge,
    };
  });
}

export async function upsertFeltVote(problemId: string, vote: FeltVote) {
  if (!isProblemUuid(problemId)) return { error: "投票できません" };
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const uid = session?.user?.id;
  if (!uid) return { error: "ログインしてください" };
  const { error } = await supabase.from("difficulty_votes").upsert({
    user_id: uid,
    problem_id: problemId,
    vote,
    updated_at: new Date().toISOString(),
  });
  return { error: error?.message };
}

export async function toggleAuthorNotify(authorId: string, currentlyOn: boolean) {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const uid = session?.user?.id;
  if (!uid) return { error: "ログインしてください" };
  if (uid === authorId) return { error: "自分自身は通知できません" };
  if (currentlyOn) {
    const { error } = await supabase
      .from("user_post_notifications")
      .delete()
      .eq("subscriber_id", uid)
      .eq("author_id", authorId);
    return { error: error?.message };
  }
  const { error } = await supabase.from("user_post_notifications").insert({
    subscriber_id: uid,
    author_id: authorId,
  });
  return { error: error?.message };
}

export async function fetchMySeries(): Promise<ProblemSeries[]> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const uid = session?.user?.id;
  if (!uid) return [];
  const { data, error } = await supabase
    .from("problem_series")
    .select("id, owner_id, title, description, created_at")
    .eq("owner_id", uid)
    .order("created_at", { ascending: false });
  if (error) {
    console.warn("problem_series:", error.message);
    return [];
  }
  return (data ?? []).map((r) => {
    const row = r as Record<string, unknown>;
    return {
      id: String(row.id),
      ownerId: String(row.owner_id),
      title: String(row.title ?? ""),
      description: typeof row.description === "string" ? row.description : null,
      createdAt: String(row.created_at),
    };
  });
}

export async function fetchSeriesById(id: string): Promise<ProblemSeries | null> {
  if (!isProblemUuid(id)) return null;
  const { data, error } = await supabase
    .from("problem_series")
    .select("id, owner_id, title, description, created_at")
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return null;
  const row = data as Record<string, unknown>;
  return {
    id: String(row.id),
    ownerId: String(row.owner_id),
    title: String(row.title ?? ""),
    description: typeof row.description === "string" ? row.description : null,
    createdAt: String(row.created_at),
  };
}

export async function createSeries(title: string, description?: string) {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const uid = session?.user?.id;
  if (!uid) return { error: "ログインしてください", series: null as ProblemSeries | null };
  const t = title.trim().slice(0, 80);
  if (!t) return { error: "シリーズ名を入力してください", series: null };
  const { data, error } = await supabase
    .from("problem_series")
    .insert({ owner_id: uid, title: t, description: description?.trim() || null })
    .select("id, owner_id, title, description, created_at")
    .single();
  if (error || !data) return { error: error?.message ?? "作成に失敗しました", series: null };
  const row = data as Record<string, unknown>;
  return {
    error: null as string | null,
    series: {
      id: String(row.id),
      ownerId: String(row.owner_id),
      title: String(row.title ?? ""),
      description: typeof row.description === "string" ? row.description : null,
      createdAt: String(row.created_at),
    },
  };
}

export async function assignProblemSeries(
  problemId: string,
  seriesId: string | null,
  ord?: number,
) {
  if (!isProblemUuid(problemId)) return { error: "対象の問題がありません" };
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const uid = session?.user?.id;
  if (!uid) return { error: "ログインしてください" };
  const { error } = await supabase
    .from("problems")
    .update({
      series_id: seriesId,
      series_ord: seriesId ? (ord ?? 0) : null,
    })
    .eq("id", problemId)
    .eq("author_id", uid);
  return { error: error?.message };
}

export { sanitizeHints };
