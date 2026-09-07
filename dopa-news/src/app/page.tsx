import NewsFeed from "@/components/news/NewsFeed";
import TopBar from "@/components/navigation/TopBar";
import { fetchFeed } from "@/lib/news-queries";
import { getServerSupabase, isSupabaseConfigured } from "@/lib/supabase/server";
import type { NewsWithQuiz } from "@/types/database";

// Breaking news should never be served from a stale cache.
export const revalidate = 30;

export default async function HomePage() {
  let initialArticles: NewsWithQuiz[] = [];
  let initialError: string | null = null;

  if (!isSupabaseConfigured) {
    initialError = "not-configured";
  } else {
    try {
      initialArticles = await fetchFeed(getServerSupabase(), { limit: 12 });
    } catch {
      initialError = "fetch-failed";
    }
  }

  return (
    <main className="pad-nav min-h-dvh">
      <TopBar />
      <NewsFeed initialArticles={initialArticles} initialError={initialError} />
    </main>
  );
}
