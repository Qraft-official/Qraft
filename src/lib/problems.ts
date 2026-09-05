import { USER_MAP } from "./mock-data";
import { ME_ID } from "./constants";
import { ensureProfile } from "./auth";
import { asProblemMode, modeStoresAnswer, type ProblemMode } from "./challenge";
import { asDifficulty } from "./difficulty";
import { sanitizeHints } from "./learn";
import { HANDWRITING_UPLOAD_ERROR } from "./handwriting-export";
import { persistHandwritingPages, firstDrawingUrl } from "./problem-images";
import { supabase } from "./supabase";
import { userIsVerified } from "./verified";
import type { NotePage, Post, Subject, User } from "./types";

export type ProblemRow = {
  id: string;
  author_id: string;
  title: string;
  problem_text: string;
  solution: string | null;
  subject: string;
  photo: string | null;
  is_sprint: boolean;
  sprint_day: string | null;
  created_at: string;
  pages?: NotePage[] | null;
  problem_format?: string | null;
  mode?: string | null;
  correct_answer?: string | null;
  difficulty_level?: number | null;
  confused_count?: number | null;
  is_hard_spotlight?: boolean | null;
  promoted?: boolean | null;
  promoted_at?: string | null;
  hints?: unknown;
  felt_easy?: number | null;
  felt_normal?: number | null;
  felt_hard?: number | null;
  duration_sum?: number | null;
  duration_n?: number | null;
  grade_correct?: number | null;
  grade_n?: number | null;
  series_id?: string | null;
  series_ord?: number | null;
  series?: { id: string; title: string } | { id: string; title: string }[] | null;
};

export type ProfileRow = {
  id: string;
  name: string;
  handle: string | null;
};

export type NewProblem = {
  subject: Subject;
  text: string;
  title?: string;
  solution?: string;
  photo?: string;
  isSprint?: boolean;
  pages?: NotePage[];
  drawingBlobs?: (Blob | null)[];
  format?: "handwriting" | "typed";
  authorId?: string;
  mode?: ProblemMode;
  correctAnswer?: string | null;
  difficultyLevel?: number;
  hints?: string[];
};

export type ProblemPatch = {
  title?: string;
  text?: string;
  correctAnswer?: string | null;
  mode?: ProblemMode;
  pages?: NotePage[];
  drawingBlobs?: (Blob | null)[];
  photo?: string;
  format?: "handwriting" | "typed";
  hints?: string[];
};

const SUBJECTS: Subject[] = ["math", "physics", "chemistry"];

const PROBLEM_COLUMNS =
  "id, author_id, title, problem_text, solution, subject, photo, is_sprint, sprint_day, pages, problem_format, created_at, mode, correct_answer, difficulty_level, confused_count, is_hard_spotlight, promoted, promoted_at, hints, felt_easy, felt_normal, felt_hard, duration_sum, duration_n, grade_correct, grade_n, series_id, series_ord";

const PROBLEM_COLUMNS_LEGACY =
  "id, author_id, title, problem_text, solution, subject, photo, is_sprint, sprint_day, pages, problem_format, created_at, mode, correct_answer, difficulty_level, confused_count, is_hard_spotlight, promoted, promoted_at";

export function asSubject(value: string): Subject {
  return SUBJECTS.includes(value as Subject) ? (value as Subject) : "math";
}

export function fallbackUser(id: string, profile?: ProfileRow | null): User {
  const base = USER_MAP[ME_ID];
  const rawHandle = profile?.handle;
  const handle =
    typeof rawHandle === "string" && rawHandle.replace(/^@/, "")
      ? rawHandle.replace(/^@/, "")
      : id.replace(/-/g, "").slice(0, 8);
  const user: User = {
    ...base,
    id,
    name: typeof profile?.name === "string" && profile.name.trim() ? profile.name.trim() : "Qraft ユーザー",
    handle,
    bio: "",
    school: "",
    titles: [],
    activeTitles: [],
    age: null,
    verified: false,
    isVerified: false,
  };
  const verified = userIsVerified(user);
  user.verified = verified;
  user.isVerified = verified;
  return user;
}

function asNotePages(value: unknown): NotePage[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const pages: NotePage[] = [];
  for (const raw of value) {
    if (!raw || typeof raw !== "object") continue;
    const p = raw as Record<string, unknown>;
    if (typeof p.id !== "string") continue;
    pages.push({
      id: p.id,
      latex: typeof p.latex === "string" ? p.latex : "",
      doodle: typeof p.doodle === "number" ? p.doodle : 0,
      image: typeof p.image === "string" && p.image && !p.image.startsWith("{") ? p.image : undefined,
      contentWidth: typeof p.contentWidth === "number" ? p.contentWidth : undefined,
      contentHeight: typeof p.contentHeight === "number" ? p.contentHeight : undefined,
    });
  }
  return pages.length ? pages : undefined;
}

export function problemToPost(
  row: ProblemRow,
  viewerId?: string | null,
  seriesTitles: Record<string, string> = {},
): Post {
  const title = row.title?.trim() ?? "";
  const body = row.problem_text ?? "";
  const text = title ? `**${title}**\n\n${body}` : body;
  const format =
    row.problem_format === "handwriting" || row.problem_format === "typed"
      ? row.problem_format
      : undefined;
  const problemMode = asProblemMode(row.mode);
  const isAuthor = !!viewerId && viewerId === row.author_id;
  return {
    id: row.id,
    authorId: row.author_id,
    kind: row.is_sprint ? "sprint" : "problem",
    subject: asSubject(row.subject),
    text,
    title,
    solution: row.solution ?? undefined,
    photo: row.photo ?? undefined,
    pages: asNotePages(row.pages),
    solutionFormat: format,
    isSprint: row.is_sprint,
    createdAt: row.created_at,
    replyCount: 0,
    repostCount: 0,
    likeCount: 0,
    ahaSum: 0,
    ahaCount: 0,
    eleganceSum: 0,
    eleganceCount: 0,
    sprintDay: row.is_sprint ? (row.sprint_day ?? undefined) : undefined,
    problemMode,
    correctAnswer:
      problemMode === "aha"
        ? (row.correct_answer ?? "")
        : isAuthor && problemMode === "challenge"
          ? (row.correct_answer ?? "")
          : undefined,
    difficultyLevel: asDifficulty(row.difficulty_level),
    confusedCount: Number(row.confused_count ?? 0),
    isHardSpotlight: !!row.is_hard_spotlight,
    promoted: !!row.promoted,
    promotedAt: row.promoted_at ?? undefined,
    hints: sanitizeHints(row.hints),
    feltEasy: Number(row.felt_easy ?? 0),
    feltNormal: Number(row.felt_normal ?? 0),
    feltHard: Number(row.felt_hard ?? 0),
    durationSum: Number(row.duration_sum ?? 0),
    durationN: Number(row.duration_n ?? 0),
    gradeCorrect: Number(row.grade_correct ?? 0),
    gradeN: Number(row.grade_n ?? 0),
    seriesId: row.series_id ?? undefined,
    seriesOrd: row.series_ord ?? undefined,
    seriesTitle: row.series_id ? seriesTitles[row.series_id] : undefined,
  };
}

export async function fetchProblems(): Promise<{
  posts: Post[];
  profiles: Record<string, User>;
  error: string | null;
}> {
  const viewerTask = supabase.auth.getSession();
  let problemsTask = await supabase
    .from("problems")
    .select(PROBLEM_COLUMNS)
    .order("created_at", { ascending: false });
  if (problemsTask.error && /hints|felt_easy|series_id|duration_sum|grade_correct/i.test(problemsTask.error.message)) {
    problemsTask = (await supabase
      .from("problems")
      .select(PROBLEM_COLUMNS_LEGACY)
      .order("created_at", { ascending: false })) as typeof problemsTask;
  }

  const [{ data: sessionWrap }, { data, error }] = await Promise.all([
    viewerTask,
    Promise.resolve(problemsTask),
  ]);
  const viewerId = sessionWrap.session?.user?.id ?? null;

  if (error) {
    return { posts: [], profiles: {}, error: error.message };
  }

  const rows = (data ?? []) as ProblemRow[];
  const seriesIds = [...new Set(rows.map((r) => r.series_id).filter((id): id is string => !!id))];
  const seriesTitles: Record<string, string> = {};
  if (seriesIds.length) {
    const { data: seriesRows } = await supabase
      .from("problem_series")
      .select("id, title")
      .in("id", seriesIds);
    for (const s of seriesRows ?? []) {
      const row = s as { id: string; title?: string };
      seriesTitles[row.id] = row.title ?? "";
    }
  }
  const posts = rows.map((row) => problemToPost(row, viewerId, seriesTitles));
  const authorIds = [...new Set(rows.map((r) => r.author_id))];
  const profiles: Record<string, User> = {};

  if (authorIds.length) {
    const { data: profileRows } = await supabase
      .from("profiles")
      .select("id, name, handle")
      .in("id", authorIds);
    for (const p of (profileRows ?? []) as ProfileRow[]) {
      profiles[p.id] = fallbackUser(p.id, p);
    }
  }

  return { posts, profiles, error: null };
}

function answerPayload(input: NewProblem) {
  const mode = asProblemMode(input.mode);
  const correctAnswer = modeStoresAnswer(mode)
    ? (input.correctAnswer ?? "").trim() || null
    : null;
  return { mode, correct_answer: correctAnswer };
}

export async function insertProblem(input: NewProblem): Promise<{
  post: Post | null;
  error: string | null;
}> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const authorId = user?.id || session?.user?.id || input.authorId;
  if (!authorId) {
    return { post: null, error: "投稿するにはログインしてください" };
  }

  if (user) await ensureProfile(user);
  else if (session?.user) await ensureProfile(session.user);

  if (input.isSprint) {
    return { post: null, error: "PULSE応募はメール審査のみです。データベースには保存しません。" };
  }

  const challenge = answerPayload(input);
  if (challenge.mode === "challenge" && !challenge.correct_answer) {
    return { post: null, error: "Challenger モードでは正解の入力が必須です" };
  }
  if (challenge.mode === "aha" && !challenge.correct_answer) {
    return { post: null, error: "答えを入力してください" };
  }

  const hydrated = await persistHandwritingPages(authorId, input.pages, input.drawingBlobs);
  if (hydrated.error) return { post: null, error: hydrated.error };
  const pages = hydrated.pages ?? null;
  const hadDrawingBlobs = input.drawingBlobs?.some((b) => !!b && b.size > 0) ?? false;
  const drawingUrl = firstDrawingUrl(pages ?? undefined);
  if ((input.format === "handwriting" && hadDrawingBlobs) && !drawingUrl) {
    return { post: null, error: HANDWRITING_UPLOAD_ERROR };
  }
  const photo =
    input.format === "handwriting"
      ? drawingUrl ??
        (hadDrawingBlobs
          ? null
          : input.photo && !input.photo.startsWith("data:")
            ? input.photo
            : null)
      : (input.photo ?? null);

  const row = {
    author_id: authorId,
    title: input.title?.trim() ?? "",
    problem_text: input.text,
    solution: input.solution?.trim() || null,
    subject: input.subject,
    photo,
    is_sprint: false,
    sprint_day: null,
    pages,
    problem_format: input.format ?? null,
    mode: challenge.mode,
    correct_answer: challenge.correct_answer,
    difficulty_level: asDifficulty(input.difficultyLevel),
    hints: sanitizeHints(input.hints),
  };
  let { data, error } = await supabase.from("problems").insert(row).select(PROBLEM_COLUMNS).single();
  if (error && /hints/i.test(error.message)) {
    const { hints: _hints, ...legacy } = row;
    void _hints;
    ({ data, error } = (await supabase
      .from("problems")
      .insert(legacy)
      .select(PROBLEM_COLUMNS_LEGACY)
      .single()) as { data: typeof data; error: typeof error });
  } else if (error && /felt_easy|series_id|duration_sum|grade_correct/i.test(error.message)) {
    ({ data, error } = (await supabase
      .from("problems")
      .insert(row)
      .select(PROBLEM_COLUMNS_LEGACY)
      .single()) as { data: typeof data; error: typeof error });
  }

  if (error) return { post: null, error: error.message };
  return { post: problemToPost(data as ProblemRow, authorId), error: null };
}

export async function updateProblem(
  id: string,
  patch: ProblemPatch,
): Promise<{ post: Post | null; error: string | null }> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const viewerId = session?.user?.id;
  if (!viewerId) {
    return { post: null, error: "ログインしてください" };
  }

  const updates: Record<string, unknown> = {};
  if (patch.title !== undefined) updates.title = patch.title.trim();
  if (patch.text !== undefined) updates.problem_text = patch.text;
  if (patch.mode !== undefined) {
    const nextMode = asProblemMode(patch.mode);
    updates.mode = nextMode;
    if (modeStoresAnswer(nextMode)) {
      if (patch.correctAnswer !== undefined) {
        const trimmed = (patch.correctAnswer ?? "").trim();
        if (!trimmed) {
          return {
            post: null,
            error:
              nextMode === "aha"
                ? "答えを入力してください"
                : "Challenger モードでは正解の入力が必須です",
          };
        }
        updates.correct_answer = trimmed;
      }
    } else {
      updates.correct_answer = null;
    }
  } else if (patch.correctAnswer !== undefined) {
    const trimmed = (patch.correctAnswer ?? "").trim();
    if (!trimmed) {
      return { post: null, error: "答えを入力してください" };
    }
    updates.correct_answer = trimmed;
  }

  if (patch.hints !== undefined) updates.hints = sanitizeHints(patch.hints);
  if (patch.format !== undefined) {
    updates.problem_format = patch.format;
  }
  if (patch.pages !== undefined || patch.drawingBlobs?.some(Boolean)) {
    const hydrated = await persistHandwritingPages(viewerId, patch.pages, patch.drawingBlobs);
    if (hydrated.error) return { post: null, error: hydrated.error };
    const pages = hydrated.pages ?? null;
    if (pages) updates.pages = pages;
    const hadDrawingBlobs = patch.drawingBlobs?.some((b) => !!b && b.size > 0) ?? false;
    const drawingUrl = firstDrawingUrl(pages ?? undefined);
    if ((patch.format === "handwriting" && hadDrawingBlobs) && !drawingUrl) {
      return { post: null, error: HANDWRITING_UPLOAD_ERROR };
    }
    if (drawingUrl) updates.photo = drawingUrl;
    else if (patch.photo !== undefined) updates.photo = patch.photo;
  } else if (patch.photo !== undefined) {
    updates.photo = patch.photo;
  }

  if (!Object.keys(updates).length) {
    return { post: null, error: "変更がありません" };
  }

  const { data, error } = await supabase
    .from("problems")
    .update(updates)
    .eq("id", id)
    .eq("author_id", viewerId)
    .select(PROBLEM_COLUMNS)
    .single();

  if (error) return { post: null, error: error.message };
  return { post: problemToPost(data as ProblemRow, viewerId), error: null };
}

export async function deleteProblem(id: string): Promise<{ error: string | null }> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError) return { error: userError.message };
  const viewerId = user?.id;
  if (!viewerId) return { error: "ログインしてください" };

  const { data: rpcId, error: rpcError } = await supabase.rpc("delete_own_problem", {
    p_problem_id: id,
  });
  if (!rpcError && rpcId) return { error: null };
  if (rpcError && !/could not find|does not exist|schema cache/i.test(rpcError.message)) {
    if (/NOT_AUTHENTICATED/i.test(rpcError.message)) return { error: "ログインしてください" };
    if (/NOT_OWNER_OR_MISSING/i.test(rpcError.message)) {
      return { error: "この投稿は削除できません。自分の投稿のみ削除できます。" };
    }
    return { error: rpcError.message };
  }

  const { data, error } = await supabase
    .from("problems")
    .delete()
    .eq("id", id)
    .eq("author_id", viewerId)
    .select("id");
  if (error) return { error: error.message };
  if (!data?.length) {
    return { error: "この投稿は削除できません。自分の投稿のみ削除できます。" };
  }
  return { error: null };
}

export async function promoteProblem(id: string): Promise<{ post: Post | null; error: string | null }> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const viewerId = session?.user?.id;
  if (!viewerId) return { post: null, error: "ログインしてください" };

  const { error } = await supabase.rpc("promote_own_problem", { p_problem_id: id });
  if (error) {
    if (/PROMO_USED/i.test(error.message)) {
      return { post: null, error: "今月のプロモーション枠（1回）は使用済みです" };
    }
    if (/NOT_OWNER/i.test(error.message)) {
      return { post: null, error: "自分の投稿のみプロモーションできます" };
    }
    return { post: null, error: error.message };
  }

  const { data, error: readError } = await supabase
    .from("problems")
    .select(PROBLEM_COLUMNS)
    .eq("id", id)
    .maybeSingle();
  if (readError || !data) return { post: null, error: readError?.message || "更新に失敗しました" };
  return { post: problemToPost(data as ProblemRow, viewerId), error: null };
}
