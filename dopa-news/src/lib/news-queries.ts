import type { SupabaseClient } from "@supabase/supabase-js";
import { BREAKING_FEED, RECOMMENDED_FEED } from "@/lib/categories";
import type { NewsQuiz, NewsWithQuiz } from "@/types/database";

export const NEWS_SELECT = "*, news_quizzes(*)";

type RawNews = Record<string, unknown> & { news_quizzes?: NewsQuiz[] | NewsQuiz | null };

export function normalizeNews(row: RawNews): NewsWithQuiz {
  const { news_quizzes, ...rest } = row;
  const quiz = Array.isArray(news_quizzes) ? (news_quizzes[0] ?? null) : (news_quizzes ?? null);
  return { ...(rest as unknown as NewsWithQuiz), quiz };
}

export interface FeedOptions {
  category?: string;
  limit?: number;
  offset?: number;
}

export async function fetchFeed(
  supabase: SupabaseClient,
  { category = RECOMMENDED_FEED, limit = 12, offset = 0 }: FeedOptions = {},
): Promise<NewsWithQuiz[]> {
  let query = supabase
    .from("news_articles")
    .select(NEWS_SELECT)
    .eq("is_published", true)
    .range(offset, offset + limit - 1);

  if (category === BREAKING_FEED) {
    query = query.eq("is_breaking", true).order("published_at", { ascending: false });
  } else if (category === RECOMMENDED_FEED) {
    // "おすすめ" balances freshness with how much a story is being talked about.
    query = query.order("heat", { ascending: false }).order("published_at", { ascending: false });
  } else {
    query = query.eq("category", category).order("published_at", { ascending: false });
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map((row) => normalizeNews(row as RawNews));
}

export async function fetchArticle(
  supabase: SupabaseClient,
  id: string,
): Promise<NewsWithQuiz | null> {
  const { data, error } = await supabase
    .from("news_articles")
    .select(NEWS_SELECT)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data ? normalizeNews(data as RawNews) : null;
}

export async function fetchRelated(
  supabase: SupabaseClient,
  article: { id: string; category: string },
  limit = 4,
): Promise<NewsWithQuiz[]> {
  const { data, error } = await supabase
    .from("news_articles")
    .select(NEWS_SELECT)
    .eq("is_published", true)
    .eq("category", article.category)
    .neq("id", article.id)
    .order("published_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []).map((row) => normalizeNews(row as RawNews));
}

export async function searchNews(
  supabase: SupabaseClient,
  term: string,
  limit = 20,
): Promise<NewsWithQuiz[]> {
  const cleaned = term.trim();
  if (!cleaned) return [];
  // Escape PostgREST pattern metacharacters before interpolating.
  const pattern = `%${cleaned.replace(/[%_\\,()]/g, " ").trim()}%`;
  const { data, error } = await supabase
    .from("news_articles")
    .select(NEWS_SELECT)
    .eq("is_published", true)
    .ilike("search_text", pattern)
    .order("published_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []).map((row) => normalizeNews(row as RawNews));
}

export function quizTotal(quiz: Pick<NewsQuiz, "votes_a" | "votes_b" | "votes_c">): number {
  return quiz.votes_a + quiz.votes_b + quiz.votes_c;
}
