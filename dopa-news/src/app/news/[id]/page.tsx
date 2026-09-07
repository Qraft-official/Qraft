import type { Metadata } from "next";
import { notFound } from "next/navigation";
import NewsDetail from "@/components/news/NewsDetail";
import { fetchArticle, fetchRelated } from "@/lib/news-queries";
import { getServerSupabase, isSupabaseConfigured } from "@/lib/supabase/server";
import type { NewsWithQuiz } from "@/types/database";

export const revalidate = 30;

async function loadArticle(id: string): Promise<NewsWithQuiz | null> {
  if (!isSupabaseConfigured) return null;
  try {
    return await fetchArticle(getServerSupabase(), id);
  } catch {
    return null;
  }
}

export async function generateMetadata(props: PageProps<"/news/[id]">): Promise<Metadata> {
  const { id } = await props.params;
  const article = await loadArticle(id);
  if (!article) return { title: "ニュースが見つかりません" };
  return {
    title: article.title,
    description: article.three_second_summary,
    openGraph: {
      title: article.title,
      description: article.three_second_summary,
      images: article.image_url ? [article.image_url] : undefined,
    },
  };
}

export default async function NewsDetailPage(props: PageProps<"/news/[id]">) {
  const { id } = await props.params;
  const article = await loadArticle(id);
  if (!article) notFound();

  let related: NewsWithQuiz[] = [];
  try {
    related = await fetchRelated(getServerSupabase(), article);
  } catch {
    related = [];
  }

  return (
    <main className="min-h-dvh">
      <NewsDetail article={article} related={related} />
    </main>
  );
}
