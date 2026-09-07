"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, X } from "lucide-react";
import { BreakingTag, CategoryTag } from "./Badges";
import NewsThumb from "./NewsThumb";
import SaveButton from "./SaveButton";
import ShareButton from "./ShareButton";
import QuizCard from "@/components/quiz/QuizCard";
import { EmptyState } from "@/components/ui/States";
import { relativeTime } from "@/lib/format";
import type { NewsWithQuiz } from "@/types/database";

/** Keeps swipe cards short: only the first few lines of each section. */
function condense(text: string, maxLines: number): string {
  return text
    .split("\n")
    .filter((line) => line.trim().length > 0)
    .slice(0, maxLines)
    .join(" ");
}

function Slide({ article, index }: { article: NewsWithQuiz; index: number }) {
  return (
    <section className="relative h-dvh w-full shrink-0 snap-start snap-always overflow-hidden">
      <NewsThumb
        src={article.image_url}
        alt={article.title}
        category={article.category}
        className="absolute inset-0 h-full w-full"
        priority={index < 2}
      />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(8,12,20,0.86)_0%,rgba(8,12,20,0.55)_26%,rgba(8,12,20,0.94)_62%,#080c14_100%)]" />

      <div className="no-scrollbar relative flex h-full flex-col overflow-y-auto overscroll-contain px-5 pb-[calc(env(safe-area-inset-bottom,0px)+22px)] pt-[calc(env(safe-area-inset-top,0px)+62px)]">
        <div className="mt-auto">
          <div className="flex flex-wrap items-center gap-1.5">
            {article.is_breaking && <BreakingTag />}
            <CategoryTag category={article.category} />
            <span className="text-[10.5px] text-fg-faint">
              {relativeTime(article.published_at)} ・ {article.source_name}
            </span>
          </div>

          <h2 className="mt-2.5 text-[23px] font-black leading-[1.34] tracking-tight text-fg">
            {article.title}
          </h2>

          <div className="mt-3.5 space-y-2.5">
            <div className="rounded-2xl border border-line bg-ink-800/85 px-3.5 py-3 backdrop-blur-sm">
              <p className="mb-1 text-[10.5px] font-black tracking-wide text-[#4ef5a3]">
                何が起きた？
              </p>
              <p className="line-clamp-3 text-[13px] leading-relaxed text-fg/90">
                {condense(article.what_happened, 2)}
              </p>
            </div>
            <div className="rounded-2xl border border-line bg-ink-800/85 px-3.5 py-3 backdrop-blur-sm">
              <p className="mb-1 text-[10.5px] font-black tracking-wide text-[#35dcff]">
                なんで話題？
              </p>
              <p className="line-clamp-3 text-[13px] leading-relaxed text-fg/90">
                {condense(article.why_trending, 2)}
              </p>
            </div>
            <div className="rounded-2xl border border-[#4ef5a3]/28 bg-[linear-gradient(103deg,rgba(78,245,163,0.16),rgba(53,220,255,0.12))] px-3.5 py-3">
              <p className="mb-1 text-[10.5px] font-black tracking-wide text-[#4ef5a3]">
                3秒で理解
              </p>
              <p className="text-[15px] font-bold leading-[1.55] text-fg">
                {article.three_second_summary}
              </p>
            </div>
          </div>

          {article.quiz && (
            <div className="mt-3">
              <QuizCard quiz={article.quiz} />
            </div>
          )}

          <div className="mt-3 flex items-center gap-1">
            <SaveButton newsId={article.id} withLabel />
            <ShareButton
              title={article.title}
              path={`/news/${article.id}`}
              text={article.three_second_summary}
              withLabel
            />
            <Link
              href={`/news/${article.id}`}
              className="ml-auto rounded-full border border-line-strong px-3.5 py-2 text-[12px] font-bold text-fg active:bg-white/10"
            >
              くわしく読む
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function DopaMode({ articles }: { articles: NewsWithQuiz[] }) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const node = scrollerRef.current;
    if (!node) return;
    const onScroll = () => {
      setIndex(Math.round(node.scrollTop / node.clientHeight));
    };
    node.addEventListener("scroll", onScroll, { passive: true });
    return () => node.removeEventListener("scroll", onScroll);
  }, []);

  if (articles.length === 0) {
    return (
      <div className="grid min-h-dvh place-items-center px-6">
        <EmptyState
          title="表示できるニュースがありません"
          description="しばらくしてからもう一度お試しください。"
          action={
            <Link
              href="/"
              className="rounded-full border border-line-strong px-4 py-2 text-[13px] font-bold text-fg"
            >
              トップへ戻る
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 mx-auto w-full max-w-[var(--app-max-width)] bg-ink-900">
      <div className="pointer-events-none absolute inset-x-0 top-0 z-30 flex items-center justify-between px-3 pt-2 pad-safe-top">
        <span className="glass pointer-events-auto rounded-full border border-line px-3 py-1.5 text-[11.5px] font-bold text-fg-muted">
          ドパモード {index + 1}/{articles.length}
        </span>
        <Link
          href="/"
          aria-label="ドパモードを終了"
          className="glass pointer-events-auto grid h-9 w-9 place-items-center rounded-full border border-line text-fg-muted"
        >
          <X size={17} />
        </Link>
      </div>

      <div
        ref={scrollerRef}
        className="no-scrollbar h-full snap-y snap-mandatory overflow-y-auto overscroll-y-contain"
      >
        {articles.map((article, i) => (
          <Slide key={article.id} article={article} index={i} />
        ))}
      </div>

      {index === 0 && articles.length > 1 && (
        <div className="pointer-events-none absolute inset-x-0 bottom-6 z-30 flex flex-col items-center gap-1 text-fg-faint">
          <ChevronDown size={20} className="animate-bounce" />
          <span className="text-[11px] font-semibold">上にスワイプで次のニュース</span>
        </div>
      )}
    </div>
  );
}
