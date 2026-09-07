import type { SupabaseClient } from "@supabase/supabase-js";
import { NEWS_SELECT, normalizeNews } from "@/lib/news-queries";
import type {
  MapPostWithAuthor,
  NewsWithQuiz,
  Profile,
  QuizOption,
  ReportRow,
} from "@/types/database";

export interface NewsFormValues {
  id?: string;
  title: string;
  summary: string;
  what_happened: string;
  why_trending: string;
  three_second_summary: string;
  social_reaction_summary: string;
  category: string;
  image_url: string;
  source_name: string;
  source_url: string;
  source_type: string;
  keywords: string;
  heat: number;
  is_breaking: boolean;
  is_published: boolean;
  is_sample: boolean;
  published_at: string;
  quiz_question: string;
  quiz_option_a: string;
  quiz_option_b: string;
  quiz_option_c: string;
  quiz_result: QuizOption | "";
  quiz_result_note: string;
}

export const EMPTY_NEWS_FORM: NewsFormValues = {
  title: "",
  summary: "",
  what_happened: "",
  why_trending: "",
  three_second_summary: "",
  social_reaction_summary: "",
  category: "国内",
  image_url: "",
  source_name: "",
  source_url: "",
  source_type: "major_media",
  keywords: "",
  heat: 50,
  is_breaking: false,
  is_published: false,
  is_sample: false,
  published_at: "",
  quiz_question: "",
  quiz_option_a: "",
  quiz_option_b: "",
  quiz_option_c: "",
  quiz_result: "",
  quiz_result_note: "",
};

/** `datetime-local` needs a local ISO string without timezone or seconds. */
export function toLocalInput(iso: string | null | undefined): string {
  const date = iso ? new Date(iso) : new Date();
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

export function newsToForm(article: NewsWithQuiz): NewsFormValues {
  return {
    id: article.id,
    title: article.title,
    summary: article.summary,
    what_happened: article.what_happened,
    why_trending: article.why_trending,
    three_second_summary: article.three_second_summary,
    social_reaction_summary: article.social_reaction_summary ?? "",
    category: article.category,
    image_url: article.image_url ?? "",
    source_name: article.source_name,
    source_url: article.source_url,
    source_type: article.source_type,
    keywords: article.keywords.join(", "),
    heat: article.heat,
    is_breaking: article.is_breaking,
    is_published: article.is_published,
    is_sample: article.is_sample,
    published_at: toLocalInput(article.published_at),
    quiz_question: article.quiz?.question ?? "",
    quiz_option_a: article.quiz?.option_a ?? "",
    quiz_option_b: article.quiz?.option_b ?? "",
    quiz_option_c: article.quiz?.option_c ?? "",
    quiz_result: article.quiz?.result_option ?? "",
    quiz_result_note: article.quiz?.result_note ?? "",
  };
}

export function validateNewsForm(form: NewsFormValues): string | null {
  if (form.title.trim().length < 4) return "タイトルを4文字以上で入力してください";
  if (form.summary.trim().length < 8) return "一言説明を入力してください";
  if (form.what_happened.trim().length < 10) return "「何が起きた？」を入力してください";
  if (form.why_trending.trim().length < 10) return "「なんで話題？」を入力してください";
  if (form.three_second_summary.trim().length < 5) return "「3秒で理解」を入力してください";
  if (form.source_name.trim().length < 2) return "情報源の名前を入力してください";
  if (!/^https?:\/\/\S+$/.test(form.source_url.trim())) {
    return "情報源URLは http(s):// から始まる形式で入力してください";
  }
  const quizFields = [
    form.quiz_question,
    form.quiz_option_a,
    form.quiz_option_b,
    form.quiz_option_c,
  ].map((v) => v.trim());
  const filled = quizFields.filter((v) => v.length > 0).length;
  if (filled > 0 && filled < 4) {
    return "クイズは質問と3つの選択肢をすべて入力してください";
  }
  if (filled === 0 && form.quiz_result) {
    return "クイズがない記事に結果は設定できません";
  }
  return null;
}

export async function fetchAdminNews(
  supabase: SupabaseClient,
  { search = "", limit = 60 }: { search?: string; limit?: number } = {},
): Promise<NewsWithQuiz[]> {
  let query = supabase
    .from("news_articles")
    .select(NEWS_SELECT)
    .order("published_at", { ascending: false })
    .limit(limit);

  const term = search.trim();
  if (term) {
    query = query.ilike("search_text", `%${term.replace(/[%_\\,()]/g, " ").trim()}%`);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map((row) => normalizeNews(row as Record<string, unknown>));
}

export async function saveNews(
  supabase: SupabaseClient,
  form: NewsFormValues,
): Promise<string> {
  const keywords = form.keywords
    .split(/[,、\s]+/)
    .map((k) => k.trim())
    .filter((k) => k.length > 0)
    .slice(0, 12);

  const article = {
    title: form.title.trim(),
    summary: form.summary.trim(),
    what_happened: form.what_happened.trim(),
    why_trending: form.why_trending.trim(),
    three_second_summary: form.three_second_summary.trim(),
    social_reaction_summary: form.social_reaction_summary.trim() || null,
    category: form.category,
    image_url: form.image_url.trim() || null,
    source_name: form.source_name.trim(),
    source_url: form.source_url.trim(),
    source_type: form.source_type,
    keywords,
    heat: Math.max(0, Math.min(100, Math.round(form.heat))),
    is_breaking: form.is_breaking,
    is_published: form.is_published,
    is_sample: form.is_sample,
    published_at: new Date(form.published_at || Date.now()).toISOString(),
  };

  let newsId = form.id;
  if (newsId) {
    const { error } = await supabase.from("news_articles").update(article).eq("id", newsId);
    if (error) throw error;
  } else {
    const { data, error } = await supabase
      .from("news_articles")
      .insert(article)
      .select("id")
      .single();
    if (error) throw error;
    newsId = (data as { id: string }).id;
  }

  const hasQuiz = form.quiz_question.trim().length > 0;
  if (hasQuiz) {
    const quiz = {
      news_id: newsId,
      question: form.quiz_question.trim(),
      option_a: form.quiz_option_a.trim(),
      option_b: form.quiz_option_b.trim(),
      option_c: form.quiz_option_c.trim(),
      result_option: form.quiz_result || null,
      result_note: form.quiz_result_note.trim() || null,
      resolved_at: form.quiz_result ? new Date().toISOString() : null,
    };
    const { error } = await supabase.from("news_quizzes").upsert(quiz, { onConflict: "news_id" });
    if (error) throw error;
  } else {
    const { error } = await supabase.from("news_quizzes").delete().eq("news_id", newsId);
    if (error) throw error;
  }

  return newsId as string;
}

export async function deleteNews(supabase: SupabaseClient, id: string): Promise<void> {
  const { error } = await supabase.from("news_articles").delete().eq("id", id);
  if (error) throw error;
}

export async function updateNewsFlags(
  supabase: SupabaseClient,
  id: string,
  patch: { is_published?: boolean; is_breaking?: boolean },
): Promise<void> {
  const { error } = await supabase.from("news_articles").update(patch).eq("id", id);
  if (error) throw error;
}

export async function fetchAdminMapPosts(
  supabase: SupabaseClient,
  { limit = 60 }: { limit?: number } = {},
): Promise<MapPostWithAuthor[]> {
  const { data, error } = await supabase
    .from("map_posts")
    .select("*, profiles(username)")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []).map((row) => {
    const { profiles, ...rest } = row as Record<string, unknown> & {
      profiles?: { username?: string } | null;
    };
    return { ...(rest as unknown as MapPostWithAuthor), author_name: profiles?.username ?? "ユーザー" };
  });
}

export async function setMapPostHidden(
  supabase: SupabaseClient,
  id: string,
  hidden: boolean,
): Promise<void> {
  const { error } = await supabase.from("map_posts").update({ is_hidden: hidden }).eq("id", id);
  if (error) throw error;
}

export async function deleteMapPost(supabase: SupabaseClient, id: string): Promise<void> {
  const { error } = await supabase.from("map_posts").delete().eq("id", id);
  if (error) throw error;
}

export async function fetchReports(
  supabase: SupabaseClient,
  status: "open" | "reviewed" | "dismissed" | "all" = "open",
): Promise<ReportRow[]> {
  let query = supabase
    .from("reports")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(60);
  if (status !== "all") query = query.eq("status", status);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as ReportRow[];
}

export async function setReportStatus(
  supabase: SupabaseClient,
  id: string,
  status: "open" | "reviewed" | "dismissed",
): Promise<void> {
  const { error } = await supabase.from("reports").update({ status }).eq("id", id);
  if (error) throw error;
}

export async function fetchProfiles(
  supabase: SupabaseClient,
  search = "",
): Promise<Profile[]> {
  let query = supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(60);
  const term = search.trim();
  if (term) query = query.ilike("username", `%${term.replace(/[%_\\,()]/g, " ").trim()}%`);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as Profile[];
}

export interface AdminStats {
  news: number;
  drafts: number;
  mapPosts: number;
  openReports: number;
  users: number;
}

export async function fetchAdminStats(supabase: SupabaseClient): Promise<AdminStats> {
  const head = { count: "exact" as const, head: true };
  const [news, drafts, mapPosts, openReports, users] = await Promise.all([
    supabase.from("news_articles").select("id", head),
    supabase.from("news_articles").select("id", head).eq("is_published", false),
    supabase.from("map_posts").select("id", head),
    supabase.from("reports").select("id", head).eq("status", "open"),
    supabase.from("profiles").select("id", head),
  ]);

  return {
    news: news.count ?? 0,
    drafts: drafts.count ?? 0,
    mapPosts: mapPosts.count ?? 0,
    openReports: openReports.count ?? 0,
    users: users.count ?? 0,
  };
}
