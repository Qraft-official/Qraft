import type { Metadata } from "next";
import DopaMode from "@/components/news/DopaMode";
import { fetchFeed } from "@/lib/news-queries";
import { getServerSupabase, isSupabaseConfigured } from "@/lib/supabase/server";
import type { NewsWithQuiz } from "@/types/database";

export const revalidate = 30;

export const metadata: Metadata = {
  title: "ドパモード",
  description: "1画面1ニュース。スワイプで今日のニュースを一気に理解する。",
};

export default async function DopaPage() {
  let articles: NewsWithQuiz[] = [];
  if (isSupabaseConfigured) {
    try {
      articles = await fetchFeed(getServerSupabase(), { limit: 15 });
    } catch {
      articles = [];
    }
  }

  return (
    <main>
      <DopaMode articles={articles} />
    </main>
  );
}
