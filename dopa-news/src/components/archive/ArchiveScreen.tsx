"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Bookmark, History, Search, Vote } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import NewsRow from "@/components/news/NewsRow";
import { PageHeader } from "@/components/navigation/TopBar";
import { EmptyState, ErrorState, RowSkeleton } from "@/components/ui/States";
import { useSession } from "@/hooks/use-session";
import { NEWS_CATEGORIES } from "@/lib/categories";
import { dayKey, relativeTime } from "@/lib/format";
import { NEWS_SELECT, normalizeNews } from "@/lib/news-queries";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase/client";
import type { NewsWithQuiz } from "@/types/database";

type Tab = "saved" | "history" | "voted";

const TABS: { id: Tab; label: string; icon: typeof Bookmark }[] = [
  { id: "saved", label: "保存済み", icon: Bookmark },
  { id: "history", label: "閲覧履歴", icon: History },
  { id: "voted", label: "投票した", icon: Vote },
];

const EMPTY_COPY: Record<Tab, { title: string; description: string }> = {
  saved: {
    title: "保存したニュースはまだありません",
    description: "気になるニュースの保存アイコンをタップすると、ここにたまっていきます。",
  },
  history: {
    title: "閲覧履歴はまだありません",
    description: "読んだニュースが自動でここに並びます。",
  },
  voted: {
    title: "投票したニュースはまだありません",
    description: "ニュース詳細の「このあとどうなる？」で予想すると、ここに残ります。",
  },
};

interface Entry {
  article: NewsWithQuiz;
  at: string;
}

export default function ArchiveScreen() {
  const { user, loading: sessionLoading } = useSession();
  const [tab, setTab] = useState<Tab>("saved");
  const [entries, setEntries] = useState<Entry[]>([]);
  const [status, setStatus] = useState<"loading" | "idle" | "error">("loading");
  const [term, setTerm] = useState("");
  const [category, setCategory] = useState<string | null>(null);

  const load = useCallback(
    async (target: Tab) => {
      if (!user || !isSupabaseConfigured) {
        setEntries([]);
        setStatus("idle");
        return;
      }
      setStatus("loading");
      const supabase = getSupabase();
      try {
        if (target === "saved") {
          const { data, error } = await supabase
            .from("saved_news")
            .select(`created_at, news_articles(${NEWS_SELECT})`)
            .eq("user_id", user.id)
            .order("created_at", { ascending: false });
          if (error) throw error;
          setEntries(
            (data ?? [])
              .filter((row) => row.news_articles)
              .map((row) => ({
                article: normalizeNews(row.news_articles as never),
                at: row.created_at as string,
              })),
          );
        } else if (target === "history") {
          const { data, error } = await supabase
            .from("news_views")
            .select(`viewed_at, news_articles(${NEWS_SELECT})`)
            .eq("user_id", user.id)
            .order("viewed_at", { ascending: false })
            .limit(80);
          if (error) throw error;
          setEntries(
            (data ?? [])
              .filter((row) => row.news_articles)
              .map((row) => ({
                article: normalizeNews(row.news_articles as never),
                at: row.viewed_at as string,
              })),
          );
        } else {
          const { data: votes, error: voteError } = await supabase
            .from("news_votes")
            .select("created_at, news_quizzes(news_id)")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false });
          if (voteError) throw voteError;

          const rows = (votes ?? []) as unknown as {
            created_at: string;
            news_quizzes: { news_id: string } | null;
          }[];
          const ids = rows.map((row) => row.news_quizzes?.news_id).filter(Boolean) as string[];
          if (ids.length === 0) {
            setEntries([]);
            setStatus("idle");
            return;
          }
          const { data: articles, error: articleError } = await supabase
            .from("news_articles")
            .select(NEWS_SELECT)
            .in("id", ids);
          if (articleError) throw articleError;
          const byId = new Map(
            (articles ?? []).map((row) => {
              const normalized = normalizeNews(row as never);
              return [normalized.id, normalized];
            }),
          );
          setEntries(
            rows
              .map((row) => {
                const article = row.news_quizzes ? byId.get(row.news_quizzes.news_id) : undefined;
                return article ? { article, at: row.created_at } : null;
              })
              .filter(Boolean) as Entry[],
          );
        }
        setStatus("idle");
      } catch {
        setStatus("error");
      }
    },
    [user],
  );

  useEffect(() => {
    if (sessionLoading) return;
    void load(tab);
  }, [tab, load, sessionLoading]);

  const filtered = useMemo(() => {
    const needle = term.trim().toLowerCase();
    return entries.filter(({ article }) => {
      if (category && article.category !== category) return false;
      if (!needle) return true;
      return (
        article.title.toLowerCase().includes(needle) ||
        article.summary.toLowerCase().includes(needle) ||
        article.keywords.some((k) => k.toLowerCase().includes(needle))
      );
    });
  }, [entries, term, category]);

  const grouped = useMemo(() => {
    const map = new globalThis.Map<string, Entry[]>();
    for (const entry of filtered) {
      const key = dayKey(entry.at);
      const list = map.get(key) ?? [];
      list.push(entry);
      map.set(key, list);
    }
    return [...map.entries()];
  }, [filtered]);

  const usedCategories = useMemo(() => {
    const present = new Set(entries.map((e) => e.article.category));
    return NEWS_CATEGORIES.filter((c) => present.has(c.id));
  }, [entries]);

  return (
    <main className="pad-nav min-h-dvh">
      <PageHeader title="アーカイブ" />

      <div className="sticky top-[calc(52px+env(safe-area-inset-top,0px))] z-40 glass border-b border-line px-4 py-2.5">
        <div className="flex rounded-2xl border border-line bg-ink-800 p-1">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`relative flex flex-1 items-center justify-center gap-1.5 rounded-xl px-2 py-2 text-[12.5px] font-bold transition-colors ${
                tab === id ? "text-[#08130d]" : "text-fg-muted"
              }`}
            >
              {tab === id && (
                <motion.span
                  layoutId="archive-tab"
                  transition={{ type: "spring", stiffness: 420, damping: 34 }}
                  className="absolute inset-0 rounded-xl bg-[#4ef5a3]"
                />
              )}
              <span className="relative flex items-center gap-1.5">
                <Icon size={13} />
                {label}
              </span>
            </button>
          ))}
        </div>

        <div className="mt-2.5 flex items-center gap-2 rounded-2xl border border-line bg-ink-800 px-3">
          <Search size={15} className="shrink-0 text-fg-faint" />
          <input
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="アーカイブ内を検索"
            className="w-full bg-transparent py-2.5 text-[13.5px] text-fg outline-none placeholder:text-fg-faint"
          />
        </div>

        {usedCategories.length > 0 && (
          <div className="no-scrollbar -mx-4 mt-2.5 flex gap-1.5 overflow-x-auto px-4">
            <button
              type="button"
              onClick={() => setCategory(null)}
              className={`shrink-0 rounded-full border px-3 py-1.5 text-[11.5px] font-bold ${
                category === null
                  ? "border-[#4ef5a3]/55 bg-[#4ef5a3]/12 text-[#4ef5a3]"
                  : "border-line text-fg-muted"
              }`}
            >
              すべて
            </button>
            {usedCategories.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setCategory(category === c.id ? null : c.id)}
                className={`shrink-0 rounded-full border px-3 py-1.5 text-[11.5px] font-bold ${
                  category === c.id
                    ? "border-[#4ef5a3]/55 bg-[#4ef5a3]/12 text-[#4ef5a3]"
                    : "border-line text-fg-muted"
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="px-4 pt-3.5">
        {!sessionLoading && !user ? (
          <EmptyState
            icon={<Bookmark size={26} />}
            title="ログインするとアーカイブが使えます"
            description="保存・閲覧履歴・投票の記録はアカウントごとに保存されます。"
            action={
              <Link
                href="/login?next=/archive"
                className="grad-cta rounded-full px-5 py-2.5 text-[13px] font-black text-[#07121a]"
              >
                ログイン / 新規登録
              </Link>
            }
          />
        ) : status === "loading" || sessionLoading ? (
          <RowSkeleton count={5} />
        ) : status === "error" ? (
          <ErrorState onRetry={() => void load(tab)} />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<Bookmark size={26} />}
            title={
              entries.length > 0 ? "条件に合うニュースがありません" : EMPTY_COPY[tab].title
            }
            description={
              entries.length > 0
                ? "検索語やカテゴリを変えてみてください。"
                : EMPTY_COPY[tab].description
            }
          />
        ) : (
          <div className="space-y-5">
            {grouped.map(([day, list]) => (
              <section key={day}>
                <h2 className="mb-2 px-0.5 text-[11.5px] font-bold text-fg-faint">{day}</h2>
                <div className="space-y-2">
                  {list.map(({ article, at }) => (
                    <NewsRow
                      key={`${article.id}-${at}`}
                      article={article}
                      meta={`${
                        tab === "saved" ? "保存" : tab === "history" ? "閲覧" : "投票"
                      }: ${relativeTime(at)} ・ ${article.source_name}`}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
