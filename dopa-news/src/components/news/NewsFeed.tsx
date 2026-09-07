"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Newspaper } from "lucide-react";
import CategoryChips from "./CategoryChips";
import NewsCard from "./NewsCard";
import DopaModeBar from "./DopaModeBar";
import { EmptyState, ErrorState, FeedSkeleton, Spinner } from "@/components/ui/States";
import { RECOMMENDED_FEED } from "@/lib/categories";
import { fetchFeed } from "@/lib/news-queries";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase/client";
import type { NewsWithQuiz } from "@/types/database";

const PAGE_SIZE = 12;

export default function NewsFeed({
  initialArticles,
  initialError,
}: {
  initialArticles: NewsWithQuiz[];
  initialError?: string | null;
}) {
  const [category, setCategory] = useState(RECOMMENDED_FEED);
  const [articles, setArticles] = useState<NewsWithQuiz[]>(initialArticles);
  const [status, setStatus] = useState<"idle" | "loading" | "error">(
    initialError ? "error" : "idle",
  );
  const [loadingMore, setLoadingMore] = useState(false);
  const [exhausted, setExhausted] = useState(initialArticles.length < PAGE_SIZE);
  const sentinel = useRef<HTMLDivElement>(null);
  const isFirstRender = useRef(true);

  const load = useCallback(async (nextCategory: string) => {
    if (!isSupabaseConfigured) {
      setStatus("error");
      return;
    }
    setStatus("loading");
    try {
      const rows = await fetchFeed(getSupabase(), { category: nextCategory, limit: PAGE_SIZE });
      setArticles(rows);
      setExhausted(rows.length < PAGE_SIZE);
      setStatus("idle");
    } catch {
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    void load(category);
  }, [category, load]);

  const loadMore = useCallback(async () => {
    if (loadingMore || exhausted || status !== "idle" || !isSupabaseConfigured) return;
    setLoadingMore(true);
    try {
      const rows = await fetchFeed(getSupabase(), {
        category,
        limit: PAGE_SIZE,
        offset: articles.length,
      });
      setArticles((prev) => {
        const seen = new Set(prev.map((a) => a.id));
        return [...prev, ...rows.filter((r) => !seen.has(r.id))];
      });
      if (rows.length < PAGE_SIZE) setExhausted(true);
    } catch {
      setExhausted(true);
    } finally {
      setLoadingMore(false);
    }
  }, [articles.length, category, exhausted, loadingMore, status]);

  useEffect(() => {
    const node = sentinel.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) void loadMore();
      },
      { rootMargin: "320px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [loadMore]);

  return (
    <>
      <div className="sticky top-0 z-40 glass border-b border-line px-4 pb-2.5 pt-1">
        <CategoryChips value={category} onChange={setCategory} />
      </div>

      <div className="space-y-3.5 px-4 pt-3.5">
        <DopaModeBar />

        {status === "loading" && <FeedSkeleton count={3} />}

        {status === "error" && (
          <ErrorState
            message="ニュースを読み込めませんでした"
            detail={
              isSupabaseConfigured
                ? "通信環境を確認して、もう一度お試しください。"
                : "Supabase の環境変数が設定されていません。README を確認してください。"
            }
            onRetry={() => void load(category)}
          />
        )}

        {status === "idle" && articles.length === 0 && (
          <EmptyState
            icon={<Newspaper size={26} />}
            title="このカテゴリのニュースはまだありません"
            description="別のカテゴリを選ぶか、しばらくしてからもう一度確認してください。"
          />
        )}

        {status === "idle" &&
          articles.map((article, i) => (
            <NewsCard key={article.id} article={article} index={i} priority={i === 0} />
          ))}

        <div ref={sentinel} className="h-1" />

        {loadingMore && (
          <div className="flex justify-center py-4 text-fg-faint">
            <Spinner />
          </div>
        )}

        {status === "idle" && exhausted && articles.length > 0 && (
          <p className="py-5 text-center text-[11.5px] text-fg-faint">
            ここまでが最新のニュースです
          </p>
        )}
      </div>
    </>
  );
}
