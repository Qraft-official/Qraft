"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, ExternalLink, Info, MessageCircle, Sparkles, Zap } from "lucide-react";
import { useEffect } from "react";
import { BreakingTag, CategoryTag, HeatMeter, SourceTrustTag } from "./Badges";
import NewsThumb from "./NewsThumb";
import SaveButton from "./SaveButton";
import ShareButton from "./ShareButton";
import QuizCard from "@/components/quiz/QuizCard";
import { useSession } from "@/hooks/use-session";
import { SOURCE_TRUST } from "@/lib/categories";
import { clockTime, relativeTime } from "@/lib/format";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase/client";
import type { NewsWithQuiz } from "@/types/database";

function Paragraphs({ text }: { text: string }) {
  return (
    <>
      {text
        .split("\n")
        .filter((line) => line.trim().length > 0)
        .map((line, i) => (
          <p key={i} className="text-[14px] leading-[1.85] text-fg/90">
            {line}
          </p>
        ))}
    </>
  );
}

function Section({
  step,
  title,
  accent,
  icon,
  children,
}: {
  step: string;
  title: string;
  accent: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="card px-4 py-4">
      <header className="mb-2.5 flex items-center gap-2">
        <span
          className="grid h-6 w-6 place-items-center rounded-lg text-[11px] font-black"
          style={{ color: accent, background: `${accent}1f` }}
        >
          {icon ?? step}
        </span>
        <h3 className="text-[14px] font-bold tracking-tight">{title}</h3>
      </header>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

export default function NewsDetail({
  article,
  related,
}: {
  article: NewsWithQuiz;
  related: NewsWithQuiz[];
}) {
  const { user } = useSession();
  const trust = SOURCE_TRUST[article.source_type] ?? SOURCE_TRUST.unconfirmed;
  const isExternalSource = /^https?:\/\//.test(article.source_url);

  useEffect(() => {
    if (!user || !isSupabaseConfigured) return;
    void getSupabase()
      .from("news_views")
      .upsert(
        { user_id: user.id, news_id: article.id, viewed_at: new Date().toISOString() },
        { onConflict: "user_id,news_id" },
      );
  }, [user, article.id]);

  return (
    <div className="pad-nav">
      <div className="relative">
        <NewsThumb
          src={article.image_url}
          alt={article.title}
          category={article.category}
          className="h-[232px] w-full"
          priority
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/55 via-transparent to-ink-900" />
        <div className="absolute inset-x-0 top-0 flex items-center justify-between p-2 pad-safe-top">
          <Link
            href="/"
            aria-label="戻る"
            className="glass grid h-9 w-9 place-items-center rounded-full border border-line text-fg"
          >
            <ArrowLeft size={17} />
          </Link>
          <div className="glass flex items-center rounded-full border border-line px-0.5">
            <SaveButton newsId={article.id} />
            <ShareButton
              title={article.title}
              path={`/news/${article.id}`}
              text={article.three_second_summary}
            />
          </div>
        </div>
      </div>

      <div className="-mt-8 space-y-3 px-4">
        <header className="space-y-2.5">
          <div className="flex flex-wrap items-center gap-1.5">
            {article.is_breaking && <BreakingTag />}
            <CategoryTag category={article.category} />
            <SourceTrustTag type={article.source_type} />
          </div>
          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="text-[21px] font-black leading-[1.36] tracking-tight text-fg"
          >
            {article.title}
          </motion.h1>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <span className="text-[11.5px] text-fg-faint">
              {relativeTime(article.published_at)}（{clockTime(article.published_at)}公開）
            </span>
            <HeatMeter heat={article.heat} />
          </div>
        </header>

        {article.is_sample && (
          <Link
            href="/about"
            className="flex items-center gap-2 rounded-2xl border border-[#ffc44d]/35 bg-[#ffc44d]/[0.08] px-3.5 py-2.5 text-[11.5px] leading-relaxed text-[#ffc44d]"
          >
            <Info size={13} className="shrink-0" />
            <span className="flex-1">
              これは動作確認用の架空サンプルニュースです。実在の出来事とは関係ありません。
            </span>
            <ExternalLink size={12} className="shrink-0 opacity-70" />
          </Link>
        )}

        <Section step="1" title="何が起きた？" accent="#4ef5a3">
          <Paragraphs text={article.what_happened} />
        </Section>

        <Section step="2" title="なんで話題？" accent="#35dcff">
          <Paragraphs text={article.why_trending} />
        </Section>

        <section className="relative overflow-hidden rounded-[20px] border border-[#4ef5a3]/28 bg-[linear-gradient(103deg,rgba(78,245,163,0.12),rgba(53,220,255,0.09))] px-4 py-4">
          <div className="mb-2 flex items-center gap-2">
            <Zap size={15} className="text-[#4ef5a3]" strokeWidth={2.6} />
            <h3 className="text-[13px] font-black tracking-wide text-[#4ef5a3]">3秒で理解</h3>
          </div>
          <p className="text-[16px] font-bold leading-[1.62] text-fg">
            {article.three_second_summary}
          </p>
        </section>

        {article.quiz && <QuizCard quiz={article.quiz} />}

        {article.social_reaction_summary && (
          <Section
            step="5"
            title="みんなの反応"
            accent="#a98bff"
            icon={<MessageCircle size={13} strokeWidth={2.6} />}
          >
            <Paragraphs text={article.social_reaction_summary} />
            <p className="pt-1 text-[10.5px] leading-relaxed text-fg-faint">
              SNS上の傾向をAIが要約したものです。個別の投稿を転載していません。
            </p>
          </Section>
        )}

        <section className="card px-4 py-4">
          <header className="mb-2.5 flex items-center gap-2">
            <span className="grid h-6 w-6 place-items-center rounded-lg bg-white/8 text-[11px] font-black text-fg-muted">
              6
            </span>
            <h3 className="text-[14px] font-bold tracking-tight">情報源</h3>
          </header>
          <div className="rounded-2xl border border-line bg-ink-700 px-3.5 py-3">
            <p className="text-[14px] font-bold text-fg">{article.source_name}</p>
            <p className="mt-1 text-[11.5px] leading-relaxed text-fg-muted">{trust.help}</p>
          </div>
          <Link
            href={article.source_url}
            target={isExternalSource ? "_blank" : undefined}
            rel={isExternalSource ? "noopener noreferrer" : undefined}
            className="mt-2.5 flex items-center justify-center gap-1.5 rounded-2xl border border-line-strong px-4 py-3 text-[13.5px] font-bold text-fg active:bg-white/10"
          >
            情報源を見る
            <ExternalLink size={14} />
          </Link>
          <p className="mt-2.5 flex items-start gap-1.5 text-[10.5px] leading-relaxed text-fg-faint">
            <Info size={12} className="mt-[2px] shrink-0" />
            「何が起きた？」「なんで話題？」「3秒で理解」「みんなの反応」はAIによる要約・解説です。元記事の本文は掲載していません。内容の正確性は情報源で必ず確認してください。
          </p>
        </section>

        {related.length > 0 && (
          <section className="pt-1">
            <h3 className="mb-2.5 flex items-center gap-1.5 px-0.5 text-[13px] font-bold text-fg-muted">
              <Sparkles size={13} />
              関連するニュース
            </h3>
            <div className="space-y-2">
              {related.map((item) => (
                <Link
                  key={item.id}
                  href={`/news/${item.id}`}
                  className="card flex items-center gap-3 p-2.5 active:bg-ink-700"
                >
                  <NewsThumb
                    src={item.image_url}
                    alt={item.title}
                    category={item.category}
                    className="h-[58px] w-[58px] shrink-0 rounded-xl"
                    sizes="58px"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="line-clamp-2 block text-[13px] font-semibold leading-snug text-fg">
                      {item.title}
                    </span>
                    <span className="mt-1 block text-[10.5px] text-fg-faint">
                      {relativeTime(item.published_at)} ・ {item.source_name}
                    </span>
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
