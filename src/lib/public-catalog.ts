import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { asProblemMode, type ProblemMode } from "@/lib/challenge";
import { asDifficulty } from "@/lib/difficulty";
import { asNotePages, asSubject } from "@/lib/problems";
import { isProblemListedForFeed } from "@/lib/publish-at";
import type { NotePage, Subject } from "@/lib/types";

/**
 * Safe public columns only.
 * Never select solution, correct_answer, hints, seed internals, or join sprint_secrets.
 */
const PUBLIC_LIST_COLUMNS =
  "id, title, problem_text, subject, photo, is_sprint, sprint_day, publish_at, topic, created_at, mode, difficulty_level";

const PUBLIC_LIST_COLUMNS_MIN =
  "id, title, problem_text, subject, photo, is_sprint, created_at, mode, difficulty_level";

const PUBLIC_DETAIL_COLUMNS = `${PUBLIC_LIST_COLUMNS}, pages, problem_format`;

export const PUBLIC_DISCOVER_LIMIT = 24;
export const PUBLIC_HOME_LIMIT = 12;
export const PUBLIC_FEED_AD_EVERY = 4;
export const PUBLIC_FEED_BODY_CLAMP = 480;

export type PublicProblemPreview = {
  id: string;
  title: string;
  body: string;
  subject: Subject;
  topic?: string;
  difficultyLevel: number;
  mode: ProblemMode;
  createdAt: string;
  pages?: NotePage[];
  photo?: string;
  isSprint: boolean;
};

type PublicProblemRow = {
  id: string;
  title: string | null;
  problem_text: string | null;
  subject: string;
  photo: string | null;
  is_sprint: boolean | null;
  sprint_day?: string | null;
  publish_at?: string | null;
  topic?: string | null;
  pages?: unknown;
  problem_format?: string | null;
  created_at: string;
  mode?: string | null;
  difficulty_level?: number | null;
};

function createPublicSupabase(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

function latexFromPages(pages: unknown): string {
  const parsed = asNotePages(pages);
  if (!parsed?.length) return "";
  return parsed
    .map((p) => (typeof p.latex === "string" ? p.latex.trim() : ""))
    .filter(Boolean)
    .join("\n\n");
}

function rowToPreview(row: PublicProblemRow, includePages: boolean): PublicProblemPreview | null {
  if (!isProblemListedForFeed(row)) return null;
  const title = row.title?.trim() ?? "";
  const topic = typeof row.topic === "string" ? row.topic.trim() : "";
  let body = (row.problem_text ?? "").trim();
  if (topic && body && !body.startsWith(topic)) body = `${topic}\n\n${body}`;
  if (!body) body = latexFromPages(row.pages);
  if (!title && !body && !row.photo && !(includePages && asNotePages(row.pages)?.length)) {
    return null;
  }
  return {
    id: row.id,
    title,
    body,
    subject: asSubject(row.subject),
    topic: topic || undefined,
    difficultyLevel: asDifficulty(row.difficulty_level),
    mode: asProblemMode(row.mode),
    createdAt: row.created_at,
    pages: includePages ? asNotePages(row.pages) : undefined,
    photo: row.photo ?? undefined,
    isSprint: !!row.is_sprint,
  };
}

export function publicProblemIsListable(preview: PublicProblemPreview) {
  return Boolean(
    preview.title.trim() ||
      preview.body.trim() ||
      preview.photo ||
      preview.pages?.length,
  );
}

export function clampPublicBody(text: string, max = PUBLIC_FEED_BODY_CLAMP) {
  const trimmed = text.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max).trim()}…`;
}

async function selectRegularListed(
  supabase: SupabaseClient,
  columns: string,
  limit: number,
) {
  const cap = Math.max(1, Math.min(limit, 80));
  const filtered = await supabase
    .from("problems")
    .select(columns)
    .eq("is_sprint", false)
    .order("created_at", { ascending: false })
    .limit(cap);
  if (!filtered.error) return filtered;

  return supabase
    .from("problems")
    .select(PUBLIC_LIST_COLUMNS_MIN)
    .eq("is_sprint", false)
    .order("created_at", { ascending: false })
    .limit(cap);
}

export async function fetchPublicProblemPreviews(
  limit = PUBLIC_DISCOVER_LIMIT,
): Promise<PublicProblemPreview[]> {
  const supabase = createPublicSupabase();
  if (!supabase) {
    console.warn("public problem catalog: NEXT_PUBLIC_SUPABASE_URL or ANON_KEY missing");
    return [];
  }
  const { data, error } = await selectRegularListed(supabase, PUBLIC_LIST_COLUMNS, limit);
  if (error) {
    console.warn("public problem catalog:", error.message);
    return [];
  }
  return ((data ?? []) as PublicProblemRow[])
    .map((row) => rowToPreview(row, false))
    .filter((row): row is PublicProblemPreview => !!row && publicProblemIsListable(row));
}

export async function fetchPublicProblemPreview(id: string): Promise<PublicProblemPreview | null> {
  const supabase = createPublicSupabase();
  if (!supabase || !id) return null;
  const primary = await supabase
    .from("problems")
    .select(PUBLIC_DETAIL_COLUMNS)
    .eq("id", id)
    .maybeSingle();
  const { data, error } =
    primary.error && /topic|pages|problem_format|publish_at/i.test(primary.error.message)
      ? await supabase.from("problems").select(PUBLIC_LIST_COLUMNS_MIN).eq("id", id).maybeSingle()
      : primary;
  if (error) {
    console.warn("public problem:", error.message);
    return null;
  }
  if (!data) return null;
  return rowToPreview(data as PublicProblemRow, true);
}

export async function fetchPublicProblemIdsForSitemap(
  limit = 80,
): Promise<{ id: string; createdAt: string }[]> {
  const rows = await fetchPublicProblemPreviews(limit);
  return rows.map((row) => ({ id: row.id, createdAt: row.createdAt }));
}
