"use client";

import { Search, TrendingUp, X } from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import NewsRow from "@/components/news/NewsRow";
import { PageHeader } from "@/components/navigation/TopBar";
import { EmptyState, ErrorState, RowSkeleton } from "@/components/ui/States";
import { searchNews } from "@/lib/news-queries";
import {
  clearRecentSearches,
  getRecentSearches,
  getServerRecentSearches,
  rememberSearch,
  subscribeRecentSearches,
} from "@/lib/recent-searches";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase/client";
import type { NewsWithQuiz } from "@/types/database";

const DEBOUNCE_MS = 260;

export default function SearchScreen() {
  const [term, setTerm] = useState("");
  const [results, setResults] = useState<NewsWithQuiz[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [popular, setPopular] = useState<string[]>([]);
  const [submitted, setSubmitted] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const recent = useSyncExternalStore(
    subscribeRecentSearches,
    getRecentSearches,
    getServerRecentSearches,
  );

  // Popular terms are derived from the keywords of recently published stories.
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    void getSupabase()
      .from("news_articles")
      .select("keywords")
      .eq("is_published", true)
      .order("heat", { ascending: false })
      .limit(40)
      .then(({ data }) => {
        const counts = new globalThis.Map<string, number>();
        for (const row of (data ?? []) as { keywords: string[] | null }[]) {
          for (const keyword of row.keywords ?? []) {
            counts.set(keyword, (counts.get(keyword) ?? 0) + 1);
          }
        }
        setPopular(
          [...counts.entries()]
            .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
            .slice(0, 10)
            .map(([keyword]) => keyword),
        );
      });
  }, []);

  const run = useCallback(async (value: string) => {
    const cleaned = value.trim();
    setSubmitted(cleaned);
    if (!cleaned || !isSupabaseConfigured) {
      setResults([]);
      setStatus("idle");
      return;
    }
    setStatus("loading");
    try {
      setResults(await searchNews(getSupabase(), cleaned));
      setStatus("idle");
    } catch {
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    const handle = setTimeout(() => void run(term), DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [term, run]);

  const remember = useCallback((value: string) => {
    rememberSearch(value);
  }, []);

  const suggestions = useMemo(() => {
    const needle = term.trim().toLowerCase();
    if (!needle) return [];
    const pool = new Set<string>();
    for (const article of results) {
      for (const keyword of article.keywords) {
        if (keyword.toLowerCase().includes(needle)) pool.add(keyword);
      }
    }
    for (const keyword of popular) {
      if (keyword.toLowerCase().includes(needle)) pool.add(keyword);
    }
    return [...pool].filter((k) => k !== term.trim()).slice(0, 6);
  }, [term, results, popular]);

  const showDiscovery = term.trim().length === 0;

  return (
    <main className="pad-nav min-h-dvh">
      <PageHeader title="検索" backHref="/" />

      <div className="px-4 pt-3.5">
        <div className="flex items-center gap-2 rounded-2xl border border-line bg-ink-800 px-3.5 focus-within:border-[#4ef5a3]/45">
          <Search size={16} className="shrink-0 text-fg-faint" />
          <input
            ref={inputRef}
            value={term}
            autoFocus
            enterKeyHint="search"
            onChange={(e) => setTerm(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                remember(term);
                inputRef.current?.blur();
              }
            }}
            placeholder="タイトル・人物・企業・キーワード"
            className="w-full bg-transparent py-3 text-[14.5px] text-fg outline-none placeholder:text-fg-faint"
          />
          {term && (
            <button
              type="button"
              onClick={() => setTerm("")}
              aria-label="入力をクリア"
              className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-fg-faint active:bg-white/10"
            >
              <X size={15} />
            </button>
          )}
        </div>

        {suggestions.length > 0 && (
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {suggestions.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => {
                  setTerm(suggestion);
                  remember(suggestion);
                }}
                className="rounded-full border border-line bg-ink-800 px-3 py-1.5 text-[12px] font-semibold text-fg-muted active:bg-ink-700"
              >
                {suggestion}
              </button>
            ))}
          </div>
        )}

        <div className="mt-4">
          {showDiscovery ? (
            <div className="space-y-5">
              {recent.length > 0 && (
                <section>
                  <div className="mb-2 flex items-center justify-between px-0.5">
                    <h2 className="text-[12px] font-bold text-fg-muted">最近の検索</h2>
                    <button
                      type="button"
                      onClick={clearRecentSearches}
                      className="text-[11.5px] font-semibold text-fg-faint active:text-fg"
                    >
                      履歴を消す
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {recent.map((item) => (
                      <button
                        key={item}
                        type="button"
                        onClick={() => setTerm(item)}
                        className="rounded-full border border-line bg-ink-800 px-3 py-1.5 text-[12.5px] font-semibold text-fg-muted active:bg-ink-700"
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                </section>
              )}

              <section>
                <h2 className="mb-2 flex items-center gap-1.5 px-0.5 text-[12px] font-bold text-fg-muted">
                  <TrendingUp size={13} className="text-[#4ef5a3]" />
                  人気の検索ワード
                </h2>
                {popular.length === 0 ? (
                  <RowSkeleton count={2} />
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {popular.map((keyword, i) => (
                      <button
                        key={keyword}
                        type="button"
                        onClick={() => {
                          setTerm(keyword);
                          remember(keyword);
                        }}
                        className="inline-flex items-center gap-1.5 rounded-full border border-line bg-ink-800 px-3 py-1.5 text-[12.5px] font-semibold text-fg active:bg-ink-700"
                      >
                        <span className="text-[10.5px] font-black text-[#4ef5a3]">
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        {keyword}
                      </button>
                    ))}
                  </div>
                )}
              </section>
            </div>
          ) : status === "loading" ? (
            <RowSkeleton count={4} />
          ) : status === "error" ? (
            <ErrorState onRetry={() => void run(term)} />
          ) : results.length === 0 ? (
            <EmptyState
              icon={<Search size={26} />}
              title={`「${submitted}」に一致するニュースはありません`}
              description="別のキーワードを試すか、カテゴリから探してみてください。"
            />
          ) : (
            <div className="space-y-2">
              <p className="px-0.5 text-[11.5px] text-fg-faint">{results.length}件見つかりました</p>
              {results.map((article) => (
                <NewsRow key={article.id} article={article} />
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
