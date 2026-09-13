import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { asProblemMode, type ProblemMode } from "@/lib/challenge";
import { asDifficulty } from "@/lib/difficulty";
import { asNotePages, asSubject } from "@/lib/problems";
import { isProblemListedForFeed } from "@/lib/publish-at";
import type { NotePage, Subject } from "@/lib/types";

/** Safe fields only: never select solution, correct_answer, hints, or PULSE secrets. */
const PUBLIC_PROBLEM_COLUMNS =
  "id, title, problem_text, subject, photo, is_sprint, sprint_day, publish_at, topic, pages, problem_format, created_at, mode, difficulty_level";

export type PublicProblemPreview = {
  id: string;
  title: string;
  body: string;
  subject: Subject;
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
  sprint_day: string | null;
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

function rowToPreview(row: PublicProblemRow): PublicProblemPreview | null {
  if (!isProblemListedForFeed(row)) return null;
  const title = row.title?.trim() ?? "";
  const topic = typeof row.topic === "string" ? row.topic.trim() : "";
  let body = row.problem_text ?? "";
  if (topic && !body.startsWith(topic)) body = `${topic}\n\n${body}`;
  return {
    id: row.id,
    title,
    body,
    subject: asSubject(row.subject),
    difficultyLevel: asDifficulty(row.difficulty_level),
    mode: asProblemMode(row.mode),
    createdAt: row.created_at,
    pages: asNotePages(row.pages),
    photo: row.photo ?? undefined,
    isSprint: !!row.is_sprint,
  };
}

export function publicProblemHasBody(preview: PublicProblemPreview) {
  const text = `${preview.title}\n${preview.body}`.trim();
  const hasPages = !!preview.pages?.length;
  const hasPhoto = !!preview.photo;
  return text.length >= 40 || hasPages || hasPhoto;
}

export async function fetchPublicProblemPreviews(limit = 12): Promise<PublicProblemPreview[]> {
  const supabase = createPublicSupabase();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("problems")
    .select(PUBLIC_PROBLEM_COLUMNS)
    .order("created_at", { ascending: false })
    .limit(Math.max(1, Math.min(limit, 24)));
  if (error) {
    console.warn("public problem catalog:", error.message);
    return [];
  }
  return ((data ?? []) as PublicProblemRow[])
    .map(rowToPreview)
    .filter((row): row is PublicProblemPreview => !!row);
}

export async function fetchPublicProblemPreview(id: string): Promise<PublicProblemPreview | null> {
  const supabase = createPublicSupabase();
  if (!supabase || !id) return null;
  const { data, error } = await supabase
    .from("problems")
    .select(PUBLIC_PROBLEM_COLUMNS)
    .eq("id", id)
    .maybeSingle();
  if (error) {
    console.warn("public problem:", error.message);
    return null;
  }
  if (!data) return null;
  return rowToPreview(data as PublicProblemRow);
}

export async function fetchPublicProblemIdsForSitemap(limit = 80): Promise<{ id: string; createdAt: string }[]> {
  const supabase = createPublicSupabase();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("problems")
    .select("id, created_at, is_sprint, publish_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) {
    console.warn("public sitemap:", error.message);
    return [];
  }
  return ((data ?? []) as PublicProblemRow[])
    .filter((row) => isProblemListedForFeed(row))
    .map((row) => ({ id: row.id, createdAt: row.created_at }));
}
